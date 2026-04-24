package http

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/rbac"
)

const (
	maxWebhookEventKeys = 50
)

var allowedWebhookEventKeys = map[string]struct{}{
	"sale.created":    {},
	"rx.dispensed":    {},
	"claim.submitted": {},
}

type WebhooksHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterWebhookRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &WebhooksHandler{db: db, audit: auditWriter, authz: authzClient}

	v1.POST("/integrations/webhooks",
		auth.RequireAuth(verifier),
		rbac.RequirePermission("integrations.webhooks.manage"),
		h.upsertWebhook,
	)
	v1.GET("/integrations/webhooks",
		auth.RequireAuth(verifier),
		rbac.RequirePermission("integrations.webhooks.view"),
		h.listWebhooks,
	)
	v1.POST("/integrations/webhooks/:id/events",
		auth.RequireAuth(verifier),
		rbac.RequirePermission("integrations.webhooks.manage"),
		h.replaceWebhookEvents,
	)
}

type Webhook struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	URL       string    `json:"url" gorm:"type:text;not null"`
	Secret    string    `json:"secret" gorm:"type:text;not null"`
	Enabled   bool      `json:"enabled" gorm:"not null;default:true"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (Webhook) TableName() string { return "webhooks" }

type WebhookEvent struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	WebhookID uuid.UUID `json:"webhook_id" gorm:"type:uuid;not null;index"`
	EventKey  string    `json:"event_key" gorm:"type:text;not null"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (WebhookEvent) TableName() string { return "webhook_events" }

type upsertWebhookBody struct {
	URL     string  `json:"url"`
	Secret  *string `json:"secret"`
	Enabled *bool   `json:"enabled"`
}

func (h *WebhooksHandler) upsertWebhook(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	var body upsertWebhookBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	u, ok := normalizeAndValidateWebhookURL(body.URL)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_URL"})
		return
	}

	secret := ""
	if body.Secret != nil && strings.TrimSpace(*body.Secret) != "" {
		secret = strings.TrimSpace(*body.Secret)
	} else if generated, err := generateWebhookSecret(32); err == nil {
		secret = generated
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "SECRET_GENERATION_FAILED"})
		return
	}

	tenantID := tenantID(c)
	now := time.Now().UTC()
	enabled := true
	if body.Enabled != nil {
		enabled = *body.Enabled
	}

	var out Webhook
	var auditAction string
	if err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		var existing Webhook
		err := tx.Where("tenant_id = ?", tenantID).Order("created_at DESC").First(&existing).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return err
		}

		if err == nil {
			existing.URL = u
			existing.Enabled = enabled
			existing.Secret = secret
			if saveErr := tx.Save(&existing).Error; saveErr != nil {
				return saveErr
			}
			out = existing
			auditAction = "webhook.updated"
			return nil
		}

		row := Webhook{
			ID:        uuid.New(),
			TenantID:  tenantID,
			URL:       u,
			Secret:    secret,
			Enabled:   enabled,
			CreatedAt: now,
		}
		if createErr := tx.Create(&row).Error; createErr != nil {
			return createErr
		}
		out = row
		auditAction = "webhook.created"
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAudit(c, h.audit, auditAction, "webhook", &out.ID, map[string]any{
		"url":     out.URL,
		"enabled": out.Enabled,
	})

	status := http.StatusOK
	if auditAction == "webhook.created" {
		status = http.StatusCreated
	}
	c.JSON(status, out)
}

type listWebhookItem struct {
	Webhook
	Events []string `json:"events"`
}

