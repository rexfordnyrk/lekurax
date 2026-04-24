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

type SuppliersHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterSupplierRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &SuppliersHandler{db: db, audit: auditWriter, authz: authzClient}

	v1.POST("/suppliers",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("procurement.suppliers.manage"),
		h.createSupplier,
	)
	v1.GET("/suppliers",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("procurement.suppliers.view"),
		h.listSuppliers,
	)
}

type Supplier struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID     uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Name         string    `json:"name" gorm:"type:text;not null"`
	ContactEmail *string   `json:"contact_email" gorm:"type:text"`
	ContactPhone *string   `json:"contact_phone" gorm:"type:text"`
	CreatedAt    time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"type:timestamptz;not null"`
}

func (Supplier) TableName() string { return "suppliers" }

type createSupplierBody struct {
	Name         string  `json:"name"`
	ContactEmail *string `json:"contact_email"`
	ContactPhone *string `json:"contact_phone"`
}

func (h *SuppliersHandler) createSupplier(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	var body createSupplierBody
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	now := time.Now().UTC()
	row := Supplier{
		ID:           uuid.New(),
		TenantID:     tenantID(c),
		Name:         strings.TrimSpace(body.Name),
		ContactEmail: trimPtr(body.ContactEmail),
		ContactPhone: trimPtr(body.ContactPhone),
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAudit(c, h.audit, "supplier.created", "supplier", &row.ID, map[string]any{
		"name": row.Name,
	})
	c.JSON(http.StatusCreated, row)
}

func (h *SuppliersHandler) listSuppliers(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	var rows []Supplier
	if err := h.db.WithContext(c.Request.Context()).
		Where("tenant_id = ?", tenantID(c)).
		Order("name ASC").
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Supplier{}
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

