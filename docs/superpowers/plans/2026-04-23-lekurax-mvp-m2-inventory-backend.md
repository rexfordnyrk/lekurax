# M2 (Backend) — Inventory (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement product master + branch stock (batch + expiry) + adjustments with audit, permissions, tenant isolation, and branch enforcement.

**Architecture:** Inventory is branch-scoped for stock operations and tenant-scoped for product master. Every mutation is audited in `lekurax_audit_logs`. Every handler requires AuthzKit JWT auth + branch context (where applicable) and permission checks.

**Tech Stack:** Go (Gin, GORM, Postgres, Goose)

---

## Task 1: Add inventory DB schema

**Files:**
- Create: `migrations/0002_inventory.sql`

- [ ] **Step 1: Create migration**

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

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0002_inventory.sql
git commit -m "feat(lekurax-api): add inventory schema (products, stock batches, adjustments)"
```

---

## Task 2: Product master CRUD (tenant-scoped)

**Files:**
- Create: `internal/inventory/domain/product.go`
- Create: `internal/inventory/app/product_service.go`
- Create: `internal/inventory/infra/product_repo.go`
- Create: `internal/inventory/http/product_handler.go`
- Modify: `internal/server/server.go`
- Test: `internal/inventory/app/product_service_test.go`

- [ ] **Step 1: Write failing unit test**

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

type stubRepo struct{}

func (stubRepo) Create(_ domain.Product) error { return nil }

func TestCreateProduct_RequiresName(t *testing.T) {
	svc := app.NewProductService(stubRepo{})
	_, err := svc.Create(uuid.New(), domain.CreateProductInput{Name: ""})
	require.Error(t, err)
}
```

- [ ] **Step 2: Implement service + repo**

Implement:
- `ProductService.Create(tenantID, input)` (validate name)
- repo `Create(p)` stores to `products`
- handlers:
  - `POST /api/v1/products` (perm `inventory.products.create`)
  - `GET /api/v1/products` (perm `inventory.products.list`)
  - `GET /api/v1/products/:id` (perm `inventory.products.view`)
  - `PATCH /api/v1/products/:id` (perm `inventory.products.update`)

Audit:
- `product.created`, `product.updated`

- [ ] **Step 3: Wire routes + run tests**

```bash
cd /home/ignis/GolandProjects/pharmaco
go test ./... -v
```

- [ ] **Step 4: Commit**

```bash
git add internal/inventory internal/server
git commit -m "feat(lekurax-api): add product master CRUD with perms and audit"
```

---

## Task 3: Stock batches + adjustments (branch-scoped)

**Files:**
- Create: `internal/inventory/domain/stock.go`
- Create: `internal/inventory/app/stock_service.go`
- Create: `internal/inventory/infra/stock_repo.go`
- Create: `internal/inventory/http/stock_handler.go`
- Modify: `internal/server/server.go`
- Test: `internal/inventory/app/stock_service_test.go`

- [ ] **Step 1: Write failing tests**

Tests must cover:
- receive increases qty
- adjust decreases qty but cannot go below zero

- [ ] **Step 2: Implement routes**

Routes (all under `/api/v1/branches/:branch_id/...`):
- `POST /stock/receive` (perm `inventory.stock.receive`, audit `stock.received`)
- `POST /stock/adjust` (perm `inventory.stock.adjust`, audit `stock.adjusted`)
- `GET /stock` (perm `inventory.stock.view`)
- `GET /stock/near-expiry?days=30` (perm `inventory.stock.view`)

All must:
- require branch context
- use tenant_id from principal
- write `lekurax_audit_logs` including branch_id

- [ ] **Step 3: Run tests + commit**

```bash
go test ./... -v
git add internal/inventory
git commit -m "feat(lekurax-api): implement branch stock receive/adjust/view"
```

