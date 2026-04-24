package app

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	DefaultTimeout = 3 * time.Second
	signatureHdr   = "X-Lekurax-Signature"
)

type Dispatcher struct {
	db      *gorm.DB
	client  *http.Client
	timeout time.Duration
}

func NewDispatcher(db *gorm.DB) *Dispatcher {
	return &Dispatcher{
		db:      db,
		client:  &http.Client{},
		timeout: DefaultTimeout,
	}
}

func (d *Dispatcher) WithHTTPClient(c *http.Client) *Dispatcher {
	if c != nil {
		d.client = c
	}
	return d
}

func (d *Dispatcher) WithTimeout(t time.Duration) *Dispatcher {
	if t > 0 {
		d.timeout = t
	}
	return d
}

type Webhook struct {
	ID       uuid.UUID `gorm:"type:uuid;primaryKey"`
	TenantID uuid.UUID `gorm:"type:uuid;not null;index"`
	URL      string    `gorm:"type:text;not null"`
	Secret   string    `gorm:"type:text;not null"`
	Enabled  bool      `gorm:"not null;default:true"`
}

func (Webhook) TableName() string { return "webhooks" }

type WebhookEvent struct {
	TenantID  uuid.UUID `gorm:"type:uuid;not null;index"`
	WebhookID uuid.UUID `gorm:"type:uuid;not null;index"`
	EventKey  string    `gorm:"type:text;not null"`
}

func (WebhookEvent) TableName() string { return "webhook_events" }

type EventPayload struct {
	EventKey   string    `json:"event_key"`
	OccurredAt time.Time `json:"occurred_at"`
	TenantID   uuid.UUID `json:"tenant_id"`
	Data       any       `json:"data"`
}

// Dispatch best-effort delivers the webhook event asynchronously.
// It never returns an error: dispatch failures must not block core flows.
func (d *Dispatcher) Dispatch(ctx context.Context, tenantID uuid.UUID, eventKey string, occurredAt time.Time, data any) {
	if d == nil || d.db == nil || tenantID == uuid.Nil || eventKey == "" {
		return
	}
	if occurredAt.IsZero() {
		occurredAt = time.Now().UTC()
	}

	hooks := d.loadSubscribedWebhooks(ctx, tenantID, eventKey)
	if len(hooks) == 0 {
		return
	}

	payload := EventPayload{
		EventKey:   eventKey,
		OccurredAt: occurredAt.UTC(),
		TenantID:   tenantID,
		Data:       data,
	}
	body, err := json.Marshal(payload)
	if err != nil || len(body) == 0 {
		return
	}

	for _, hook := range hooks {
		h := hook
		go d.postJSON(context.Background(), h.URL, body, h.Secret)
	}
}

func (d *Dispatcher) loadSubscribedWebhooks(ctx context.Context, tenantID uuid.UUID, eventKey string) []Webhook {
	if d.db == nil {
		return nil
	}

	hooks := d.loadEnabledWebhooks(ctx, tenantID)
	if len(hooks) == 0 {
		return nil
	}

	ids := make([]uuid.UUID, 0, len(hooks))
	for _, h := range hooks {
		ids = append(ids, h.ID)
	}
	events := d.loadWebhookEvents(ctx, tenantID, ids)
	return filterWebhooksByEventKey(hooks, events, eventKey)
}

func (d *Dispatcher) loadEnabledWebhooks(ctx context.Context, tenantID uuid.UUID) []Webhook {
	var hooks []Webhook
	_ = d.db.WithContext(ctx).
		Where("tenant_id = ? AND enabled = ?", tenantID, true).
		Find(&hooks).Error
	if hooks == nil {
		return nil
	}
	return hooks
}

func (d *Dispatcher) loadWebhookEvents(ctx context.Context, tenantID uuid.UUID, webhookIDs []uuid.UUID) []WebhookEvent {
	if len(webhookIDs) == 0 {
		return nil
	}
	var rows []WebhookEvent
	_ = d.db.WithContext(ctx).
		Where("tenant_id = ? AND webhook_id IN ?", tenantID, webhookIDs).
		Find(&rows).Error
	if rows == nil {
		return nil
	}
	return rows
}

func filterWebhooksByEventKey(hooks []Webhook, events []WebhookEvent, eventKey string) []Webhook {
	if len(hooks) == 0 || len(events) == 0 || eventKey == "" {
		return nil
	}
	subscribed := map[uuid.UUID]struct{}{}
	for _, e := range events {
		if e.EventKey == eventKey {
			subscribed[e.WebhookID] = struct{}{}
		}
	}
	if len(subscribed) == 0 {
		return nil
	}
	out := make([]Webhook, 0, len(hooks))
	for _, h := range hooks {
		if _, ok := subscribed[h.ID]; ok {
			out = append(out, h)
		}
	}
	return out
}

func (d *Dispatcher) postJSON(ctx context.Context, url string, body []byte, secret string) {
	if d.client == nil || url == "" {
		return
	}

	timeout := d.timeout
	if timeout <= 0 {
		timeout = DefaultTimeout
	}

	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(signatureHdr, "sha256="+ComputeSignatureSHA256(secret, body))

	resp, err := d.client.Do(req)
	if err != nil {
		return
	}
	_ = resp.Body.Close()
}

func ComputeSignatureSHA256(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

