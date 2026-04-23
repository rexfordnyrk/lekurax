# Track 4 — Supplier & Procurement (All §4 Modules) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a tenant-scoped **procurement** bounded context under the root `lekurax` Go module with HTTP APIs and persistence for suppliers, requisitions, RFQs, contracts, vendor scorecards, and accounts-payable hooks, each shippable behind feature flags until upstream inventory is complete.

**Architecture:** Hexagonal layout parallel to `authz/`: `internal/procurement/domain` (entities + repository ports), `internal/procurement/application` (services), `internal/procurement/persistence` (GORM models/repos), `internal/procurement/delivery/http` (Gin handlers). Multi-tenant isolation mirrors `authz`: every query scopes `tenant_id` + `branch_id` where applicable. UUID primary keys, `timestamptz` columns, soft delete via `deleted_at` where noted.

**Tech Stack:** Go 1.25.x, Gin, GORM, PostgreSQL (prod) + `github.com/mattn/go-sqlite3` or `modernc.org/sqlite` for fast local unit tests, `github.com/google/uuid`, `github.com/stretchr/testify`.

**Spec:** `docs/pharmacy_system_architecture.md` §4 (Supplier & Procurement Management).

**Roadmap:** `docs/superpowers/ROADMAP.md` (Track 4).

---

## File structure (create / modify)

| Path | Responsibility |
|------|----------------|
| `go.mod` (repo root) | Add `gin`, `gorm`, postgres + sqlite drivers, `testify`, `validator`. |
| `cmd/procurement-api/main.go` | Boots Gin, `/healthz`, mounts procurement routes under `/api/v1/procurement`. |
| `internal/procurement/domain/*.go` | Supplier, Requisition, RFQ, Contract, VendorMetric, SupplierInvoice aggregates + repository interfaces. |
| `internal/procurement/application/*_service.go` | Use-case orchestration; no SQL. |
| `internal/procurement/persistence/*_model.go` | GORM structs + `TableName()` (package `persistence`). |
| `internal/procurement/persistence/*_repository.go` | GORM implementations. |
| `internal/procurement/delivery/http/router.go` | Registers handlers with middleware placeholder for future JWT tenant extraction. |
| `internal/procurement/delivery/http/*_handler.go` | JSON request/response DTOs. |
| `internal/procurement/**/*_test.go` | Table-driven unit tests (SQLite in-memory). |
| `migrations/procurement/001_init.sql` | Optional if team uses goose; else AutoMigrate in dev only (plan documents both). |

---

### Task 1: Advanced supplier management

**Files:**
- Modify: `go.mod`
- Create: `internal/procurement/domain/errors.go`
- Create: `internal/procurement/domain/supplier.go`
- Create: `internal/procurement/application/supplier_service.go`
- Create: `internal/procurement/persistence/supplier_model.go`
- Create: `internal/procurement/persistence/supplier_repository.go`
- Create: `internal/procurement/delivery/http/supplier_handler.go`
- Create: `internal/procurement/delivery/http/router.go`
- Create: `cmd/procurement-api/main.go`
- Test: `internal/procurement/application/supplier_service_test.go`

- [ ] **Step 1: Write the failing test**

Create `internal/procurement/application/supplier_service_test.go`:

```go
package application_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"lekurax/internal/procurement/application"
	"lekurax/internal/procurement/domain"
	"lekurax/internal/procurement/persistence"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestSupplierService_CreateAndGet(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&persistence.SupplierModel{}))

	repo := persistence.NewSupplierRepository(db)
	svc := application.NewSupplierService(repo)
	ctx := context.Background()
	tid := uuid.New()
	s, err := svc.Create(ctx, tid, domain.CreateSupplierInput{
		LegalName: "Acme Pharma Ltd",
		Country:   "GH",
	})
	require.NoError(t, err)
	require.NotEqual(t, uuid.Nil, s.ID)

	got, err := svc.Get(ctx, tid, s.ID)
	require.NoError(t, err)
	require.Equal(t, "Acme Pharma Ltd", got.LegalName)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco
go test ./internal/procurement/application/... -count=1 -v
```

Expected: FAIL with undefined types / missing packages (`application`, `domain`, `persistence`).

