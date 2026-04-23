# Track 4 — Tasks 2–6 (full Go sources)

Companion to `2026-04-23-track-4-supplier-procurement-all-modules.md`. Each section is paste-ready for the paths shown. Execute Task 1 from the main plan first.

---

## Task 2 — `internal/procurement/domain/requisition.go`

```go
package domain

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

var ErrRequisitionInvalid = errors.New("requisition invalid state")

type RequisitionStatus string

const (
	RequisitionDraft           RequisitionStatus = "draft"
	RequisitionPendingApproval RequisitionStatus = "pending_approval"
)

type Requisition struct {
	ID        uuid.UUID
	TenantID  uuid.UUID
	BranchID  uuid.UUID
	Status    RequisitionStatus
	CreatedAt time.Time
}

type RequisitionLine struct {
	ID            uuid.UUID
	RequisitionID uuid.UUID
	ProductSKU    string
	Qty           int64
}

type RequisitionRepository interface {
	CreateDraft(ctx context.Context, tenantID, branchID uuid.UUID) (*Requisition, error)
	AddLine(ctx context.Context, tenantID, reqID uuid.UUID, sku string, qty int64) error
	ListLines(ctx context.Context, tenantID, reqID uuid.UUID) ([]RequisitionLine, error)
	UpdateStatus(ctx context.Context, tenantID, reqID uuid.UUID, st RequisitionStatus) error
	FindByID(ctx context.Context, tenantID, reqID uuid.UUID) (*Requisition, error)
}
```

## Task 2 — `internal/procurement/persistence/requisition_model.go`

```go
package persistence

import (
	"time"

	"github.com/google/uuid"
)

type RequisitionModel struct {
	ID        uuid.UUID `gorm:"type:text;primaryKey"`
	TenantID  uuid.UUID `gorm:"type:text;index"`
	BranchID  uuid.UUID `gorm:"type:text;index"`
	Status    string
	CreatedAt time.Time
}

func (RequisitionModel) TableName() string { return "procurement_requisitions" }

type RequisitionLineModel struct {
	ID            uuid.UUID `gorm:"type:text;primaryKey"`
	RequisitionID uuid.UUID `gorm:"type:text;index"`
	ProductSKU    string
	Qty           int64
}

func (RequisitionLineModel) TableName() string { return "procurement_requisition_lines" }
```

## Task 2 — `internal/procurement/persistence/requisition_repository.go`

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

type RequisitionRepository struct {
	db *gorm.DB
}

func NewRequisitionRepository(db *gorm.DB) *RequisitionRepository {
	return &RequisitionRepository{db: db}
}

func (r *RequisitionRepository) CreateDraft(ctx context.Context, tenantID, branchID uuid.UUID) (*domain.Requisition, error) {
	id := uuid.New()
	now := time.Now().UTC()
	m := RequisitionModel{
		ID:        id,
		TenantID:  tenantID,
		BranchID:  branchID,
		Status:    string(domain.RequisitionDraft),
		CreatedAt: now,
	}
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		return nil, err
	}
	return &domain.Requisition{ID: m.ID, TenantID: m.TenantID, BranchID: m.BranchID, Status: domain.RequisitionDraft, CreatedAt: m.CreatedAt}, nil
}

func (r *RequisitionRepository) AddLine(ctx context.Context, tenantID, reqID uuid.UUID, sku string, qty int64) error {
	var head RequisitionModel
	if err := r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, reqID).First(&head).Error; err != nil {
		return err
	}
	if head.Status != string(domain.RequisitionDraft) {
		return domain.ErrRequisitionInvalid
	}
	ln := RequisitionLineModel{
		ID:            uuid.New(),
		RequisitionID: reqID,
		ProductSKU:    sku,
		Qty:           qty,
	}
	return r.db.WithContext(ctx).Create(&ln).Error
}

func (r *RequisitionRepository) ListLines(ctx context.Context, tenantID, reqID uuid.UUID) ([]domain.RequisitionLine, error) {
	var head RequisitionModel
	if err := r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, reqID).First(&head).Error; err != nil {
		return nil, err
	}
	var rows []RequisitionLineModel
	if err := r.db.WithContext(ctx).Where("requisition_id = ?", reqID).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.RequisitionLine, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.RequisitionLine{
			ID: row.ID, RequisitionID: row.RequisitionID, ProductSKU: row.ProductSKU, Qty: row.Qty,
		})
	}
	return out, nil
}

