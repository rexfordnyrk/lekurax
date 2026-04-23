# M2 — Inventory (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement product master + branch stock (batch + expiry) + adjustments with audit, tenant isolation, and branch enforcement.

**Architecture:** Inventory is branch-scoped. All tables include `tenant_id` and `branch_id`. Every handler requires auth, resolves branch context, enforces membership (non-admin), checks permissions, and writes audit logs for mutations.

**Tech Stack:** Go (Gin, GORM, Postgres, Goose), `frontend/web-ui`

---

## Task 1: Add inventory DB schema

**Files:**
- Create: `migrations/0002_inventory.sql`
- Modify: `cmd/lekurax-migrate/main.go` (already exists from foundation plan)

- [ ] **Step 1: Write failing migration test (optional)**

For MVP, verify migrations apply cleanly by running migrate command in CI later. Skip dedicated migration tests.

- [ ] **Step 2: Create migration**

Create `migrations/0002_inventory.sql`:

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,

  name text NOT NULL,
  generic_name text NULL,
  manufacturer text NULL,
  sku text NULL,
  barcode text NULL,

  is_prescription boolean NOT NULL DEFAULT false,
  is_controlled boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_tenant_name ON products (tenant_id, name);

CREATE TABLE IF NOT EXISTS stock_batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,

  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  batch_no text NOT NULL,
  expires_on date NULL,

  quantity_on_hand bigint NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_batch_per_branch
  ON stock_batches (tenant_id, branch_id, product_id, batch_no);

