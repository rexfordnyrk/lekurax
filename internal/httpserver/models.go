package httpserver

import (
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Name           string    `json:"name" gorm:"not null"`
	GenericName    *string   `json:"generic_name,omitempty"`
	Manufacturer   *string   `json:"manufacturer,omitempty"`
	SKU            *string   `json:"sku,omitempty"`
	Barcode        *string   `json:"barcode,omitempty"`
	IsPrescription bool      `json:"is_prescription" gorm:"column:is_prescription"`
	IsControlled   bool      `json:"is_controlled" gorm:"column:is_controlled"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (Product) TableName() string { return "products" }

type StockBatch struct {
	ID             uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID  `json:"tenant_id" gorm:"type:uuid;not null"`
	BranchID       uuid.UUID  `json:"branch_id" gorm:"type:uuid;not null"`
	ProductID      uuid.UUID  `json:"product_id" gorm:"type:uuid;not null"`
	BatchNo        string     `json:"batch_no" gorm:"not null"`
	ExpiresOn      *time.Time `json:"expires_on,omitempty" gorm:"type:date"`
	QuantityOnHand int64      `json:"quantity_on_hand" gorm:"not null"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (StockBatch) TableName() string { return "stock_batches" }

type StockAdjustment struct {
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID     uuid.UUID  `json:"tenant_id" gorm:"type:uuid;not null"`
	BranchID     uuid.UUID  `json:"branch_id" gorm:"type:uuid;not null"`
	ProductID    uuid.UUID  `json:"product_id" gorm:"type:uuid;not null"`
	StockBatchID *uuid.UUID `json:"stock_batch_id,omitempty" gorm:"type:uuid"`
	Delta        int64      `json:"delta" gorm:"not null"`
	ReasonCode   string     `json:"reason_code" gorm:"not null"`
	Note         *string    `json:"note,omitempty"`
	ActorUserID  *uuid.UUID `json:"actor_user_id,omitempty" gorm:"type:uuid"`
	CreatedAt    time.Time  `json:"created_at"`
}

func (StockAdjustment) TableName() string { return "stock_adjustments" }

type ProductPrice struct {
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null"`
	ProductID      uuid.UUID `json:"product_id" gorm:"type:uuid;not null"`
	Currency       string    `json:"currency" gorm:"not null;default:USD"`
	UnitPriceCents int64     `json:"unit_price_cents" gorm:"not null"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (ProductPrice) TableName() string { return "product_prices" }

type TaxRule struct {
	ID                    uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID              uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null"`
	Name                  string    `json:"name" gorm:"not null"`
	RateBps               int       `json:"rate_bps" gorm:"not null"`
	AppliesToPrescription bool      `json:"applies_to_prescription" gorm:"column:applies_to_prescription"`
	AppliesToOTC          bool      `json:"applies_to_otc" gorm:"column:applies_to_otc"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

func (TaxRule) TableName() string { return "tax_rules" }

type Patient struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID  `json:"tenant_id" gorm:"type:uuid;not null"`
	FirstName   string     `json:"first_name" gorm:"not null"`
	LastName    string     `json:"last_name" gorm:"not null"`
	DateOfBirth *time.Time `json:"date_of_birth,omitempty" gorm:"type:date"`
	Phone       *string    `json:"phone,omitempty"`
	Email       *string    `json:"email,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func (Patient) TableName() string { return "patients" }

type PatientAllergy struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null"`
	PatientID uuid.UUID `json:"patient_id" gorm:"type:uuid;not null"`
	Allergen  string    `json:"allergen" gorm:"not null"`
	Reaction  *string   `json:"reaction,omitempty"`
	Severity  *string   `json:"severity,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

func (PatientAllergy) TableName() string { return "patient_allergies" }

type Prescription struct {
	ID             uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID  `json:"tenant_id" gorm:"type:uuid;not null"`
	BranchID       uuid.UUID  `json:"branch_id" gorm:"type:uuid;not null"`
	PatientID      uuid.UUID  `json:"patient_id" gorm:"type:uuid;not null"`
	PrescriberName *string    `json:"prescriber_name,omitempty"`
	Notes          *string    `json:"notes,omitempty"`
	Status         string     `json:"status" gorm:"not null;default:draft"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (Prescription) TableName() string { return "prescriptions" }

type PrescriptionItem struct {
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null"`
	PrescriptionID uuid.UUID `json:"prescription_id" gorm:"type:uuid;not null"`
	ProductID      uuid.UUID `json:"product_id" gorm:"type:uuid;not null"`
	Quantity       int64     `json:"quantity" gorm:"not null"`
	Directions     *string   `json:"directions,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

func (PrescriptionItem) TableName() string { return "prescription_items" }

type Dispensation struct {
	ID             uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID  `json:"tenant_id" gorm:"type:uuid;not null"`
	BranchID       uuid.UUID  `json:"branch_id" gorm:"type:uuid;not null"`
	PrescriptionID uuid.UUID  `json:"prescription_id" gorm:"type:uuid;not null"`
	ActorUserID    *uuid.UUID `json:"actor_user_id,omitempty" gorm:"type:uuid"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (Dispensation) TableName() string { return "dispensations" }

type Sale struct {
	ID             uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID  `json:"tenant_id" gorm:"type:uuid;not null"`
	BranchID       uuid.UUID  `json:"branch_id" gorm:"type:uuid;not null"`
	PrescriptionID *uuid.UUID `json:"prescription_id,omitempty" gorm:"type:uuid"`
	PatientID      *uuid.UUID `json:"patient_id,omitempty" gorm:"type:uuid"`
	Currency       string     `json:"currency" gorm:"not null;default:USD"`
	SubtotalCents  int64      `json:"subtotal_cents" gorm:"not null"`
	TaxCents       int64      `json:"tax_cents" gorm:"not null"`
	TotalCents     int64      `json:"total_cents" gorm:"not null"`
	Status         string     `json:"status" gorm:"not null;default:paid"`
	ActorUserID    *uuid.UUID `json:"actor_user_id,omitempty" gorm:"type:uuid"`
	CreatedAt      time.Time  `json:"created_at"`
}

func (Sale) TableName() string { return "sales" }

type SaleLine struct {
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null"`
	SaleID         uuid.UUID `json:"sale_id" gorm:"type:uuid;not null"`
	ProductID      uuid.UUID `json:"product_id" gorm:"type:uuid;not null"`
	Quantity       int64     `json:"quantity" gorm:"not null"`
	UnitPriceCents int64     `json:"unit_price_cents" gorm:"not null"`
	LineTotalCents int64     `json:"line_total_cents" gorm:"not null"`
	CreatedAt      time.Time `json:"created_at"`
}

func (SaleLine) TableName() string { return "sale_lines" }
