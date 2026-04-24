package app

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"lekurax/internal/audit"
)

var (
	ErrNotFound     = errors.New("NOT_FOUND")
	ErrInvalidInput = errors.New("INVALID_INPUT")
	ErrInvalidState = errors.New("INVALID_STATE")
)

type Status string

const (
	StatusDraft     Status = "draft"
	StatusSubmitted Status = "submitted"
	StatusApproved  Status = "approved"
	StatusRejected  Status = "rejected"
	StatusPaid      Status = "paid"
)

type Claim struct {
	ID                  uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID            uuid.UUID  `json:"tenant_id" gorm:"type:uuid;not null;index"`
	BranchID            uuid.UUID  `json:"branch_id" gorm:"type:uuid;not null;index"`
	SaleID              uuid.UUID  `json:"sale_id" gorm:"type:uuid;not null;index"`
	PlanID              uuid.UUID  `json:"plan_id" gorm:"type:uuid;not null;index"`
	Status              Status     `json:"status" gorm:"type:text;not null"`
	SubmittedAt         *time.Time `json:"submitted_at" gorm:"type:timestamptz"`
	AdjudicatedAt       *time.Time `json:"adjudicated_at" gorm:"type:timestamptz"`
	PaidAt              *time.Time `json:"paid_at" gorm:"type:timestamptz"`
	RejectionReason     *string    `json:"rejection_reason" gorm:"type:text"`
	ApprovedAmountCents *int64     `json:"approved_amount_cents" gorm:"type:bigint"`
	CreatedAt           time.Time  `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (Claim) TableName() string { return "claims" }

type Service struct {
	db    *gorm.DB
	audit *audit.Writer
}

func NewClaimService(db *gorm.DB, auditWriter *audit.Writer) *Service {
	return &Service{db: db, audit: auditWriter}
}

type Actor struct {
	TenantID uuid.UUID
	BranchID uuid.UUID
	UserID   *uuid.UUID
}

func (s *Service) CreateDraftFromSale(ctx context.Context, actor Actor, saleID, planID uuid.UUID) (*Claim, error) {
	if s.db == nil {
		return nil, errors.New("NO_DATABASE")
	}
	if actor.TenantID == uuid.Nil || actor.BranchID == uuid.Nil || saleID == uuid.Nil || planID == uuid.Nil {
		return nil, ErrInvalidInput
	}

	var saleCount int64
	if err := s.db.WithContext(ctx).
		Table("sales").
		Where("id = ? AND tenant_id = ? AND branch_id = ?", saleID, actor.TenantID, actor.BranchID).
		Count(&saleCount).Error; err != nil {
		return nil, err
	}
	if saleCount == 0 {
		return nil, ErrNotFound
	}

	var planCount int64
	if err := s.db.WithContext(ctx).
		Table("insurance_plans").
		Where("id = ? AND tenant_id = ?", planID, actor.TenantID).
		Count(&planCount).Error; err != nil {
		return nil, err
	}
	if planCount == 0 {
		return nil, ErrNotFound
	}

	now := time.Now().UTC()
	row := Claim{
		ID:        uuid.New(),
		TenantID:  actor.TenantID,
		BranchID:  actor.BranchID,
		SaleID:    saleID,
		PlanID:    planID,
		Status:    StatusDraft,
		CreatedAt: now,
	}

	if err := s.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, err
	}

	s.writeAudit(ctx, actor, "claim.created", &row.ID, map[string]any{
		"sale_id":   saleID.String(),
		"plan_id":   planID.String(),
		"status":    string(row.Status),
		"branch_id": actor.BranchID.String(),
	})

	return &row, nil
}

func (s *Service) Submit(ctx context.Context, actor Actor, id uuid.UUID) (*Claim, error) {
	if s.db == nil {
		return nil, errors.New("NO_DATABASE")
	}
	if actor.TenantID == uuid.Nil || actor.BranchID == uuid.Nil || id == uuid.Nil {
		return nil, ErrInvalidInput
	}

	var row Claim
	if err := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", id, actor.TenantID, actor.BranchID).
		First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if row.Status != StatusDraft {
		return nil, ErrInvalidState
	}

	now := time.Now().UTC()
	row.Status = StatusSubmitted
	row.SubmittedAt = &now

	if err := s.db.WithContext(ctx).Save(&row).Error; err != nil {
		return nil, err
	}

	s.writeAudit(ctx, actor, "claim.submitted", &row.ID, map[string]any{
		"status":       string(row.Status),
		"submitted_at": now.Format(time.RFC3339Nano),
	})

	return &row, nil
}

type Adjudication struct {
	Status              Status
	ApprovedAmountCents *int64
	RejectionReason     *string
}

func (s *Service) Adjudicate(ctx context.Context, actor Actor, id uuid.UUID, adj Adjudication) (*Claim, error) {
	if s.db == nil {
		return nil, errors.New("NO_DATABASE")
	}
	if actor.TenantID == uuid.Nil || actor.BranchID == uuid.Nil || id == uuid.Nil {
		return nil, ErrInvalidInput
	}

	var row Claim
	if err := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", id, actor.TenantID, actor.BranchID).
		First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if row.Status != StatusSubmitted {
		return nil, ErrInvalidState
	}

	now := time.Now().UTC()
	row.AdjudicatedAt = &now

	switch adj.Status {
	case StatusApproved:
		if adj.ApprovedAmountCents == nil {
			return nil, ErrInvalidInput
		}
		row.Status = StatusApproved
		row.ApprovedAmountCents = adj.ApprovedAmountCents
		row.RejectionReason = nil
	case StatusRejected:
		if adj.RejectionReason == nil || strings.TrimSpace(*adj.RejectionReason) == "" {
			return nil, ErrInvalidInput
		}
		reason := strings.TrimSpace(*adj.RejectionReason)
		row.Status = StatusRejected
		row.RejectionReason = &reason
		row.ApprovedAmountCents = nil
	default:
		return nil, ErrInvalidInput
	}

	if err := s.db.WithContext(ctx).Save(&row).Error; err != nil {
		return nil, err
	}

	meta := map[string]any{
		"status":         string(row.Status),
		"adjudicated_at": now.Format(time.RFC3339Nano),
	}
	if row.ApprovedAmountCents != nil {
		meta["approved_amount_cents"] = *row.ApprovedAmountCents
	}
	if row.RejectionReason != nil {
		meta["rejection_reason"] = *row.RejectionReason
	}
	s.writeAudit(ctx, actor, "claim.adjudicated", &row.ID, meta)

	return &row, nil
}

func (s *Service) MarkPaid(ctx context.Context, actor Actor, id uuid.UUID) (*Claim, error) {
	if s.db == nil {
		return nil, errors.New("NO_DATABASE")
	}
	if actor.TenantID == uuid.Nil || actor.BranchID == uuid.Nil || id == uuid.Nil {
		return nil, ErrInvalidInput
	}

	var row Claim
	if err := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", id, actor.TenantID, actor.BranchID).
		First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if row.Status != StatusApproved {
		return nil, ErrInvalidState
	}

	now := time.Now().UTC()
	row.Status = StatusPaid
	row.PaidAt = &now

	if err := s.db.WithContext(ctx).Save(&row).Error; err != nil {
		return nil, err
	}

	s.writeAudit(ctx, actor, "claim.paid", &row.ID, map[string]any{
		"status":  string(row.Status),
		"paid_at": now.Format(time.RFC3339Nano),
	})

	return &row, nil
}

func (s *Service) Get(ctx context.Context, tenantID, branchID, id uuid.UUID) (*Claim, error) {
	if s.db == nil {
		return nil, errors.New("NO_DATABASE")
	}
	if tenantID == uuid.Nil || branchID == uuid.Nil || id == uuid.Nil {
		return nil, ErrInvalidInput
	}

	var row Claim
	if err := s.db.WithContext(ctx).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", id, tenantID, branchID).
		First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &row, nil
}

func (s *Service) List(ctx context.Context, tenantID, branchID uuid.UUID) ([]Claim, error) {
	if s.db == nil {
		return nil, errors.New("NO_DATABASE")
	}
	if tenantID == uuid.Nil || branchID == uuid.Nil {
		return nil, ErrInvalidInput
	}

	var rows []Claim
	if err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND branch_id = ?", tenantID, branchID).
		Order("created_at DESC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	if rows == nil {
		rows = []Claim{}
	}
	return rows, nil
}

func (s *Service) writeAudit(ctx context.Context, actor Actor, action string, entityID *uuid.UUID, metadata map[string]any) {
	if s.audit == nil {
		return
	}
	raw := jsonMarshal(metadata)
	entityType := "claim"
	_ = s.audit.Write(ctx, audit.Entry{
		TenantID:    actor.TenantID,
		BranchID:    &actor.BranchID,
		ActorUserID: actor.UserID,
		Action:      action,
		EntityType:  &entityType,
		EntityID:    entityID,
		Metadata:    raw,
	})
}

func jsonMarshal(v any) []byte {
	b, _ := json.Marshal(v)
	if len(b) == 0 {
		return []byte(`{}`)
	}
	return b
}