func (r *RequisitionRepository) UpdateStatus(ctx context.Context, tenantID, reqID uuid.UUID, st domain.RequisitionStatus) error {
	res := r.db.WithContext(ctx).Model(&RequisitionModel{}).
		Where("tenant_id = ? AND id = ?", tenantID, reqID).
		Update("status", string(st))
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *RequisitionRepository) FindByID(ctx context.Context, tenantID, reqID uuid.UUID) (*domain.Requisition, error) {
	var m RequisitionModel
	if err := r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, reqID).First(&m).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &domain.Requisition{
		ID: m.ID, TenantID: m.TenantID, BranchID: m.BranchID,
		Status: domain.RequisitionStatus(m.Status), CreatedAt: m.CreatedAt,
	}, nil
}
```

## Task 2 — `internal/procurement/application/requisition_service.go`

```go
package application

import (
	"context"

	"github.com/google/uuid"

	"lekurax/internal/procurement/domain"
)

type RequisitionService struct {
	repo domain.RequisitionRepository
}

func NewRequisitionService(repo domain.RequisitionRepository) *RequisitionService {
	return &RequisitionService{repo: repo}
}

func (s *RequisitionService) CreateDraft(ctx context.Context, tenantID, branchID uuid.UUID) (*domain.Requisition, error) {
	return s.repo.CreateDraft(ctx, tenantID, branchID)
}

func (s *RequisitionService) AddLine(ctx context.Context, tenantID, reqID uuid.UUID, sku string, qty int64) error {
	if qty <= 0 {
		return domain.ErrRequisitionInvalid
	}
	return s.repo.AddLine(ctx, tenantID, reqID, sku, qty)
}

func (s *RequisitionService) Submit(ctx context.Context, tenantID, reqID uuid.UUID) error {
	lines, err := s.repo.ListLines(ctx, tenantID, reqID)
	if err != nil {
		return err
	}
	if len(lines) == 0 {
		return domain.ErrRequisitionInvalid
	}
	req, err := s.repo.FindByID(ctx, tenantID, reqID)
	if err != nil {
		return err
	}
	if req.Status != domain.RequisitionDraft {
		return domain.ErrRequisitionInvalid
	}
	return s.repo.UpdateStatus(ctx, tenantID, reqID, domain.RequisitionPendingApproval)
}
```

## Task 2 — `internal/procurement/application/requisition_service_test.go`

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

func TestRequisition_SubmitRequiresLines(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&persistence.RequisitionModel{}, &persistence.RequisitionLineModel{}))

	repo := persistence.NewRequisitionRepository(db)
	svc := application.NewRequisitionService(repo)
	ctx := context.Background()
	tid := uuid.New()
	bid := uuid.New()

	rq, err := svc.CreateDraft(ctx, tid, bid)
	require.NoError(t, err)
	err = svc.Submit(ctx, tid, rq.ID)
	require.ErrorIs(t, err, domain.ErrRequisitionInvalid)

	require.NoError(t, svc.AddLine(ctx, tid, rq.ID, "SKU-1", 10))
	require.NoError(t, svc.AddLine(ctx, tid, rq.ID, "SKU-2", 3))
	require.NoError(t, svc.Submit(ctx, tid, rq.ID))

	final, err := repo.FindByID(ctx, tid, rq.ID)
	require.NoError(t, err)
	require.Equal(t, domain.RequisitionPendingApproval, final.Status)
}
```

## Task 2 — `internal/procurement/delivery/http/requisition_handler.go`

```go
package httpx

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"lekurax/internal/procurement/application"
)

type RequisitionHandler struct {
	svc *application.RequisitionService
}

func NewRequisitionHandler(svc *application.RequisitionService) *RequisitionHandler {
	return &RequisitionHandler{svc: svc}
}

type requisitionBranchBody struct {
	BranchID string `json:"branch_id" binding:"required,uuid"`
}

func (h *RequisitionHandler) PostDraft(c *gin.Context) {
	tid, ok := parseTenantID(c)
	if !ok {
		return
	}
	var body requisitionBranchBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	bid, _ := uuid.Parse(body.BranchID)
	rq, err := h.svc.CreateDraft(c.Request.Context(), tid, bid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, rq)
}

type requisitionLineBody struct {
	ProductSKU string `json:"product_sku" binding:"required"`
	Qty        int64  `json:"qty" binding:"required,gt=0"`
}

func (h *RequisitionHandler) PostLine(c *gin.Context) {
	tid, ok := parseTenantID(c)
	if !ok {
		return
	}
	rid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var body requisitionLineBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.svc.AddLine(c.Request.Context(), tid, rid, body.ProductSKU, body.Qty); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *RequisitionHandler) PostSubmit(c *gin.Context) {
	tid, ok := parseTenantID(c)
	if !ok {
		return
	}
	rid, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.svc.Submit(c.Request.Context(), tid, rid); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
```

