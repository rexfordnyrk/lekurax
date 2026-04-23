# E8 (Backend) — Integrations & Interop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an integration framework: outbound webhooks, inbound callbacks, and connector configuration per tenant.

**Architecture:** Start with webhooks for key events (sale.created, rx.dispensed, claim.submitted) and a per-tenant signing secret. Expand to specific connectors (payments, accounting, FHIR/HL7) incrementally.

---

## Task 1: Schema (webhooks)

**Files:**
- Create: `migrations/0013_integrations.sql`

- [ ] **Step 1: Create migration**

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS webhooks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS webhook_events;
DROP TABLE IF EXISTS webhooks;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0013_integrations.sql
git commit -m "feat(lekurax-api): add integrations schema (webhooks)"
```

---

## Task 2: Webhook management endpoints

**Files:**
- Create: `internal/integrations/http/webhooks_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Routes:
- `POST /api/v1/integrations/webhooks` (perm `integrations.webhooks.manage`)
- `GET /api/v1/integrations/webhooks` (perm `integrations.webhooks.view`)
- `POST /api/v1/integrations/webhooks/:id/events` (perm `integrations.webhooks.manage`)

Audit:
- `webhook.created`, `webhook.updated`

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/integrations internal/server
git commit -m "feat(lekurax-api): add webhook management endpoints"
```

---

## Task 3: Emit webhook events

**Files:**
- Modify: `internal/pos/app/sale_service.go`
- Modify: `internal/prescriptions/app/dispense_service.go`
- Modify: `internal/claims/app/claim_service.go` (E1)
- Create: `internal/integrations/app/dispatcher.go`

- [ ] **Step 1: Implement dispatcher**

Dispatcher:
- loads enabled webhooks for tenant
- filters by subscribed event_key
- sends JSON payload with HMAC signature header `X-Lekurax-Signature: sha256=...`

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/integrations internal/pos internal/prescriptions internal/claims
git commit -m "feat(lekurax-api): dispatch outbound webhooks for key events"
```

