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

type RequisitionsHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterRequisitionRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &RequisitionsHandler{db: db, audit: auditWriter, authz: authzClient}

	base := "/branches/:branch_id/requisitions"

	v1.POST(base,
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("procurement.requisitions.create"),
		h.createRequisition,
	)
	v1.POST(base+"/:id/lines",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("procurement.requisitions.create"),
		h.addLine,
	)
	v1.POST(base+"/:id/submit",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("procurement.requisitions.submit"),
		h.submit,
	)
	v1.POST(base+"/:id/approve",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("procurement.requisitions.approve"),
		h.approve,
	)
	v1.POST(base+"/:id/reject",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("procurement.requisitions.reject"),
		h.reject,
	)
	v1.GET(base+"/:id",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("procurement.requisitions.view"),
		h.get,
	)
	v1.GET(base,
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("procurement.requisitions.list"),
		h.list,
	)
}

type RequisitionStatus string

const (
	RequisitionStatusDraft     RequisitionStatus = "draft"
	RequisitionStatusSubmitted RequisitionStatus = "submitted"
	RequisitionStatusApproved  RequisitionStatus = "approved"
	RequisitionStatusRejected  RequisitionStatus = "rejected"
)

type PurchaseRequisition struct {
	ID                uuid.UUID         `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID          uuid.UUID         `json:"tenant_id" gorm:"type:uuid;not null;index"`
	BranchID          uuid.UUID         `json:"branch_id" gorm:"type:uuid;not null;index"`
	Status            RequisitionStatus `json:"status" gorm:"type:text;not null"`
	RequestedByUserID *uuid.UUID        `json:"requested_by_user_id" gorm:"type:uuid;index"`
	ApprovedByUserID  *uuid.UUID        `json:"approved_by_user_id" gorm:"type:uuid;index"`
	CreatedAt         time.Time         `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (PurchaseRequisition) TableName() string { return "purchase_requisitions" }

type PurchaseRequisitionLine struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID      uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	RequisitionID uuid.UUID `json:"requisition_id" gorm:"type:uuid;not null;index"`
	ProductID     uuid.UUID `json:"product_id" gorm:"type:uuid;not null;index"`
	Quantity      int64     `json:"quantity" gorm:"type:bigint;not null"`
	CreatedAt     time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (PurchaseRequisitionLine) TableName() string { return "purchase_requisition_lines" }

type createRequisitionBody struct{}

func (h *RequisitionsHandler) createRequisition(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	// Accept empty body; keep shape stable for clients.
	var _ createRequisitionBody
	_ = c.ShouldBindJSON(&struct{}{})

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	now := time.Now().UTC()
	userID := pr.UserID

	row := PurchaseRequisition{
		ID:                uuid.New(),
		TenantID:          pr.TenantID,
		BranchID:          mustBranchID(c),
		Status:            RequisitionStatusDraft,
		RequestedByUserID: &userID,
		ApprovedByUserID:  nil,
		CreatedAt:         now,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAuditBranch(c, h.audit, "requisition.created", "requisition", &row.ID, map[string]any{
		"status":    string(row.Status),
		"branch_id": row.BranchID.String(),
	})
	c.JSON(http.StatusCreated, row)
}

type addLineBody struct {
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int64     `json:"quantity"`
}

func (h *RequisitionsHandler) addLine(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var body addLineBody
	if err := c.ShouldBindJSON(&body); err != nil || body.ProductID == uuid.Nil || body.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	tid := tenantIDFromPrincipal(c)
	bid := mustBranchID(c)

	var req PurchaseRequisition
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", id, tid, bid).
		First(&req).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if req.Status != RequisitionStatusDraft {
		c.JSON(http.StatusConflict, gin.H{"error": "INVALID_STATE"})
		return
	}

	var productCount int64
	if err := h.db.WithContext(c.Request.Context()).
		Table("products").
		Where("id = ? AND tenant_id = ?", body.ProductID, tid).
		Count(&productCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if productCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "PRODUCT_NOT_FOUND"})
		return
	}

	now := time.Now().UTC()
	line := PurchaseRequisitionLine{
		ID:            uuid.New(),
		TenantID:      tid,
		RequisitionID: id,
		ProductID:     body.ProductID,
		Quantity:      body.Quantity,
		CreatedAt:     now,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&line).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	c.JSON(http.StatusCreated, line)
}

