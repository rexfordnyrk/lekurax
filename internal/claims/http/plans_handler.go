package http

import (
	"encoding/json"
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

type PlansHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterPlanRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &PlansHandler{db: db, audit: auditWriter, authz: authzClient}

	insurance := v1.Group("/insurance")

	insurance.POST("/providers/:id/plans",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.plans.manage"),
		h.createPlan,
	)
	insurance.GET("/plans",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.plans.view"),
		h.listPlans,
	)
}

type InsurancePlan struct {
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID   uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	ProviderID uuid.UUID `json:"provider_id" gorm:"type:uuid;not null;index"`
	Name       string    `json:"name" gorm:"type:text;not null"`
	CreatedAt  time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
	UpdatedAt  time.Time `json:"updated_at" gorm:"type:timestamptz;not null"`
}

func (InsurancePlan) TableName() string { return "insurance_plans" }

type createPlanBody struct {
	Name string `json:"name"`
}

func (h *PlansHandler) createPlan(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	providerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var body createPlanBody
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	tid := tenantID(c)
	var count int64
	if err := h.db.WithContext(c.Request.Context()).
		Model(&InsuranceProvider{}).
		Where("id = ? AND tenant_id = ?", providerID, tid).
		Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	now := time.Now().UTC()
	pl := InsurancePlan{
		ID:         uuid.New(),
		TenantID:   tid,
		ProviderID: providerID,
		Name:       strings.TrimSpace(body.Name),
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&pl).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAudit(c, h.audit, "insurance.plan_created", "insurance_plan", &pl.ID, map[string]any{"name": pl.Name, "provider_id": providerID.String()})
	c.JSON(http.StatusCreated, pl)
}

func (h *PlansHandler) listPlans(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	var rows []InsurancePlan
	if err := h.db.WithContext(c.Request.Context()).
		Where("tenant_id = ?", tenantID(c)).
		Order("name ASC").
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []InsurancePlan{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
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

