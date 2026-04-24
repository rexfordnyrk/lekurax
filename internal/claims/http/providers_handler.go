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

type ProvidersHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterProviderRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &ProvidersHandler{db: db, audit: auditWriter, authz: authzClient}

	insurance := v1.Group("/insurance")

	insurance.POST("/providers",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.providers.manage"),
		h.createProvider,
	)
	insurance.GET("/providers",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.providers.view"),
		h.listProviders,
	)
}

type InsuranceProvider struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Name      string    `json:"name" gorm:"type:text;not null"`
	PayerID   *string   `json:"payer_id" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
	UpdatedAt time.Time `json:"updated_at" gorm:"type:timestamptz;not null"`
}

func (InsuranceProvider) TableName() string { return "insurance_providers" }

type createProviderBody struct {
	Name    string  `json:"name"`
	PayerID *string `json:"payer_id"`
}

func (h *ProvidersHandler) createProvider(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	var body createProviderBody
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	now := time.Now().UTC()
	p := InsuranceProvider{
		ID:        uuid.New(),
		TenantID:  tenantID(c),
		Name:      strings.TrimSpace(body.Name),
		PayerID:   trimPtr(body.PayerID),
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&p).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAudit(c, h.audit, "insurance.provider_created", "insurance_provider", &p.ID, map[string]any{"name": p.Name})
	c.JSON(http.StatusCreated, p)
}

func (h *ProvidersHandler) listProviders(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	var rows []InsuranceProvider
	if err := h.db.WithContext(c.Request.Context()).
		Where("tenant_id = ?", tenantID(c)).
		Order("name ASC").
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []InsuranceProvider{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func isTenantAdmin(principal *auth.Principal) bool {
	if principal == nil {
		return false
	}
	for _, role := range principal.Roles {
		if role == "tenant-admin" || role == "tenant_admin" {
			return true
		}
	}
	return false
}

func tenantID(c *gin.Context) uuid.UUID {
	return auth.GetPrincipal(c).TenantID
}

func trimPtr(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil
	}
	return &t
}

