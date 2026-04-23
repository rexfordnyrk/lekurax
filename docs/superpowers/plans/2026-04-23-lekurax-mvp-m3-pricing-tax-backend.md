# M3 (Backend) — Pricing & Tax (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store base product pricing + tax rules and expose a backend quote endpoint used by POS to compute totals.

**Architecture:** Pricing is tenant-scoped; quote computation is deterministic and the backend is the source of truth for totals. POS uses quote logic internally.

**Tech Stack:** Go, Postgres, Goose

---

## Task 1: Add pricing + tax schema

**Files:**
- Create: `migrations/0003_pricing_tax.sql`

- [ ] **Step 1: Create migration**

Create `migrations/0003_pricing_tax.sql`:

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS product_prices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD',
  unit_price_cents bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_price_per_tenant
  ON product_prices (tenant_id, product_id);

CREATE TABLE IF NOT EXISTS tax_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  rate_bps integer NOT NULL,
  applies_to_prescription boolean NOT NULL DEFAULT false,
  applies_to_otc boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tax_rules_tenant ON tax_rules (tenant_id);

-- +goose Down
DROP TABLE IF EXISTS tax_rules;
DROP TABLE IF EXISTS product_prices;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0003_pricing_tax.sql
git commit -m "feat(lekurax-api): add pricing and tax schema"
```

---

## Task 2: Product price endpoint

**Files:**
- Create: `internal/pricing/app/price_service.go`
- Create: `internal/pricing/infra/price_repo.go`
- Create: `internal/pricing/http/price_handler.go`
- Modify: `internal/server/server.go`
- Test: `internal/pricing/app/price_service_test.go`

- [ ] **Step 1: Implement route**

Route:
- `PUT /api/v1/products/:id/price`

Request:

```json
{ "currency": "USD", "unit_price_cents": 1299 }
```

Permission:
- `pricing.price.set`

Audit:
- `price.set`

- [ ] **Step 2: Tests + commit**

```bash
go test ./... -v
git add internal/pricing internal/server
git commit -m "feat(lekurax-api): add product price endpoint"
```

---

## Task 3: Quote endpoint (subtotal/tax/total)

**Files:**
- Create: `internal/pricing/app/cart_pricer.go`
- Create: `internal/pricing/http/quote_handler.go`
- Modify: `internal/server/server.go`
- Test: `internal/pricing/app/cart_pricer_test.go`

- [ ] **Step 1: Implement route**

Route:
- `POST /api/v1/pricing/quote`

Request:

```json
{ "lines": [ { "product_id": "...", "quantity": 2, "is_rx": false } ] }
```

Response:

```json
{ "subtotal_cents": 2598, "tax_cents": 195, "total_cents": 2793 }
```

Permission:
- `pricing.quote`

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/pricing
git commit -m "feat(lekurax-api): add backend pricing quote endpoint"
```

