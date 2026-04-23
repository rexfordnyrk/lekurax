# M6 (Backend) — POS (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record OTC and prescription-linked sales with backend totals and audit.

**Architecture:** POS is branch-scoped. Backend computes totals using the pricing quote logic (M3) and persists totals on the sale record. If linked to a prescription, enforce same tenant+branch and status rules.

**Tech Stack:** Go, Postgres, Goose

---

## Task 1: Schema

**Files:**
- Create: `migrations/0006_pos.sql`

- [ ] **Step 1: Create migration**

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
  status text NOT NULL DEFAULT 'paid',
  actor_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

## Task 2: Sales endpoints

**Files:**
- Create: `internal/pos/app/sale_service.go`
- Create: `internal/pos/http/sale_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Routes:
- `POST /api/v1/branches/:branch_id/sales` (perm `pos.sales.create`, audit `sale.created`)
- `GET /api/v1/branches/:branch_id/sales` (perm `pos.sales.list`)
- `GET /api/v1/branches/:branch_id/sales/:id` (perm `pos.sales.view`)

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

Implementation requirements:
- quote totals using M3 cart pricer
- persist unit prices per line from `product_prices`

- [ ] **Step 2: Enforce prescription-linked rule**

If `prescription_id` set:
- rx must exist in same tenant+branch
- rx must be `dispensed` (MVP rule)

- [ ] **Step 3: Tests + commit**

```bash
go test ./... -v
git add internal/pos internal/server
git commit -m "feat(lekurax-api): add POS sale create/list endpoints"
```

