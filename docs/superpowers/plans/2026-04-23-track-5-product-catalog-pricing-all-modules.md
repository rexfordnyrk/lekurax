# Track 5 — Product Catalog & Pricing (All §5 Modules) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tenant-scoped **catalog** bounded context under module `lekurax` for sellable products (NDC/SKU, monograph metadata), layered **pricing** (base, branch overrides, segment rules), markups, promotions, tax rules, and versioned price lists—each increment behind tests before HTTP exposure.

**Architecture:** Mirror procurement layout: `internal/catalog/domain`, `internal/catalog/application`, `internal/catalog/persistence`, `internal/catalog/delivery/http` (package name `httpx` or `httpdelivery`—match procurement). Money fields as `int64` cents + ISO `currency` string. All tables carry `tenant_id`; branch-specific tables also carry `branch_id`.

**Tech Stack:** Go 1.25.x, Gin, GORM, SQLite in-memory for unit tests, PostgreSQL for production migrations, `github.com/google/uuid`, `github.com/stretchr/testify`.

**Spec:** `docs/pharmacy_system_architecture.md` §5.

**Roadmap:** `docs/superpowers/ROADMAP.md` (Track 5).

---

## File structure (create / modify)

| Path | Responsibility |
|------|----------------|
| `go.mod` | Reuse dependencies added for procurement; add `gorm.io/datatypes` if using JSON for monograph blobs. |
| `cmd/catalog-api/main.go` | Gin server on `:8082`, `AutoMigrate` catalog models, `GET /healthz`. |
| `internal/catalog/domain/*` | Product, PriceRule, MarkupRule, Promotion, TaxRule, PriceList aggregates + errors. |
| `internal/catalog/persistence/*_model.go` | GORM models: `catalog_products`, `catalog_price_rules`, … |
| `internal/catalog/persistence/*_repository.go` | Tenant-scoped queries. |
| `internal/catalog/application/*_service.go` | Pricing resolution: product → active price list → rules. |
| `internal/catalog/delivery/http/router.go` | `/api/v1/catalog` routes. |

---

### Task 1: Product information management

**Files:**
- Create: `internal/catalog/domain/errors.go` (`ErrNotFound`, `ErrInvalidProduct`)
- Create: `internal/catalog/domain/product.go`
- Create: `internal/catalog/persistence/product_model.go`
- Create: `internal/catalog/persistence/product_repository.go`
- Create: `internal/catalog/application/product_service.go`
- Create: `internal/catalog/delivery/http/product_handler.go`
- Create: `internal/catalog/delivery/http/router.go`
- Create: `cmd/catalog-api/main.go`
- Test: `internal/catalog/application/product_service_test.go`

- [ ] **Step 1: Write the failing test**

```go
package application_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"lekurax/internal/catalog/application"
	"lekurax/internal/catalog/domain"
	"lekurax/internal/catalog/persistence"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestProductService_CreateAndGet(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&persistence.ProductModel{}))

	repo := persistence.NewProductRepository(db)
	svc := application.NewProductService(repo)
	ctx := context.Background()
	tid := uuid.New()
	p, err := svc.Create(ctx, tid, domain.CreateProductInput{
		SKU:         "LEKU-001",
		GenericName: "Amoxicillin",
		NDC:         "00071015523",
	})
	require.NoError(t, err)
	got, err := svc.Get(ctx, tid, p.ID)
	require.NoError(t, err)
	require.Equal(t, "Amoxicillin", got.GenericName)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco
go test ./internal/catalog/application/... -count=1 -v
```

Expected: FAIL (missing packages).

- [ ] **Step 3: Write minimal implementation**

`internal/catalog/domain/product.go`:

```go
package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID          uuid.UUID
	TenantID    uuid.UUID
	SKU         string
	GenericName string
	NDC         string
	CreatedAt   time.Time
}

type CreateProductInput struct {
	SKU         string
	GenericName string
	NDC         string
}

type ProductRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID, in CreateProductInput) (*Product, error)
	FindByID(ctx context.Context, tenantID, id uuid.UUID) (*Product, error)
}
```

`internal/catalog/domain/errors.go`:

```go
package domain

import "errors"

var ErrNotFound = errors.New("not found")
var ErrInvalidProduct = errors.New("invalid product")
```

`internal/catalog/persistence/product_model.go`:

```go
package persistence

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductModel struct {
	ID          uuid.UUID `gorm:"type:text;primaryKey"`
	TenantID    uuid.UUID `gorm:"type:text;index"`
	SKU         string    `gorm:"uniqueIndex:ux_product_sku_tenant,priority:1"`
	GenericName string
	NDC         string
	CreatedAt   time.Time
	DeletedAt   gorm.DeletedAt
}

func (ProductModel) TableName() string { return "catalog_products" }
```

`internal/catalog/persistence/product_repository.go` — implement `Create` / `FindByID` with tenant scope (same pattern as `SupplierRepository` in the Track 4 plan).