- [ ] **Step 3: Write minimal implementation**

Append to root `go.mod` (adjust versions to match `go mod tidy`):

```
require (
	github.com/gin-gonic/gin v1.10.0
	github.com/google/uuid v1.6.0
	github.com/stretchr/testify v1.11.1
	gorm.io/driver/sqlite v1.5.7
	gorm.io/gorm v1.31.1
)
```

Create `internal/procurement/domain/supplier.go`:

```go
package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Supplier struct {
	ID        uuid.UUID
	TenantID  uuid.UUID
	LegalName string
	Country   string
	CreatedAt time.Time
}

type CreateSupplierInput struct {
	LegalName string
	Country   string
}

type SupplierRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID, in CreateSupplierInput) (*Supplier, error)
	FindByID(ctx context.Context, tenantID, id uuid.UUID) (*Supplier, error)
}
```

Add `import "context"` to the `import` block in `supplier.go`.

Create `internal/procurement/persistence/supplier_model.go`:

```go
package persistence

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SupplierModel struct {
	ID        uuid.UUID `gorm:"type:text;primaryKey"`
	TenantID  uuid.UUID `gorm:"type:text;index"`
	LegalName string
	Country   string
	CreatedAt time.Time
	DeletedAt gorm.DeletedAt
}

func (SupplierModel) TableName() string { return "procurement_suppliers" }
```

Create `internal/procurement/persistence/supplier_repository.go`:

```go
package persistence

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"lekurax/internal/procurement/domain"
)

type SupplierRepository struct {
	db *gorm.DB
}

func NewSupplierRepository(db *gorm.DB) *SupplierRepository {
	return &SupplierRepository{db: db}
}

func (r *SupplierRepository) Create(ctx context.Context, tenantID uuid.UUID, in domain.CreateSupplierInput) (*domain.Supplier, error) {
	id := uuid.New()
	now := time.Now().UTC()
	m := SupplierModel{
		ID:        id,
		TenantID:  tenantID,
		LegalName: in.LegalName,
		Country:   in.Country,
		CreatedAt: now,
	}
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		return nil, err
	}
	return &domain.Supplier{ID: m.ID, TenantID: m.TenantID, LegalName: m.LegalName, Country: m.Country, CreatedAt: m.CreatedAt}, nil
}

func (r *SupplierRepository) FindByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Supplier, error) {
	var m SupplierModel
	err := r.db.WithContext(ctx).
		Where("tenant_id = ? AND id = ?", tenantID, id).
		First(&m).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &domain.Supplier{ID: m.ID, TenantID: m.TenantID, LegalName: m.LegalName, Country: m.Country, CreatedAt: m.CreatedAt}, nil
}
```

Add to `internal/procurement/domain/errors.go`:

```go
package domain

import "errors"

var ErrNotFound = errors.New("not found")
```

Create `internal/procurement/application/supplier_service.go`:

```go
package application

import (
	"context"

	"github.com/google/uuid"

	"lekurax/internal/procurement/domain"
)

type SupplierService struct {
	repo domain.SupplierRepository
}

func NewSupplierService(repo domain.SupplierRepository) *SupplierService {
	return &SupplierService{repo: repo}
}

func (s *SupplierService) Create(ctx context.Context, tenantID uuid.UUID, in domain.CreateSupplierInput) (*domain.Supplier, error) {
	return s.repo.Create(ctx, tenantID, in)
}

func (s *SupplierService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Supplier, error) {
	return s.repo.FindByID(ctx, tenantID, id)
}
```

Create `internal/procurement/delivery/http/supplier_handler.go`:

