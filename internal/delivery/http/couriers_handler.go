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

type CouriersHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterCourierRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &CouriersHandler{db: db, audit: auditWriter, authz: authzClient}

	v1.POST("/couriers",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("delivery.couriers.manage"),
		h.createCourier,
	)
	v1.GET("/couriers",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("delivery.couriers.view"),
		h.listCouriers,
	)
}

type Courier struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Name      string    `json:"name" gorm:"type:text;not null"`
	Phone     *string   `json:"phone" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (Courier) TableName() string { return "couriers" }

type createCourierBody struct {
	Name  string  `json:"name"`
	Phone *string `json:"phone"`
}

func (h *CouriersHandler) createCourier(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	var body createCourierBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	phone := trimPtr(body.Phone)
	now := time.Now().UTC()
	row := Courier{
		ID:        uuid.New(),
		TenantID:  pr.TenantID,
		Name:      name,
		Phone:     phone,
		CreatedAt: now,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAuditTenant(c, h.audit, "courier.created", "courier", &row.ID, map[string]any{
		"name":  row.Name,
		"phone": row.Phone,
	})
	c.JSON(http.StatusCreated, row)
}

func (h *CouriersHandler) listCouriers(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	var rows []Courier
	if err := h.db.WithContext(c.Request.Context()).
		Where("tenant_id = ?", pr.TenantID).
		Order("name ASC").
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Courier{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func logAuditTenant(c *gin.Context, w *audit.Writer, action, entityType string, entityID *uuid.UUID, metadata map[string]any) {
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

