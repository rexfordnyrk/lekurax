# M3 — Pricing & Tax (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add base pricing and tax rules sufficient to compute POS totals consistently on the backend, with frontend displaying backend-calculated totals.

**Architecture:** Pricing is tenant-scoped; POS calculations are branch-scoped by active branch context. Frontend never “re-invents” tax math; it calls backend to price a cart.

**Tech Stack:** Go (Gin, GORM, Postgres, Goose), `frontend/web-ui`

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
  rate_bps integer NOT NULL, -- basis points; 750 = 7.50%
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

## Task 2: Pricing endpoints (set price per product)

**Files:**
- Create: `internal/pricing/domain/price.go`
- Create: `internal/pricing/app/price_service.go`
- Create: `internal/pricing/http/price_handler.go`
- Modify: `internal/server/server.go`
- Test: `internal/pricing/app/price_service_test.go`

- [ ] **Step 1: Failing test**

Create `internal/pricing/app/price_service_test.go`:

```go
package app_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"lekurax/internal/pricing/app"
)

func TestSetPrice_RejectsNegative(t *testing.T) {
	svc := app.NewPriceService(nil)
	err := svc.SetPrice(uuid.New(), uuid.New(), "USD", -1)
	require.Error(t, err)
}
```

- [ ] **Step 2: Implement service**

Create `internal/pricing/app/price_service.go`:

```go
package app

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
)

type PriceRepository interface {
	Upsert(tenantID, productID uuid.UUID, currency string, unitPriceCents int64) error
}

type PriceService struct{ repo PriceRepository }

func NewPriceService(repo PriceRepository) *PriceService { return &PriceService{repo: repo} }

func (s *PriceService) SetPrice(tenantID, productID uuid.UUID, currency string, unitPriceCents int64) error {
	if unitPriceCents < 0 {
		return fmt.Errorf("unit_price_cents must be >= 0")
	}
	if strings.TrimSpace(currency) == "" {
		return fmt.Errorf("currency required")
	}
	return s.repo.Upsert(tenantID, productID, strings.ToUpper(strings.TrimSpace(currency)), unitPriceCents)
}
```

- [ ] **Step 3: Handler**

Create `internal/pricing/http/price_handler.go` with route:
- `PUT /api/v1/products/:id/price`

Required permission:
- `pricing.price.set`

Audit:
- `price.set`

Request:

```json
{ "currency": "USD", "unit_price_cents": 1299 }
```

Response:

```json
{ "product_id": "...", "currency": "USD", "unit_price_cents": 1299 }
```

- [ ] **Step 4: Wire + commit**

```bash
go test ./... -v
git add internal/pricing internal/server
git commit -m "feat(lekurax-api): add product pricing endpoint"
```

---

## Task 3: Cart pricing endpoint (backend is source of truth)

**Files:**
- Create: `internal/pricing/app/cart_pricer.go`
- Create: `internal/pricing/http/cart_handler.go`
- Test: `internal/pricing/app/cart_pricer_test.go`

- [ ] **Step 1: Implement pricer**

Create `internal/pricing/app/cart_pricer.go`:

```go
package app

import "github.com/google/uuid"

type CartLine struct {
	ProductID uuid.UUID
	Quantity  int64
	IsRx      bool
}

type CartTotals struct {
	SubtotalCents int64
	TaxCents      int64
	TotalCents    int64
}

type PriceReader interface {
	GetUnitPriceCents(tenantID, productID uuid.UUID) (int64, error)
}

type TaxRuleReader interface {
	GetEffectiveRateBps(tenantID uuid.UUID, hasRx, hasOtc bool) (int, error)
}

type CartPricer struct {
	prices PriceReader
	taxes  TaxRuleReader
}

func NewCartPricer(prices PriceReader, taxes TaxRuleReader) *CartPricer {
	return &CartPricer{prices: prices, taxes: taxes}
}

func (p *CartPricer) Price(tenantID uuid.UUID, lines []CartLine) (CartTotals, error) {
	var subtotal int64
	hasRx := false
	hasOtc := false
	for _, ln := range lines {
		if ln.Quantity <= 0 {
			continue
		}
		if ln.IsRx {
			hasRx = true
		} else {
			hasOtc = true
		}
		unit, err := p.prices.GetUnitPriceCents(tenantID, ln.ProductID)
		if err != nil {
			return CartTotals{}, err
		}
		subtotal += unit * ln.Quantity
	}
	rateBps, err := p.taxes.GetEffectiveRateBps(tenantID, hasRx, hasOtc)
	if err != nil {
		return CartTotals{}, err
	}
	tax := subtotal * int64(rateBps) / 10000
	return CartTotals{SubtotalCents: subtotal, TaxCents: tax, TotalCents: subtotal + tax}, nil
}
```

- [ ] **Step 2: Handler**

Create `internal/pricing/http/cart_handler.go`:
- `POST /api/v1/pricing/quote`

Permission:
- `pricing.quote`

Body:

```json
{ "lines": [ { "product_id": "...", "quantity": 2, "is_rx": false } ] }
```

Response:

```json
{ "subtotal_cents": 2598, "tax_cents": 195, "total_cents": 2793 }
```

- [ ] **Step 3: Commit**

```bash
go test ./... -v
git add internal/pricing
git commit -m "feat(lekurax-api): add backend cart pricing quote endpoint"
```

---

## Task 4: Web UI — show backend totals in checkout

**Files (web-ui):**
- Modify: `frontend/web-ui/src/pages/PricingPage.jsx` (repurpose or add new)
- Create: `frontend/web-ui/src/pages/CartQuoteDemoPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Add demo page**

Create a simple page that:
- picks a few product IDs
- calls `POST /api/v1/pricing/quote`
- displays subtotal/tax/total

- [ ] **Step 2: Commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages src/App.jsx
git commit -m "feat(web-ui): display backend pricing quote totals"
```