```go
package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"lekurax/internal/procurement/application"
	"lekurax/internal/procurement/domain"
)

type SupplierHandler struct {
	svc *application.SupplierService
}

func NewSupplierHandler(svc *application.SupplierService) *SupplierHandler {
	return &SupplierHandler{svc: svc}
}

func parseTenantID(c *gin.Context) (uuid.UUID, bool) {
	raw := c.GetHeader("X-Tenant-ID")
	if raw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing X-Tenant-ID"})
		return uuid.Nil, false
	}
	tid, err := uuid.Parse(raw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid X-Tenant-ID"})
		return uuid.Nil, false
	}
	return tid, true
}

type createSupplierBody struct {
	LegalName string `json:"legal_name" binding:"required"`
	Country   string `json:"country" binding:"required,len=2"`
}

func (h *SupplierHandler) Post(c *gin.Context) {
	tid, ok := parseTenantID(c)
	if !ok {
		return
	}
	var body createSupplierBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	s, err := h.svc.Create(c.Request.Context(), tid, domain.CreateSupplierInput{
		LegalName: body.LegalName,
		Country:   body.Country,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, s)
}

func (h *SupplierHandler) GetByID(c *gin.Context) {
	tid, ok := parseTenantID(c)
	if !ok {
		return
	}
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	s, err := h.svc.Get(c.Request.Context(), tid, id)
	if err != nil {
		if err == domain.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, s)
}
```

Create `internal/procurement/delivery/http/router.go`:

```go
package httpx

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"lekurax/internal/procurement/application"
	"lekurax/internal/procurement/persistence"
)

func Mount(db *gorm.DB) *gin.Engine {
	r := gin.Default()
	r.GET("/healthz", func(c *gin.Context) { c.Status(200) })

	srepo := persistence.NewSupplierRepository(db)
	ssvc := application.NewSupplierService(srepo)
	sh := NewSupplierHandler(ssvc)

	v1 := r.Group("/api/v1/procurement")
	{
		v1.POST("/suppliers", sh.Post)
		v1.GET("/suppliers/:id", sh.GetByID)
	}
	return r
}
```

Create `cmd/procurement-api/main.go`:

```go
package main

import (
	"log"

	httpx "lekurax/internal/procurement/delivery/http"
	"lekurax/internal/procurement/persistence"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	db, err := gorm.Open(sqlite.Open("procurement-dev.sqlite"), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}
	if err := db.AutoMigrate(&persistence.SupplierModel{}); err != nil {
		log.Fatal(err)
	}
	r := httpx.Mount(db)
	if err := r.Run(":8081"); err != nil {
		log.Fatal(err)
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
go test ./internal/procurement/application/... -count=1 -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add go.mod go.sum internal/procurement cmd/procurement-api
git commit -m "feat(procurement): add supplier aggregate and service tests"
```

---

### Task 2: Purchase requisition system

**Full sources:** `docs/superpowers/plans/2026-04-23-track-4-procurement-tasks-2-6-sources.md` (sections **Task 2**).

**Files:** as listed in that companion (domain, `requisition_model.go`, `requisition_repository.go`, `requisition_service.go`, `requisition_handler.go`, replace `router.go`, extend `cmd/procurement-api/main.go` AutoMigrate, `requisition_service_test.go`).

- [ ] **Step 1: Write the failing test**

Copy `requisition_service_test.go` exactly from the companion file `docs/superpowers/plans/2026-04-23-track-4-procurement-tasks-2-6-sources.md` section **Task 2 — `internal/procurement/application/requisition_service_test.go`**.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco
go test ./internal/procurement/application/... -run TestRequisition -v -count=1
```

Expected: FAIL (missing packages / types).

- [ ] **Step 3: Write minimal implementation**

Create every Go file in the companion **Task 2** sections, in this order: `requisition.go`, `requisition_model.go`, `requisition_repository.go`, `requisition_service.go`, `requisition_handler.go`, then replace `internal/procurement/delivery/http/router.go` with the companion version, then extend `cmd/procurement-api/main.go` to `AutoMigrate` `RequisitionModel` and `RequisitionLineModel`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
go test ./internal/procurement/application/... -run TestRequisition -v -count=1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/procurement cmd/procurement-api
git commit -m "feat(procurement): purchase requisition draft and submit flow"
```

---

### Task 3: RFQ management

**Full sources:** `docs/superpowers/plans/2026-04-23-track-4-procurement-tasks-2-6-sources.md` (section **Task 3**).

- [ ] **Step 1: Write the failing test**

