package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/rbac"
)

type PortalHandler struct {
	db    *gorm.DB
	audit *audit.Writer
}

func RegisterPortalRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer) {
	h := &PortalHandler{db: db, audit: auditWriter}

	portal := v1.Group("/portal")

	portal.GET("/prescriptions",
		auth.RequireAuth(verifier),
		rbac.RequirePermission("portal.prescriptions.view"),
		h.listPrescriptions,
	)
	portal.POST("/refills",
		auth.RequireAuth(verifier),
		rbac.RequirePermission("portal.refills.request"),
		h.requestRefill,
	)
}

type PortalPatientLink struct {
	TenantID  uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;primaryKey"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null;primaryKey"`
	PatientID uuid.UUID `json:"patient_id" gorm:"type:uuid;not null;index"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (PortalPatientLink) TableName() string { return "portal_patient_links" }

type Prescription struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID      uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	BranchID      uuid.UUID `json:"branch_id" gorm:"type:uuid;not null"`
	PatientID     uuid.UUID `json:"patient_id" gorm:"type:uuid;not null;index"`
	Prescriber    *string   `json:"prescriber_name" gorm:"column:prescriber_name"`
	Status        string    `json:"status" gorm:"type:text;not null"`
	CreatedAt     time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"type:timestamptz;not null"`
}

func (Prescription) TableName() string { return "prescriptions" }

type portalPrescription struct {
	ID            uuid.UUID `json:"id"`
	BranchID      uuid.UUID `json:"branch_id"`
	Prescriber    *string   `json:"prescriber_name"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (h *PortalHandler) listPrescriptions(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	ctx := c.Request.Context()
	patientID, err := h.resolvePortalPatientID(ctx, pr.TenantID, pr.UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusForbidden, gin.H{"error": "PORTAL_PATIENT_NOT_LINKED"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	var rows []Prescription
	if err := h.db.WithContext(ctx).
		Where("tenant_id = ? AND patient_id = ?", pr.TenantID, patientID).
		Order("created_at DESC").
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	items := make([]portalPrescription, 0, len(rows))
	for _, r := range rows {
		items = append(items, portalPrescription{
			ID:         r.ID,
			BranchID:   r.BranchID,
			Prescriber: r.Prescriber,
			Status:     r.Status,
			CreatedAt:  r.CreatedAt,
			UpdatedAt:  r.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}

type requestRefillBody struct {
	PrescriptionID uuid.UUID `json:"prescription_id"`
}

type RefillRequest struct {
	ID             uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID       uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	PatientID      uuid.UUID `json:"patient_id" gorm:"type:uuid;not null;index"`
	PrescriptionID uuid.UUID `json:"prescription_id" gorm:"type:uuid;not null;index"`
	Status         string    `json:"status" gorm:"type:text;not null"`
	CreatedAt      time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (RefillRequest) TableName() string { return "refill_requests" }

func (h *PortalHandler) requestRefill(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	var body requestRefillBody
	if err := c.ShouldBindJSON(&body); err != nil || body.PrescriptionID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	ctx := c.Request.Context()
	patientID, err := h.resolvePortalPatientID(ctx, pr.TenantID, pr.UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusForbidden, gin.H{"error": "PORTAL_PATIENT_NOT_LINKED"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	var count int64
	if err := h.db.WithContext(ctx).
		Model(&Prescription{}).
		Where("id = ? AND tenant_id = ? AND patient_id = ?", body.PrescriptionID, pr.TenantID, patientID).
		Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	now := time.Now().UTC()
	row := RefillRequest{
		ID:             uuid.New(),
		TenantID:       pr.TenantID,
		PatientID:      patientID,
		PrescriptionID: body.PrescriptionID,
		Status:         "requested",
		CreatedAt:      now,
	}
	if err := h.db.WithContext(ctx).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAudit(c, h.audit, "portal.refill_requested", "refill_request", &row.ID, map[string]any{
		"prescription_id": row.PrescriptionID.String(),
		"patient_id":      row.PatientID.String(),
	})

	c.JSON(http.StatusCreated, row)
}

func (h *PortalHandler) resolvePortalPatientID(ctx context.Context, tenantID, userID uuid.UUID) (uuid.UUID, error) {
	var link PortalPatientLink
	err := h.db.WithContext(ctx).
		Where("tenant_id = ? AND user_id = ?", tenantID, userID).
		First(&link).Error
	if err != nil {
		return uuid.Nil, err
	}
	return link.PatientID, nil
}

func logAudit(c *gin.Context, w *audit.Writer, action, entityType string, entityID *uuid.UUID, metadata map[string]any) {
	if w == nil {
		return
	}
	pr := auth.GetPrincipal(c)
	if pr == nil {
		return
	}
	raw, _ := json.Marshal(metadata)
	_ = w.Write(c.Request.Context(), audit.Entry{
		TenantID:    pr.TenantID,
		ActorUserID: &pr.UserID,
		Action:      action,
		EntityType:  &entityType,
		EntityID:    entityID,
		Metadata:    raw,
	})
}