## Task 2 — replace `internal/procurement/delivery/http/router.go` with

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

	rrepo := persistence.NewRequisitionRepository(db)
	rsvc := application.NewRequisitionService(rrepo)
	rh := NewRequisitionHandler(rsvc)

	v1 := r.Group("/api/v1/procurement")
	{
		v1.POST("/suppliers", sh.Post)
		v1.GET("/suppliers/:id", sh.GetByID)
		v1.POST("/requisitions", rh.PostDraft)
		v1.POST("/requisitions/:id/lines", rh.PostLine)
		v1.POST("/requisitions/:id/submit", rh.PostSubmit)
	}
	return r
}
```

Update `cmd/procurement-api/main.go` `AutoMigrate` to include `RequisitionModel` and `RequisitionLineModel`.

---

## Task 3 — RFQ (minimal award-lowest)

### `internal/procurement/domain/rfq.go`

```go
package domain

import (
	"context"
	"errors"

	"github.com/google/uuid"
)

var ErrRFQ = errors.New("rfq invalid")

type RFQStatus string

const (
	RFQOpen    RFQStatus = "open"
	RFQAwarded RFQStatus = "awarded"
)

type RFQ struct {
	ID       uuid.UUID
	TenantID uuid.UUID
	Status   RFQStatus
	WinnerID *uuid.UUID
}

type RFQRepository interface {
	Create(ctx context.Context, tenantID uuid.UUID) (*RFQ, error)
	AddInvitation(ctx context.Context, tenantID, rfqID, supplierID uuid.UUID) error
	UpsertQuote(ctx context.Context, tenantID, rfqID, supplierID uuid.UUID, totalCents int64, currency string) error
	LowestQuoteSupplier(ctx context.Context, tenantID, rfqID uuid.UUID) (supplierID uuid.UUID, totalCents int64, err error)
	SetWinner(ctx context.Context, tenantID, rfqID, supplierID uuid.UUID) error
	FindByID(ctx context.Context, tenantID, rfqID uuid.UUID) (*RFQ, error)
}
```

### `internal/procurement/persistence/rfq_model.go`

```go
package persistence

import "github.com/google/uuid"

type RFQModel struct {
	ID       uuid.UUID `gorm:"type:text;primaryKey"`
	TenantID uuid.UUID `gorm:"type:text;index"`
	Status   string
	WinnerID *uuid.UUID `gorm:"type:text"`
}

func (RFQModel) TableName() string { return "procurement_rfqs" }

type RFQInvitationModel struct {
	RFQID      uuid.UUID `gorm:"type:text;primaryKey"`
	SupplierID uuid.UUID `gorm:"type:text;primaryKey"`
}

func (RFQInvitationModel) TableName() string { return "procurement_rfq_invitations" }

type RFQQuoteModel struct {
	RFQID      uuid.UUID `gorm:"type:text;primaryKey"`
	SupplierID uuid.UUID `gorm:"type:text;primaryKey"`
	TotalCents int64
	Currency   string `gorm:"size:3"`
}

func (RFQQuoteModel) TableName() string { return "procurement_rfq_quotes" }
```

### `internal/procurement/persistence/rfq_repository.go`

```go
package persistence

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"lekurax/internal/procurement/domain"
)

type RFQRepository struct{ db *gorm.DB }

func NewRFQRepository(db *gorm.DB) *RFQRepository { return &RFQRepository{db: db} }

func (r *RFQRepository) Create(ctx context.Context, tenantID uuid.UUID) (*domain.RFQ, error) {
	m := RFQModel{ID: uuid.New(), TenantID: tenantID, Status: string(domain.RFQOpen)}
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		return nil, err
	}
	return &domain.RFQ{ID: m.ID, TenantID: m.TenantID, Status: domain.RFQStatus(m.Status)}, nil
}

func (r *RFQRepository) AddInvitation(ctx context.Context, tenantID, rfqID, supplierID uuid.UUID) error {
	var head RFQModel
	if err := r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, rfqID).First(&head).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Create(&RFQInvitationModel{RFQID: rfqID, SupplierID: supplierID}).Error
}

func (r *RFQRepository) LowestQuoteSupplier(ctx context.Context, tenantID, rfqID uuid.UUID) (uuid.UUID, int64, error) {
	_ = tenantID
	var q RFQQuoteModel
	err := r.db.WithContext(ctx).Where("rfq_id = ?", rfqID).Order("total_cents ASC").First(&q).Error
	if err != nil {
		return uuid.Nil, 0, err
	}
	return q.SupplierID, q.TotalCents, nil
}

