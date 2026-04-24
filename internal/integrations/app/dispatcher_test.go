package app

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestComputeSignatureSHA256_Deterministic(t *testing.T) {
	secret := "topsecret"
	body := []byte(`{"hello":"world"}`)

	s1 := ComputeSignatureSHA256(secret, body)
	s2 := ComputeSignatureSHA256(secret, body)
	if s1 == "" {
		t.Fatalf("expected signature, got empty")
	}
	if s1 != s2 {
		t.Fatalf("expected deterministic signature; got %q vs %q", s1, s2)
	}

	changed := ComputeSignatureSHA256(secret, []byte(`{"hello":"WORLD"}`))
	if changed == s1 {
		t.Fatalf("expected signature to change when body changes")
	}
}

func TestEventPayload_MarshalShape(t *testing.T) {
	now := time.Date(2026, 4, 24, 17, 0, 0, 0, time.UTC)
	tid := uuid.New()

	p := EventPayload{
		EventKey:   "sale.created",
		OccurredAt: now,
		TenantID:   tid,
		Data: map[string]any{
			"sale_id":      uuid.New().String(),
			"branch_id":    uuid.New().String(),
			"total_cents":  int64(1234),
			"currency":     "USD",
			"extra_ignored": "ok",
		},
	}

	raw, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded["event_key"] != "sale.created" {
		t.Fatalf("event_key mismatch: %#v", decoded["event_key"])
	}
	if decoded["tenant_id"] != tid.String() {
		t.Fatalf("tenant_id mismatch: %#v", decoded["tenant_id"])
	}
	if decoded["occurred_at"] == nil || decoded["data"] == nil {
		t.Fatalf("expected occurred_at and data fields present")
	}
}

func TestFilterWebhooksByEventKey(t *testing.T) {
	tid := uuid.New()
	h1 := Webhook{ID: uuid.New(), TenantID: tid, URL: "https://example.com/1", Secret: "a", Enabled: true}
	h2 := Webhook{ID: uuid.New(), TenantID: tid, URL: "https://example.com/2", Secret: "b", Enabled: true}
	hooks := []Webhook{h1, h2}

	events := []WebhookEvent{
		{TenantID: tid, WebhookID: h1.ID, EventKey: "sale.created"},
		{TenantID: tid, WebhookID: h1.ID, EventKey: "rx.dispensed"},
		{TenantID: tid, WebhookID: h2.ID, EventKey: "rx.dispensed"},
	}

	out := filterWebhooksByEventKey(hooks, events, "sale.created")
	if len(out) != 1 || out[0].ID != h1.ID {
		t.Fatalf("expected only hook1 for sale.created, got %#v", out)
	}

	out2 := filterWebhooksByEventKey(hooks, events, "claim.submitted")
	if len(out2) != 0 {
		t.Fatalf("expected none for claim.submitted, got %#v", out2)
	}
}

