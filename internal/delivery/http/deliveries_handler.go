package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/branchctx"
	"lekurax/internal/rbac"
)

type DeliveriesHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterDeliveryRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &DeliveriesHandler{db: db, audit: auditWriter, authz: authzClient}

	base := "/branches/:branch_id/deliveries"

	v1.POST(base,
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("delivery.orders.create"),
		h.createDelivery,
	)
	v1.POST(base+"/:id/assign",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("delivery.orders.assign"),
		h.assignCourier,
	)
	v1.POST(base+"/:id/status",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("delivery.orders.manage"),
		h.changeStatus,
	)
	v1.GET(base,
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("delivery.orders.view"),
		h.listDeliveries,
	)
}

type DeliveryStatus string

const (
	DeliveryStatusCreated   DeliveryStatus = "created"
	DeliveryStatusAssigned  DeliveryStatus = "assigned"
	DeliveryStatusPickedUp  DeliveryStatus = "picked_up"
	DeliveryStatusDelivered DeliveryStatus = "delivered"
	DeliveryStatusFailed    DeliveryStatus = "failed"
)

type Delivery struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID      `json:"tenant_id" gorm:"type:uuid;not null;index"`
	BranchID  uuid.UUID      `json:"branch_id" gorm:"type:uuid;not null;index"`
	SaleID    uuid.UUID      `json:"sale_id" gorm:"type:uuid;not null;index"`
	CourierID *uuid.UUID     `json:"courier_id" gorm:"type:uuid;index"`
	Address   string         `json:"address" gorm:"type:text;not null"`
	Status    DeliveryStatus `json:"status" gorm:"type:text;not null"`
	CreatedAt time.Time      `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (Delivery) TableName() string { return "deliveries" }

type createDeliveryBody struct {
	SaleID  string `json:"sale_id"`
	Address string `json:"address"`
}

func (h *DeliveriesHandler) createDelivery(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	var body createDeliveryBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	saleID, err := uuid.Parse(strings.TrimSpace(body.SaleID))
	if err != nil || saleID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	address := strings.TrimSpace(body.Address)
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	tid := pr.TenantID
	bid := mustBranchID(c)
	if tid == uuid.Nil || bid == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	var saleCount int64
	if err := h.db.WithContext(c.Request.Context()).
		Table("sales").
		Where("id = ? AND tenant_id = ? AND branch_id = ?", saleID, tid, bid).
		Count(&saleCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if saleCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "SALE_NOT_FOUND"})
		return
	}

	now := time.Now().UTC()
	row := Delivery{
		ID:        uuid.New(),
		TenantID:  tid,
		BranchID:  bid,
		SaleID:    saleID,
		CourierID: nil,
		Address:   address,
		Status:    DeliveryStatusCreated,
		CreatedAt: now,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAuditBranch(c, h.audit, "delivery.created", "delivery", &row.ID, map[string]any{
		"sale_id":   row.SaleID.String(),
		"status":    string(row.Status),
		"branch_id": row.BranchID.String(),
	})
	c.JSON(http.StatusCreated, row)
}

type assignCourierBody struct {
	CourierID string `json:"courier_id"`
}

func (h *DeliveriesHandler) assignCourier(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	deliveryID, err := uuid.Parse(c.Param("id"))
	if err != nil || deliveryID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var body assignCourierBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	courierID, err := uuid.Parse(strings.TrimSpace(body.CourierID))
	if err != nil || courierID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	tid := pr.TenantID
	bid := mustBranchID(c)

	var courierCount int64
	if err := h.db.WithContext(c.Request.Context()).
		Model(&Courier{}).
		Where("id = ? AND tenant_id = ?", courierID, tid).
		Count(&courierCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if courierCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "COURIER_NOT_FOUND"})
		return
	}

	var existing Delivery
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", deliveryID, tid, bid).
		First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if existing.Status == DeliveryStatusDelivered || existing.Status == DeliveryStatusFailed {
		c.JSON(http.StatusConflict, gin.H{"error": "INVALID_STATE"})
		return
	}

	result := h.db.WithContext(c.Request.Context()).
		Model(&Delivery{}).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", deliveryID, tid, bid).
		Updates(map[string]any{
			"courier_id": courierID,
			"status":     DeliveryStatusAssigned,
		})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	var row Delivery
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", deliveryID, tid, bid).
		First(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAuditBranch(c, h.audit, "delivery.assigned", "delivery", &row.ID, map[string]any{
		"courier_id": courierID.String(),
		"status":     string(row.Status),
		"branch_id":  row.BranchID.String(),
	})
	c.JSON(http.StatusOK, row)
}

type changeStatusBody struct {
	Status string `json:"status"`
}

func (h *DeliveriesHandler) changeStatus(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	deliveryID, err := uuid.Parse(c.Param("id"))
	if err != nil || deliveryID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var body changeStatusBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	next, ok := parseDeliveryStatus(body.Status)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	tid := pr.TenantID
	bid := mustBranchID(c)

	result := h.db.WithContext(c.Request.Context()).
		Model(&Delivery{}).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", deliveryID, tid, bid).
		Update("status", next)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	var row Delivery
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", deliveryID, tid, bid).
		First(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAuditBranch(c, h.audit, "delivery.status_changed", "delivery", &row.ID, map[string]any{
		"status":    string(row.Status),
		"branch_id": row.BranchID.String(),
	})
	c.JSON(http.StatusOK, row)
}

func (h *DeliveriesHandler) listDeliveries(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	tid := pr.TenantID
	bid := mustBranchID(c)

	var rows []Delivery
	if err := h.db.WithContext(c.Request.Context()).
		Where("tenant_id = ? AND branch_id = ?", tid, bid).
		Order("created_at DESC").
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Delivery{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func parseDeliveryStatus(raw string) (DeliveryStatus, bool) {
	v := strings.TrimSpace(strings.ToLower(raw))
	switch v {
	case string(DeliveryStatusCreated):
		return DeliveryStatusCreated, true
	case string(DeliveryStatusAssigned):
		return DeliveryStatusAssigned, true
	case string(DeliveryStatusPickedUp):
		return DeliveryStatusPickedUp, true
	case string(DeliveryStatusDelivered):
		return DeliveryStatusDelivered, true
	case string(DeliveryStatusFailed):
		return DeliveryStatusFailed, true
	default:
		return "", false
	}
}

func tenantIDFromPrincipal(c *gin.Context) uuid.UUID {
	pr := auth.GetPrincipal(c)
	if pr == nil {
		return uuid.Nil
	}
	return pr.TenantID
}

func mustBranchID(c *gin.Context) uuid.UUID {
	raw := strings.TrimSpace(c.GetString(branchctx.ContextKey))
	bid, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil
	}
	return bid
}

func requireConsistentBranchParam() gin.HandlerFunc {
	return func(c *gin.Context) {
		pathRaw := strings.TrimSpace(c.Param(branchctx.PathParamKey))
		pathID, err := uuid.Parse(pathRaw)
		if err != nil || pathID == uuid.Nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
			return
		}

		resolvedID := mustBranchID(c)
		if resolvedID == uuid.Nil || resolvedID != pathID {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
			return
		}

		c.Next()
	}
}

func logAuditBranch(c *gin.Context, w *audit.Writer, action, entityType string, entityID *uuid.UUID, metadata map[string]any) {
	if w == nil {
		return
	}
	pr := auth.GetPrincipal(c)
	if pr == nil {
		return
	}
	raw, _ := json.Marshal(metadata)
	bid := mustBranchID(c)
	if bid == uuid.Nil {
		_ = w.Write(c.Request.Context(), audit.Entry{
			TenantID:    pr.TenantID,
			ActorUserID: &pr.UserID,
			Action:      action,
			EntityType:  &entityType,
			EntityID:    entityID,
			Metadata:    raw,
		})
		return
	}

	_ = w.Write(c.Request.Context(), audit.Entry{
		TenantID:    pr.TenantID,
		BranchID:    &bid,
		ActorUserID: &pr.UserID,
		Action:      action,
		EntityType:  &entityType,
		EntityID:    entityID,
		Metadata:    raw,
	})
}