func (h *WebhooksHandler) listWebhooks(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	var hooks []Webhook
	if err := h.db.WithContext(c.Request.Context()).
		Where("tenant_id = ?", tenantID(c)).
		Order("created_at DESC").
		Find(&hooks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if hooks == nil {
		hooks = []Webhook{}
	}

	ids := make([]uuid.UUID, 0, len(hooks))
	for _, w := range hooks {
		ids = append(ids, w.ID)
	}

	eventsByWebhook := map[uuid.UUID][]string{}
	if len(ids) > 0 {
		var rows []WebhookEvent
		if err := h.db.WithContext(c.Request.Context()).
			Where("tenant_id = ? AND webhook_id IN ?", tenantID(c), ids).
			Order("created_at ASC").
			Find(&rows).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
			return
		}
		for _, e := range rows {
			eventsByWebhook[e.WebhookID] = append(eventsByWebhook[e.WebhookID], e.EventKey)
		}
	}

	items := make([]listWebhookItem, 0, len(hooks))
	for _, w := range hooks {
		items = append(items, listWebhookItem{
			Webhook: w,
			Events:  eventsByWebhook[w.ID],
		})
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

type replaceWebhookEventsBody struct {
	EventKeys []string `json:"event_keys"`
}

func (h *WebhooksHandler) replaceWebhookEvents(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	webhookID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_WEBHOOK_ID"})
		return
	}

	var body replaceWebhookEventsBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	clean, ok := validateAndNormalizeEventKeys(body.EventKeys)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_EVENT_KEYS"})
		return
	}

	tenantID := tenantID(c)
	now := time.Now().UTC()

	notFound := false
	if err := h.db.WithContext(c.Request.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("tenant_id = ? AND id = ?", tenantID, webhookID).First(&Webhook{}).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				notFound = true
				return nil
			}
			return err
		}

		if err := tx.Where("tenant_id = ? AND webhook_id = ?", tenantID, webhookID).Delete(&WebhookEvent{}).Error; err != nil {
			return err
		}

		if len(clean) > 0 {
			rows := make([]WebhookEvent, 0, len(clean))
			for _, k := range clean {
				rows = append(rows, WebhookEvent{
					ID:        uuid.New(),
					TenantID:  tenantID,
					WebhookID: webhookID,
					EventKey:  k,
					CreatedAt: now,
				})
			}
			if err := tx.Create(&rows).Error; err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if notFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	logAudit(c, h.audit, "webhook.updated", "webhook", &webhookID, map[string]any{
		"event_keys": clean,
	})
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func normalizeAndValidateWebhookURL(raw string) (string, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", false
	}

	parsed, err := url.Parse(raw)
	if err != nil {
		return "", false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", false
	}
	if parsed.Host == "" {
		return "", false
	}
	if parsed.User != nil {
		return "", false
	}

	parsed.Fragment = ""
	return parsed.String(), true
}

func generateWebhookSecret(nBytes int) (string, error) {
	if nBytes < 32 {
		nBytes = 32
	}
	buf := make([]byte, nBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(buf), nil
}

func validateAndNormalizeEventKeys(in []string) ([]string, bool) {
	if len(in) > maxWebhookEventKeys {
		return nil, false
	}

	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, raw := range in {
		k := strings.TrimSpace(raw)
		if k == "" || len(k) > 64 {
			return nil, false
		}
		if _, ok := allowedWebhookEventKeys[k]; !ok {
			return nil, false
		}
		if _, dup := seen[k]; dup {
			continue
		}
		seen[k] = struct{}{}
		out = append(out, k)
	}
	return out, true
}

func tenantID(c *gin.Context) uuid.UUID {
	return auth.GetPrincipal(c).TenantID
}

func logAudit(c *gin.Context, w *audit.Writer, action, entityType string, entityID *uuid.UUID, metadata map[string]any) {
	if w == nil {
		return
	}
	pr := auth.GetPrincipal(c)
	if pr == nil {
		return
	}
	raw, _ := json.Marshal(metadata)
	_ = w.Write(c.Request.Context(), audit.Entry{
		TenantID:    pr.TenantID,
		ActorUserID: &pr.UserID,
		Action:      action,
		EntityType:  &entityType,
		EntityID:    entityID,
		Metadata:    raw,
	})
}