func (r *RFQRepository) UpsertQuote(ctx context.Context, tenantID, rfqID, supplierID uuid.UUID, totalCents int64, currency string) error {
	var inv int64
	if err := r.db.WithContext(ctx).Model(&RFQInvitationModel{}).Where("rfq_id = ? AND supplier_id = ?", rfqID, supplierID).Count(&inv).Error; err != nil {
		return err
	}
	if inv == 0 {
		return domain.ErrRFQ
	}
	q := RFQQuoteModel{RFQID: rfqID, SupplierID: supplierID, TotalCents: totalCents, Currency: currency}
	return r.db.WithContext(ctx).Save(&q).Error
}

func (r *RFQRepository) SetWinner(ctx context.Context, tenantID, rfqID, supplierID uuid.UUID) error {
	res := r.db.WithContext(ctx).Model(&RFQModel{}).
		Where("tenant_id = ? AND id = ?", tenantID, rfqID).
		Updates(map[string]interface{}{"winner_id": supplierID, "status": string(domain.RFQAwarded)})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *RFQRepository) FindByID(ctx context.Context, tenantID, rfqID uuid.UUID) (*domain.RFQ, error) {
	var m RFQModel
	if err := r.db.WithContext(ctx).Where("tenant_id = ? AND id = ?", tenantID, rfqID).First(&m).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return &domain.RFQ{ID: m.ID, TenantID: m.TenantID, Status: domain.RFQStatus(m.Status), WinnerID: m.WinnerID}, nil
}
```

### `internal/procurement/application/rfq_service.go`

```go
package application

import (
	"context"

	"github.com/google/uuid"

	"lekurax/internal/procurement/domain"
)

type RFQService struct{ repo domain.RFQRepository }

func NewRFQService(repo domain.RFQRepository) *RFQService { return &RFQService{repo: repo} }

func (s *RFQService) AwardLowest(ctx context.Context, tenantID, rfqID uuid.UUID) error {
	sid, _, err := s.repo.LowestQuoteSupplier(ctx, tenantID, rfqID)
	if err != nil {
		return err
	}
	return s.repo.SetWinner(ctx, tenantID, rfqID, sid)
}
```

### `internal/procurement/application/rfq_service_test.go`

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

func TestRFQ_AwardLowest(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&persistence.RFQModel{}, &persistence.RFQInvitationModel{}, &persistence.RFQQuoteModel{}, &persistence.SupplierModel{}))

	tid := uuid.New()
	s1 := uuid.New()
	s2 := uuid.New()
	ctx := context.Background()
	_ = db.WithContext(ctx).Create(&persistence.SupplierModel{ID: s1, TenantID: tid, LegalName: "A", Country: "GH"}).Error
	_ = db.WithContext(ctx).Create(&persistence.SupplierModel{ID: s2, TenantID: tid, LegalName: "B", Country: "GH"}).Error

	repo := persistence.NewRFQRepository(db)
	rfq, err := repo.Create(ctx, tid)
	require.NoError(t, err)
	require.NoError(t, repo.AddInvitation(ctx, tid, rfq.ID, s1))
	require.NoError(t, repo.AddInvitation(ctx, tid, rfq.ID, s2))
	require.NoError(t, repo.UpsertQuote(ctx, tid, rfq.ID, s1, 1000, "GHS"))
	require.NoError(t, repo.UpsertQuote(ctx, tid, rfq.ID, s2, 900, "GHS"))

	svc := application.NewRFQService(repo)
	require.NoError(t, svc.AwardLowest(ctx, tid, rfq.ID))
	out, err := repo.FindByID(ctx, tid, rfq.ID)
	require.NoError(t, err)
	require.Equal(t, domain.RFQAwarded, out.Status)
	require.NotNil(t, out.WinnerID)
	require.Equal(t, s2, *out.WinnerID)
}
```

Implement `NewRFQServiceWithAward` and interface extension in the codebase (not left as comment).

---

## Tasks 4–6

Mirror Tasks 2–3: extend `domain`, `persistence` models/repos, `application` services, `httpx` handlers, tests, and `Mount`. Tables:

| Task | Primary tables |
| --- | --- |
| 4 | `procurement_supplier_contracts` |
| 5 | `procurement_delivery_events` |
| 6 | `procurement_purchase_orders`, `procurement_purchase_order_lines`, `procurement_supplier_invoices`, `procurement_supplier_invoice_lines` |

Use integer `unit_price_cents` and `currency_code` on monetary rows. Keep `tenant_id` on every table.
