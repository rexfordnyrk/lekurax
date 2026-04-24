package http

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/branchctx"
	claimsapp "lekurax/internal/claims/app"
	"lekurax/internal/rbac"
)

type ClaimHandler struct {
	svc *claimsapp.Service
}

func RegisterClaimRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &ClaimHandler{svc: claimsapp.NewClaimService(db, auditWriter)}

	branches := v1.Group("/branches/:branch_id")

	branches.POST("/claims",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.create"),
		h.createDraftFromSale,
	)
	branches.GET("/claims",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.list"),
		h.list,
	)
	branches.GET("/claims/:id",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.view"),
		h.get,
	)
	branches.POST("/claims/:id/submit",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.submit"),
		h.submit,
	)
	branches.POST("/claims/:id/adjudicate",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.adjudicate"),
		h.adjudicate,
	)
	branches.POST("/claims/:id/mark-paid",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("claims.mark_paid"),
		h.markPaid,
	)
}

type createClaimBody struct {
	SaleID string `json:"sale_id"`
	PlanID string `json:"plan_id"`
}

func (h *ClaimHandler) createDraftFromSale(c *gin.Context) {
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}
	branchID, ok := requireBranchIDMatch(c)
	if !ok {
		return
	}

	var body createClaimBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	saleID, err := uuid.Parse(strings.TrimSpace(body.SaleID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	planID, err := uuid.Parse(strings.TrimSpace(body.PlanID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	row, err := h.svc.CreateDraftFromSale(c.Request.Context(), claimsapp.Actor{
		TenantID: pr.TenantID,
		BranchID: branchID,
		UserID:   &pr.UserID,
	}, saleID, planID)
	if err != nil {
		writeClaimError(c, err)
		return
	}

	c.JSON(http.StatusCreated, row)
}

func (h *ClaimHandler) submit(c *gin.Context) {
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}
	branchID, ok := requireBranchIDMatch(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	row, err := h.svc.Submit(c.Request.Context(), claimsapp.Actor{
		TenantID: pr.TenantID,
		BranchID: branchID,
		UserID:   &pr.UserID,
	}, id)
	if err != nil {
		writeClaimError(c, err)
		return
	}
	c.JSON(http.StatusOK, row)
}

type adjudicateBody struct {
	Status              string  `json:"status"` // approved|rejected
	ApprovedAmountCents *int64  `json:"approved_amount_cents"`
	RejectionReason     *string `json:"rejection_reason"`
}

func (h *ClaimHandler) adjudicate(c *gin.Context) {
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}
	branchID, ok := requireBranchIDMatch(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var body adjudicateBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	status := strings.TrimSpace(strings.ToLower(body.Status))
	var target claimsapp.Status
	switch status {
	case "approved":
		target = claimsapp.StatusApproved
	case "rejected":
		target = claimsapp.StatusRejected
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	row, err := h.svc.Adjudicate(c.Request.Context(), claimsapp.Actor{
		TenantID: pr.TenantID,
		BranchID: branchID,
		UserID:   &pr.UserID,
	}, id, claimsapp.Adjudication{
		Status:              target,
		ApprovedAmountCents: body.ApprovedAmountCents,
		RejectionReason:     body.RejectionReason,
	})
	if err != nil {
		writeClaimError(c, err)
		return
	}

	c.JSON(http.StatusOK, row)
}

func (h *ClaimHandler) markPaid(c *gin.Context) {
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}
	branchID, ok := requireBranchIDMatch(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	row, err := h.svc.MarkPaid(c.Request.Context(), claimsapp.Actor{
		TenantID: pr.TenantID,
		BranchID: branchID,
		UserID:   &pr.UserID,
	}, id)
	if err != nil {
		writeClaimError(c, err)
		return
	}
	c.JSON(http.StatusOK, row)
}

func (h *ClaimHandler) get(c *gin.Context) {
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}
	branchID, ok := requireBranchIDMatch(c)
	if !ok {
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	row, err := h.svc.Get(c.Request.Context(), pr.TenantID, branchID, id)
	if err != nil {
		writeClaimError(c, err)
		return
	}
	c.JSON(http.StatusOK, row)
}

func (h *ClaimHandler) list(c *gin.Context) {
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}
	branchID, ok := requireBranchIDMatch(c)
	if !ok {
		return
	}

	rows, err := h.svc.List(c.Request.Context(), pr.TenantID, branchID)
	if err != nil {
		writeClaimError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func branchIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	raw := strings.TrimSpace(c.GetString(branchctx.ContextKey))
	if raw == "" {
		return uuid.Nil, false
	}
	branchID, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, false
	}
	return branchID, true
}

func requireBranchIDMatch(c *gin.Context) (uuid.UUID, bool) {
	paramRaw := strings.TrimSpace(c.Param(branchctx.PathParamKey))
	paramID, err := uuid.Parse(paramRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return uuid.Nil, false
	}

	ctxID, ok := branchIDFromContext(c)
	if !ok || ctxID != paramID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
		return uuid.Nil, false
	}

	return paramID, true
}

func writeClaimError(c *gin.Context, err error) {
	switch err {
	case claimsapp.ErrNotFound:
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
	case claimsapp.ErrInvalidInput:
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
	case claimsapp.ErrInvalidState:
		c.JSON(http.StatusConflict, gin.H{"error": "INVALID_STATE"})
	default:
		if errors.Is(err, claimsapp.ErrNoDatabase) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
			return
		}
		if errors.Is(err, gorm.ErrInvalidDB) {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
	}
}