func (h *RequisitionsHandler) submit(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	tid := tenantIDFromPrincipal(c)
	bid := mustBranchID(c)

	var linesCount int64
	if err := h.db.WithContext(c.Request.Context()).
		Table("purchase_requisition_lines").
		Joins("JOIN purchase_requisitions pr ON pr.id = purchase_requisition_lines.requisition_id").
		Where("pr.tenant_id = ? AND pr.branch_id = ? AND pr.id = ?", tid, bid, id).
		Count(&linesCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if linesCount == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "NO_LINES"})
		return
	}

	result := h.db.WithContext(c.Request.Context()).
		Model(&PurchaseRequisition{}).
		Where("id = ? AND tenant_id = ? AND branch_id = ? AND status = ?", id, tid, bid, RequisitionStatusDraft).
		Update("status", RequisitionStatusSubmitted)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if result.RowsAffected == 0 {
		var count int64
		if err := h.db.WithContext(c.Request.Context()).
			Model(&PurchaseRequisition{}).
			Where("id = ? AND tenant_id = ? AND branch_id = ?", id, tid, bid).
			Count(&count).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
			return
		}
		if count == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusConflict, gin.H{"error": "INVALID_STATE"})
		return
	}

	var row PurchaseRequisition
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", id, tid, bid).
		First(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAuditBranch(c, h.audit, "requisition.submitted", "requisition", &row.ID, map[string]any{
		"status":    string(row.Status),
		"branch_id": row.BranchID.String(),
	})
	c.JSON(http.StatusOK, row)
}

func (h *RequisitionsHandler) approve(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}
	tid := pr.TenantID
	bid := mustBranchID(c)

	uid := pr.UserID
	result := h.db.WithContext(c.Request.Context()).
		Model(&PurchaseRequisition{}).
		Where("id = ? AND tenant_id = ? AND branch_id = ? AND status = ?", id, tid, bid, RequisitionStatusSubmitted).
		Updates(map[string]any{
			"status":              RequisitionStatusApproved,
			"approved_by_user_id": &uid,
		})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if result.RowsAffected == 0 {
		var count int64
		if err := h.db.WithContext(c.Request.Context()).
			Model(&PurchaseRequisition{}).
			Where("id = ? AND tenant_id = ? AND branch_id = ?", id, tid, bid).
			Count(&count).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
			return
		}
		if count == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusConflict, gin.H{"error": "INVALID_STATE"})
		return
	}

	var row PurchaseRequisition
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", id, tid, bid).
		First(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAuditBranch(c, h.audit, "requisition.approved", "requisition", &row.ID, map[string]any{
		"status":              string(row.Status),
		"approved_by_user_id": uid.String(),
		"branch_id":           row.BranchID.String(),
	})
	c.JSON(http.StatusOK, row)
}

type rejectBody struct {
	Reason *string `json:"reason"`
}

func (h *RequisitionsHandler) get(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	tid := tenantIDFromPrincipal(c)
	bid := mustBranchID(c)

	var row PurchaseRequisition
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", id, tid, bid).
		First(&row).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	var lines []PurchaseRequisitionLine
	if err := h.db.WithContext(c.Request.Context()).
		Table("purchase_requisition_lines").
		Select("purchase_requisition_lines.*").
		Joins("JOIN purchase_requisitions pr ON pr.id = purchase_requisition_lines.requisition_id").
		Where("pr.tenant_id = ? AND pr.branch_id = ? AND pr.id = ?", tid, bid, id).
		Order("created_at ASC").
		Find(&lines).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if lines == nil {
		lines = []PurchaseRequisitionLine{}
	}

	c.JSON(http.StatusOK, gin.H{"requisition": row, "lines": lines})
}

func (h *RequisitionsHandler) reject(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var body rejectBody
	_ = c.ShouldBindJSON(&body)
	var reason *string
	if body.Reason != nil {
		r := strings.TrimSpace(*body.Reason)
		if r != "" {
			reason = &r
		}
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}
	tid := pr.TenantID
	bid := mustBranchID(c)

	uid := pr.UserID
	result := h.db.WithContext(c.Request.Context()).
		Model(&PurchaseRequisition{}).
		Where("id = ? AND tenant_id = ? AND branch_id = ? AND status = ?", id, tid, bid, RequisitionStatusSubmitted).
		Updates(map[string]any{
			"status":              RequisitionStatusRejected,
			"approved_by_user_id": &uid,
		})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if result.RowsAffected == 0 {
		var count int64
		if err := h.db.WithContext(c.Request.Context()).
			Model(&PurchaseRequisition{}).
			Where("id = ? AND tenant_id = ? AND branch_id = ?", id, tid, bid).
			Count(&count).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
			return
		}
		if count == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusConflict, gin.H{"error": "INVALID_STATE"})
		return
	}

	var row PurchaseRequisition
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", id, tid, bid).
		First(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	meta := map[string]any{
		"status":              string(row.Status),
		"approved_by_user_id": uid.String(),
		"branch_id":           row.BranchID.String(),
	}
	if reason != nil {
		meta["reason"] = *reason
	}
	logAuditBranch(c, h.audit, "requisition.rejected", "requisition", &row.ID, meta)
	c.JSON(http.StatusOK, row)
}

func (h *RequisitionsHandler) list(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	tid := tenantIDFromPrincipal(c)
	bid := mustBranchID(c)

	var rows []PurchaseRequisition
	if err := h.db.WithContext(c.Request.Context()).
		Where("tenant_id = ? AND branch_id = ?", tid, bid).
		Order("created_at DESC").
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []PurchaseRequisition{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
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