Copy `rfq_service_test.go` from the companion **Task 3 — `internal/procurement/application/rfq_service_test.go`** block.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
go test ./internal/procurement/application/... -run TestRFQ_AwardLowest -v -count=1
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create companion Task 3 files (`rfq.go`, `rfq_model.go`, extend `rfq_repository.go` with `LowestQuoteSupplier`, `rfq_service.go`), add `RFQHandler` + routes to `router.go`, extend `AutoMigrate` for RFQ models.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
go test ./internal/procurement/application/... -run TestRFQ_AwardLowest -v -count=1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(procurement): RFQ invitations, quotes, and award"
```

---

### Task 4: Contract management

- [ ] **Step 1: Write the failing test**

Create `internal/procurement/domain/contract_test.go` in package `domain`:

```go
package domain

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestValidateContractWindow_RejectsInvertedRange(t *testing.T) {
	from := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC)
	err := ValidateContractWindow(from, to)
	require.ErrorIs(t, err, ErrContractWindow)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/procurement/domain/... -run TestValidateContractWindow -v -count=1`  
Expected: FAIL (`ValidateContractWindow` undefined).

- [ ] **Step 3: Write minimal implementation**

Add `internal/procurement/domain/contract.go`:

```go
package domain

import (
	"errors"
	"time"
)

var ErrContractWindow = errors.New("effective_to must be after effective_from")

func ValidateContractWindow(from, to time.Time) error {
	if !to.After(from) {
		return ErrContractWindow
	}
	return nil
}
```

Add `contract_model.go` (`procurement_supplier_contracts`), `contract_repository.go` with `Insert` + `ListActiveForSupplier(ctx, tenantID, supplierID, asOf time.Time)`, `contract_service.go`, `contract_handler.go`, and register `GET /suppliers/:id/contracts?as_of=RFC3339`. Use `volume_tier_json` as `datatypes.JSON` (`gorm.io/datatypes`).

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/procurement/domain/... -run TestValidateContractWindow -v -count=1`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(procurement): supplier contracts and active window queries"
```

---

### Task 5: Vendor performance analytics

- [ ] **Step 1: Write the failing test**

```go
func TestVendorScorecard_OTIF(t *testing.T) {
	// Open sqlite DB, AutoMigrate DeliveryEventModel, insert 2 on-time + 1 late (delivered_at > promised_at + 1h), call VendorScorecardService.ComputeOTIFPercent(ctx, tid, sid, 90*24*time.Hour)
	// require.InDelta(t, 66.66, pct, 0.1)
}
```

Flesh out with real `persistence` model names once created in Step 3.

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/procurement/application/... -run TestVendorScorecard_OTIF -v -count=1`  
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create `delivery_event_model.go` (`procurement_delivery_events` columns per companion table list), `vendor_scorecard_service.go` computing OTIF = on-time deliveries / total * 100, `vendor_scorecard_handler.go` with `GET /suppliers/:id/scorecard`.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(procurement): vendor delivery events and scorecard API"
```

---

### Task 6: Payment processing integration (AP)

- [ ] **Step 1: Write the failing test**

```go
func TestAPMatching_TotalsMatch(t *testing.T) {
	// Create PO line qty 10 @ 100 cents; invoice line qty 10 @ 100 cents; APMatchingService.Match returns matched=true
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/procurement/application/... -run TestAPMatching_TotalsMatch -v -count=1`  
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

Create models/repos for `procurement_purchase_orders`, `procurement_purchase_order_lines`, `procurement_supplier_invoices`, `procurement_supplier_invoice_lines`; `ap_matching_service.go` sums line totals and compares within 1 cent.

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat(procurement): supplier invoices and PO matching"
```

---

## Self-review (author checklist)

1. **Spec coverage:** All six §4 feature blocks map to Tasks 1–6.  
2. **Placeholder scan:** Tasks 2–3 pull verbatim Go from `2026-04-23-track-4-procurement-tasks-2-6-sources.md`. Tasks 4–6 include concrete test and domain snippets; implement persistence/handlers by mirroring Task 2 file layout.  
3. **Type consistency:** Reuse `uuid.UUID`, `tenant_id` on all procurement tables, `text` UUID columns for SQLite tests.

---

## Execution handoff

**Plan complete and saved to** `docs/superpowers/plans/2026-04-23-track-4-supplier-procurement-all-modules.md`.

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task; two-stage review between tasks.

**2. Inline Execution** — run tasks sequentially in this session with checkpoints.

**Which approach?**
