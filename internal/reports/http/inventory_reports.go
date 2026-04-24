package http

import (
	"net/http"
	"strconv"
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

type InventoryReportHandler struct {
	db *gorm.DB
}

func RegisterInventoryReportRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, _ *audit.Writer, authzClient *authzkit.Client) {
	h := &InventoryReportHandler{db: db}

	branches := v1.Group("/branches/:branch_id")
	branches.GET("/reports/inventory/near-expiry",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("reports.view"),
		h.nearExpiry,
	)
}

type nearExpiryRow struct {
	ID             uuid.UUID `gorm:"column:id"`
	ProductID      uuid.UUID `gorm:"column:product_id"`
	ProductName    string    `gorm:"column:product_name"`
	BatchNo        string    `gorm:"column:batch_no"`
	ExpiresOn      time.Time `gorm:"column:expires_on"`
	QuantityOnHand int64     `gorm:"column:quantity_on_hand"`
}

func (h *InventoryReportHandler) nearExpiry(c *gin.Context) {
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}
	branchID, ok := requireBranchIDMatch(c)
	if !ok {
		return
	}

	days := 30
	if raw := strings.TrimSpace(c.Query("days")); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_DAYS"})
			return
		}
		if n > 365 {
			n = 365
		}
		days = n
	}

	now := time.Now().UTC()
	limit := now.AddDate(0, 0, days)

	var rows []nearExpiryRow
	err := h.db.WithContext(c.Request.Context()).
		Raw(
			`SELECT
				sb.id,
				sb.product_id,
				p.name AS product_name,
				sb.batch_no,
				sb.expires_on,
				sb.quantity_on_hand
			FROM stock_batches sb
			JOIN products p ON p.id = sb.product_id AND p.tenant_id = sb.tenant_id
			WHERE sb.tenant_id = ? AND sb.branch_id = ? AND sb.expires_on IS NOT NULL AND sb.expires_on <= ? AND sb.quantity_on_hand > 0
			ORDER BY sb.expires_on ASC, p.name ASC`,
			pr.TenantID, branchID, limit,
		).
		Scan(&rows).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	items := make([]gin.H, 0, len(rows))
	var totalQty int64
	for _, r := range rows {
		totalQty += r.QuantityOnHand
		daysUntil := int64(r.ExpiresOn.Sub(now).Hours() / 24)
		if daysUntil < 0 {
			daysUntil = 0
		}
		items = append(items, gin.H{
			"stock_batch_id":    r.ID.String(),
			"product_id":        r.ProductID.String(),
			"product_name":      r.ProductName,
			"batch_no":          r.BatchNo,
			"expires_on":        r.ExpiresOn.Format("2006-01-02"),
			"quantity_on_hand":  r.QuantityOnHand,
			"days_until_expiry": daysUntil,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"branch_id": branchID.String(),
		"days":      days,
		"as_of":     now.Format(time.RFC3339),
		"summary": gin.H{
			"items":          len(items),
			"total_quantity": totalQty,
		},
		"items": items,
	})
}

