package http

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/rbac"
)

type CoverageHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterCoverageRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &CoverageHandler{db: db, audit: auditWriter, authz: authzClient}

	v1.POST("/patients/:id/coverages",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.coverage.manage"),
		h.createCoverage,
	)
	v1.GET("/patients/:id/coverages",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.coverage.view"),
		h.listCoverages,
	)
}

type PatientCoverage struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	PatientID uuid.UUID `json:"patient_id" gorm:"type:uuid;not null;index"`
	PlanID    uuid.UUID `json:"plan_id" gorm:"type:uuid;not null;index"`
	MemberID  string    `json:"member_id" gorm:"type:text;not null"`
	IsPrimary bool      `json:"is_primary" gorm:"not null"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (PatientCoverage) TableName() string { return "patient_coverages" }

type createCoverageBody struct {
	PlanID    string `json:"plan_id"`
	MemberID  string `json:"member_id"`
	IsPrimary *bool  `json:"is_primary"`
}

func (h *CoverageHandler) createCoverage(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	patientID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var body createCoverageBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	planID, err := uuid.Parse(strings.TrimSpace(body.PlanID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	memberID := strings.TrimSpace(body.MemberID)
	if memberID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	isPrimary := true
	if body.IsPrimary != nil {
		isPrimary = *body.IsPrimary
	}

	tid := tenantID(c)

	var patientCount int64
	if err := h.db.WithContext(c.Request.Context()).
		Table("patients").
		Where("id = ? AND tenant_id = ?", patientID, tid).
		Count(&patientCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if patientCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	var planCount int64
	if err := h.db.WithContext(c.Request.Context()).
		Model(&InsurancePlan{}).
		Where("id = ? AND tenant_id = ?", planID, tid).
		Count(&planCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if planCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	now := time.Now().UTC()
	row := PatientCoverage{
		ID:        uuid.New(),
		TenantID:  tid,
		PatientID: patientID,
		PlanID:    planID,
		MemberID:  memberID,
		IsPrimary: isPrimary,
		CreatedAt: now,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAudit(c, h.audit, "patient.coverage_added", "patient_coverage", &row.ID, map[string]any{
		"patient_id": row.PatientID.String(),
		"plan_id":    row.PlanID.String(),
		"member_id":  row.MemberID,
		"is_primary": row.IsPrimary,
	})
	c.JSON(http.StatusCreated, row)
}

func (h *CoverageHandler) listCoverages(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	patientID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	tid := tenantID(c)

	var patientCount int64
	if err := h.db.WithContext(c.Request.Context()).
		Table("patients").
		Where("id = ? AND tenant_id = ?", patientID, tid).
		Count(&patientCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if patientCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	var rows []PatientCoverage
	if err := h.db.WithContext(c.Request.Context()).
		Where("tenant_id = ? AND patient_id = ?", tid, patientID).
		Order("created_at DESC").
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []PatientCoverage{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