CREATE INDEX IF NOT EXISTS idx_stock_batches_tenant_branch_product
  ON stock_batches (tenant_id, branch_id, product_id);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,

  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  stock_batch_id uuid NULL REFERENCES stock_batches(id) ON DELETE SET NULL,

  delta bigint NOT NULL,
  reason_code text NOT NULL,
  note text NULL,

  actor_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_tenant_branch_created
  ON stock_adjustments (tenant_id, branch_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS stock_adjustments;
DROP TABLE IF EXISTS stock_batches;
DROP TABLE IF EXISTS products;
```

- [ ] **Step 3: Apply migrations**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
```

Expected: migrations apply successfully.

- [ ] **Step 4: Commit**

```bash
git add migrations/0002_inventory.sql
git commit -m "feat(lekurax-api): add inventory schema (products, stock batches, adjustments)"
```

---

## Task 2: Implement product CRUD (branch-agnostic, tenant-scoped)

**Files:**
- Create: `internal/inventory/domain/product.go`
- Create: `internal/inventory/app/product_service.go`
- Create: `internal/inventory/infra/product_repo.go`
- Create: `internal/inventory/http/product_handler.go`
- Modify: `internal/server/server.go`
- Test: `internal/inventory/app/product_service_test.go`

- [ ] **Step 1: Write failing service test**

Create `internal/inventory/app/product_service_test.go`:

```go
package app_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"lekurax/internal/inventory/app"
	"lekurax/internal/inventory/domain"
)

type memRepo struct {
	items map[uuid.UUID]domain.Product
}

func (m *memRepo) Create(_ domain.Product) error { return nil }

func TestCreateProduct_RequiresName(t *testing.T) {
	svc := app.NewProductService(nil)
	_, err := svc.Create(uuid.New(), domain.CreateProductInput{Name: ""})
	require.Error(t, err)
}
```

- [ ] **Step 2: Implement domain + service**

Create `internal/inventory/domain/product.go`:

```go
package domain

import (
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID             uuid.UUID
	TenantID       uuid.UUID
	Name           string
	GenericName    *string
	Manufacturer   *string
	SKU            *string
	Barcode        *string
	IsPrescription bool
	IsControlled   bool
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type CreateProductInput struct {
	Name           string
	GenericName    *string
	Manufacturer   *string
	SKU            *string
	Barcode        *string
	IsPrescription bool
	IsControlled   bool
}
```

Create `internal/inventory/app/product_service.go`:

```go
package app

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"lekurax/internal/inventory/domain"
)

type ProductRepository interface {
	Create(p domain.Product) error
}

type ProductService struct{ repo ProductRepository }

func NewProductService(repo ProductRepository) *ProductService { return &ProductService{repo: repo} }

func (s *ProductService) Create(tenantID uuid.UUID, in domain.CreateProductInput) (*domain.Product, error) {
	if strings.TrimSpace(in.Name) == "" {
		return nil, fmt.Errorf("name required")
	}
	now := time.Now()
	p := domain.Product{
		ID:             uuid.New(),
		TenantID:       tenantID,
		Name:           strings.TrimSpace(in.Name),
		GenericName:    in.GenericName,
		Manufacturer:   in.Manufacturer,
		SKU:            in.SKU,
		Barcode:        in.Barcode,
		IsPrescription: in.IsPrescription,
		IsControlled:   in.IsControlled,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if err := s.repo.Create(p); err != nil {
		return nil, err
	}
	return &p, nil
}
```

- [ ] **Step 3: Implement repo + handler**

Create `internal/inventory/infra/product_repo.go`:

```go
package infra

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"lekurax/internal/inventory/domain"
)

type productModel struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID `gorm:"type:uuid;not null;index"`
	Name           string    `gorm:"not null"`
	GenericName    *string
	Manufacturer   *string
	SKU            *string
	Barcode        *string
	IsPrescription bool      `gorm:"not null"`
	IsControlled   bool      `gorm:"not null"`
}

func (productModel) TableName() string { return "products" }

type ProductRepo struct{ db *gorm.DB }

func NewProductRepo(db *gorm.DB) *ProductRepo { return &ProductRepo{db: db} }

func (r *ProductRepo) Create(p domain.Product) error {
	return r.db.Create(&productModel{
		ID:             p.ID,
		TenantID:       p.TenantID,
		Name:           p.Name,
		GenericName:    p.GenericName,
		Manufacturer:   p.Manufacturer,
		SKU:            p.SKU,
		Barcode:        p.Barcode,
		IsPrescription: p.IsPrescription,
		IsControlled:   p.IsControlled,
	}).Error
}
```

Create `internal/inventory/http/product_handler.go`:

```go
package http

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/inventory/app"
	"lekurax/internal/inventory/domain"
	"lekurax/internal/rbac"
)

type ProductHandler struct {
	svc   *app.ProductService
	audit *audit.Writer
}

func NewProductHandler(svc *app.ProductService, auditWriter *audit.Writer) *ProductHandler {
	return &ProductHandler{svc: svc, audit: auditWriter}
}

type createProductReq struct {
	Name           string  `json:"name"`
	GenericName    *string `json:"generic_name"`
	Manufacturer   *string `json:"manufacturer"`
	SKU            *string `json:"sku"`
	Barcode        *string `json:"barcode"`
	IsPrescription bool    `json:"is_prescription"`
	IsControlled   bool    `json:"is_controlled"`
}

func (h *ProductHandler) Register(r gin.IRoutes) {
	r.POST("/products", rbac.RequirePermission("inventory.products.create"), h.Create)
}

func (h *ProductHandler) Create(c *gin.Context) {
	p := auth.GetPrincipal(c)
	var req createProductReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	out, err := h.svc.Create(p.TenantID, domain.CreateProductInput{
		Name:           req.Name,
		GenericName:    req.GenericName,
		Manufacturer:   req.Manufacturer,
		SKU:            req.SKU,
		Barcode:        req.Barcode,
		IsPrescription: req.IsPrescription,
		IsControlled:   req.IsControlled,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	entityType := "product"
	_ = h.audit.Write(c.Request.Context(), audit.Entry{
		TenantID:    p.TenantID,
		BranchID:    nil,
		ActorUserID: &p.UserID,
		Action:      "product.created",
		EntityType:  &entityType,
		EntityID:    &out.ID,
		Metadata:    []byte(`{}`),
	})

	c.JSON(http.StatusCreated, gin.H{"id": out.ID.String(), "name": out.Name})
}

func parseUUIDParam(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return uuid.Nil, false
	}
	return id, true
}
```

Then add list/view/update endpoints in the same file (copy the pattern used by `Create`).
Do not proceed until each endpoint has:
- a permission gate (`rbac.RequirePermission(...)`)
- tenant scoping in every DB query
- an audit entry for mutations (`product.updated`)

- [ ] **Step 4: Wire routes**

Modify `internal/server/server.go` to mount inventory routes under `/api/v1`:

```go
v1 := r.Group("/api/v1")
v1.Use(auth.RequireAuth(verifier))

invProducts := inventoryhttp.NewProductHandler(productSvc, auditWriter)
invProducts.Register(v1)
```

- [ ] **Step 5: Run tests + build**

```bash
cd /home/ignis/GolandProjects/pharmaco
go test ./... -v
```

- [ ] **Step 6: Commit**

```bash
git add internal/inventory internal/server
git commit -m "feat(lekurax-api): add product master CRUD (tenant-scoped) with perms and audit"
```

---

## Task 3: Implement stock batches + adjustments (branch-scoped)

**Files:**
- Create: `internal/inventory/domain/stock.go`
- Create: `internal/inventory/app/stock_service.go`
- Create: `internal/inventory/http/stock_handler.go`
- Add migration indexes if needed
- Tests: `internal/inventory/app/stock_service_test.go`

- [ ] **Step 1: Write failing tests**

Cover:
- receiving stock increases `quantity_on_hand`
- adjustment writes an adjustment record and updates batch qty
- cannot adjust below zero

- [ ] **Step 2: Implement services**

Routes:
- `POST /api/v1/branches/:branch_id/stock/receive` (create or increment batch)
- `POST /api/v1/branches/:branch_id/stock/adjust` (delta + reason)
- `GET /api/v1/branches/:branch_id/stock` (list by product)
- `GET /api/v1/branches/:branch_id/stock/near-expiry?days=30`

Permissions:
- `inventory.stock.receive`
- `inventory.stock.adjust`
- `inventory.stock.view`

Audit:
- `stock.received`
- `stock.adjusted`

- [ ] **Step 3: Run tests**

```bash
go test ./... -v
```

- [ ] **Step 4: Commit**

```bash
git add internal/inventory
git commit -m "feat(lekurax-api): implement branch stock batches and adjustments"
```

---

## Task 4: Web UI — minimal inventory screens

**Files (web-ui):**
- Create: `frontend/web-ui/src/pages/ProductsPage.jsx`
- Create: `frontend/web-ui/src/pages/StockPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Products page**

Use `lekuraxFetch("/api/v1/products")` to list/create products.

- [ ] **Step 2: Stock page**

Use branch path endpoints:
- `/api/v1/branches/${branchId}/stock`
- `/api/v1/branches/${branchId}/stock/receive`
- `/api/v1/branches/${branchId}/stock/adjust`

- [ ] **Step 3: Wire routes**

Add:
- `/inventory/products`
- `/inventory/stock`

- [ ] **Step 4: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages src/App.jsx
git commit -m "feat(web-ui): add MVP inventory pages (products and stock)"
```