`internal/catalog/application/product_service.go` — `NewProductService`, `Create` validates non-empty `SKU` and `NDC` or return `ErrInvalidProduct`.

`internal/catalog/delivery/http/product_handler.go` — `POST /products`, `GET /products/:id` with `X-Tenant-ID` header.

`internal/catalog/delivery/http/router.go` — `MountCatalog(db *gorm.DB) *gin.Engine`.

`cmd/catalog-api/main.go` — open sqlite dev file, migrate `ProductModel`, `r.Run(":8082")`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
go test ./internal/catalog/application/... -count=1 -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/catalog cmd/catalog-api go.mod go.sum
git commit -m "feat(catalog): product master create and get"
```

---

### Task 2: Pricing strategies

**Files:**
- Create: `internal/catalog/domain/price_rule.go`
- Create: `internal/catalog/persistence/price_rule_model.go`
- Create: `internal/catalog/persistence/price_rule_repository.go`
- Create: `internal/catalog/application/pricing_service.go`
- Test: `internal/catalog/application/pricing_service_test.go`

- [ ] **Step 1: Write the failing test**

```go
func TestPricingService_BasePlusBranchOverride(t *testing.T) {
	// Seed product P. Insert base rule: retail segment, amount_cents=1000 for tenant.
	// Insert branch override for branch B: amount_cents=900.
	// ResolvePrice(ctx, tid, branchB, productP, "retail") => 900
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/catalog/application/... -run TestPricingService_BasePlusBranchOverride -v -count=1`  
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Table `catalog_price_rules` columns: `tenant_id`, `product_id`, `branch_id` (nullable UUID — null means all branches), `customer_segment` (`retail|institutional|insurance|government`), `amount_cents`, `currency`, `effective_from`, `effective_to` (nullable). `pricing_service.go` picks narrowest match: branch-specific beats tenant-wide.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(catalog): segment pricing with branch overrides"
```

---

### Task 3: Markup & margin management

- [ ] **Step 1: Write the failing test**

```go
func TestMarkup_AppliesCategoryPercent(t *testing.T) {
	// Product category "antibiotic" markup_percent=15 on cost_cents=1000 -> selling_cents=1150
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/catalog/application/... -run TestMarkup_AppliesCategoryPercent -v -count=1`  
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Tables `catalog_categories`, `catalog_product_categories`, `catalog_markup_rules` (`tenant_id`, `category_id`, `percent_bps` int for basis points). Service `ApplyMarkup(costCents, productID) (sellingCents int64, err error)`.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(catalog): category markup rules"
```

---

### Task 4: Discount & promotion management

- [ ] **Step 1: Write the failing test**

```go
func TestPromotion_PercentOffCapsAt100(t *testing.T) {
	// promotion percent=20 on price 1000 -> 800; percent=150 treated as invalid -> ErrInvalidProduct or domain.ErrInvalidPromotion
}
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Add `domain.ErrInvalidPromotion`. Table `catalog_promotions` (`percent_bps` or `fixed_cents`, `starts_at`, `ends_at`). `promotion_service.go` method `ApplyPromotion(priceCents, promoID)`.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(catalog): time-bound promotions"
```

---

### Task 5: Tax configuration

- [ ] **Step 1: Write the failing test**

```go
func TestTax_SalesTaxOnOTCNotPrescription(t *testing.T) {
	// product.rx=false tax_rate_bps=750 (7.5%) on 10000 cents -> 10750
}
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Extend `ProductModel` with `Rx bool`. Table `catalog_tax_rules` (`tenant_id`, `jurisdiction_code`, `rx_exempt bool`, `rate_bps`). `tax_service.go`.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(catalog): product tax flags and jurisdiction rules"
```

---

### Task 6: Price list management

- [ ] **Step 1: Write the failing test**

```go
func TestPriceList_Versioning(t *testing.T) {
	// Create price_list v1 active until T1; v2 active from T1; resolve at T1-1s uses v1; at T1+1s uses v2
}
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Tables `catalog_price_lists` (`id`, `tenant_id`, `name`, `version`, `effective_from`), `catalog_price_list_entries` (`price_list_id`, `product_id`, `amount_cents`). `price_list_service.go` resolves latest effective version per tenant.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(catalog): versioned price lists"
```

---

## Self-review (author checklist)

1. **Spec coverage:** All six §5 bullets covered by Tasks 1–6.  
2. **Placeholder scan:** Task 1 includes complete domain/error/model outlines and explicit test; Tasks 2–6 name tables, behaviors, and test function names—implement repositories by copying Task 1 + Track 4 persistence patterns.  
3. **Type consistency:** Cents as `int64`, `currency` ISO-4217 strings, UUID keys.

---

## Execution handoff

**Plan complete and saved to** `docs/superpowers/plans/2026-04-23-track-5-product-catalog-pricing-all-modules.md`.

**1. Subagent-Driven (recommended)** — fresh subagent per task.

**2. Inline Execution** — sequential with checkpoints.

**Which approach?**
