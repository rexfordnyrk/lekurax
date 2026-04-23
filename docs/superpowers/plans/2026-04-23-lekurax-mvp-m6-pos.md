# M6 — POS (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support OTC sales and prescription-linked checkout with backend-generated totals and auditable receipts.

**Architecture:** POS is branch-scoped. A sale records line items, totals (subtotal/tax/total), and optionally links to a prescription. Frontend uses backend quote endpoint (M3) and then submits the sale.

**Tech Stack:** Go (Gin, GORM, Postgres, Goose), `frontend/web-ui`

---

## Task 1: POS schema

**Files:**
- Create: `migrations/0006_pos.sql`

- [ ] **Step 1: Create migration**

Create `migrations/0006_pos.sql`:

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,

  prescription_id uuid NULL REFERENCES prescriptions(id) ON DELETE SET NULL,
  patient_id uuid NULL REFERENCES patients(id) ON DELETE SET NULL,

  currency text NOT NULL DEFAULT 'USD',
  subtotal_cents bigint NOT NULL,
  tax_cents bigint NOT NULL,
  total_cents bigint NOT NULL,

  status text NOT NULL DEFAULT 'paid', -- paid|voided|refunded (post-MVP)
  actor_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_branch_created
  ON sales (tenant_id, branch_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sale_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity bigint NOT NULL,
  unit_price_cents bigint NOT NULL,
  line_total_cents bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_lines_tenant_sale ON sale_lines (tenant_id, sale_id);

-- +goose Down
DROP TABLE IF EXISTS sale_lines;
DROP TABLE IF EXISTS sales;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0006_pos.sql
git commit -m "feat(lekurax-api): add POS schema (sales, sale lines)"
```

---

## Task 2: Sales API (create + list)

**Files:**
- Create: `internal/pos/domain/sale.go`
- Create: `internal/pos/app/sale_service.go`
- Create: `internal/pos/http/sale_handler.go`
- Modify: `internal/server/server.go`
- Test: `internal/pos/app/sale_service_test.go`

- [ ] **Step 1: Routes**

Routes:
- `POST /api/v1/branches/:branch_id/sales` (create)
- `GET /api/v1/branches/:branch_id/sales` (list)
- `GET /api/v1/branches/:branch_id/sales/:id` (detail)

Create request:

```json
{
  "prescription_id": null,
  "patient_id": null,
  "currency": "USD",
  "lines": [
    { "product_id": "...", "quantity": 2, "is_rx": false }
  ]
}
```

Implementation contract:
- server calls pricing quote logic (M3) internally to compute totals
- server looks up unit price per product to persist `unit_price_cents`

Permissions:
- `pos.sales.create|list|view`

Audit:
- `sale.created`

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/pos internal/server
git commit -m "feat(lekurax-api): add sales create/list endpoints with backend totals"
```

---

## Task 3: Prescription-linked checkout guard

**Files:**
- Modify: `internal/pos/app/sale_service.go`
- Test: `internal/pos/app/sale_service_test.go`

- [ ] **Step 1: Rules**

If `prescription_id` provided:
- prescription must exist in same tenant+branch
- prescription must be `dispensed` (MVP rule; paid sale after dispense)

Return 409 errors on violations.

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/pos
git commit -m "feat(lekurax-api): enforce prescription-linked sale rules"
```

---

## Task 4: Web UI — POS screen (MVP)

**Files (web-ui):**
- Create: `frontend/web-ui/src/pages/PosPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: POS page**

For MVP:
- search/select products (basic list + filter)
- build a cart with quantities
- call `POST /api/v1/pricing/quote` to show totals
- submit `POST /api/v1/branches/:branch_id/sales` to record the sale

- [ ] **Step 2: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages src/App.jsx
git commit -m "feat(web-ui): add MVP POS page with backend totals"
```

