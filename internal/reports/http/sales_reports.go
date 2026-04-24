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
	"lekurax/internal/branchctx"
	"lekurax/internal/rbac"
)

type SalesReportHandler struct {
	db    *gorm.DB
	authz *authzkit.Client
}

func RegisterSalesReportRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, _ *audit.Writer, authzClient *authzkit.Client) {
	h := &SalesReportHandler{db: db, authz: authzClient}

	branches := v1.Group("/branches/:branch_id")
	branches.GET("/reports/sales/summary",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("reports.view"),
		h.branchSalesSummary,
	)

	v1.GET("/reports/sales/summary",
		auth.RequireAuth(verifier),
		rbac.RequirePermission("reports.view"),
		h.dashboardSalesSummary,
	)
}

type salesSummaryRow struct {
	SaleCount     int64 `gorm:"column:sale_count"`
	SubtotalCents int64 `gorm:"column:subtotal_cents"`
	TaxCents      int64 `gorm:"column:tax_cents"`
	TotalCents    int64 `gorm:"column:total_cents"`
}

func (h *SalesReportHandler) branchSalesSummary(c *gin.Context) {
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}
	branchID, ok := requireBranchIDMatch(c)
	if !ok {
		return
	}
	from, to, ok := parseTimeRangeQuery(c)
	if !ok {
		return
	}

	var row salesSummaryRow
	err := h.db.WithContext(c.Request.Context()).
		Raw(
			`SELECT
				COUNT(*) AS sale_count,
				COALESCE(SUM(subtotal_cents), 0) AS subtotal_cents,
				COALESCE(SUM(tax_cents), 0) AS tax_cents,
				COALESCE(SUM(total_cents), 0) AS total_cents
			FROM sales
			WHERE tenant_id = ? AND branch_id = ? AND created_at >= ? AND created_at < ?`,
			pr.TenantID, branchID, from, to,
		).
		Scan(&row).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"branch_id": branchID.String(),
		"from":      from.Format(time.RFC3339),
		"to":        to.Format(time.RFC3339),
		"metrics": gin.H{
			"sale_count":      row.SaleCount,
			"subtotal_cents":  row.SubtotalCents,
			"tax_cents":       row.TaxCents,
			"total_cents":     row.TotalCents,
			"currency_hint":   "USD",
			"avg_total_cents": avgCents(row.TotalCents, row.SaleCount),
		},
	})
}

type salesSummaryByBranchRow struct {
	BranchID      uuid.UUID `gorm:"column:branch_id"`
	SaleCount     int64     `gorm:"column:sale_count"`
	SubtotalCents int64     `gorm:"column:subtotal_cents"`
	TaxCents      int64     `gorm:"column:tax_cents"`
	TotalCents    int64     `gorm:"column:total_cents"`
}

func (h *SalesReportHandler) dashboardSalesSummary(c *gin.Context) {
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	from, to, ok := parseTimeRangeQuery(c)
	if !ok {
		return
	}

	rawBranchIDs := c.QueryArray(branchctx.QueryParamKey)
	branchIDs := make([]uuid.UUID, 0, len(rawBranchIDs))
	for _, s := range rawBranchIDs {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		id, err := uuid.Parse(s)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH"})
			return
		}
		branchIDs = append(branchIDs, id)
	}
	if len(branchIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "BRANCH_REQUIRED"})
		return
	}

	if !isTenantAdmin(pr) {
		if h.authz == nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "AUTHZ_UNAVAILABLE"})
			return
		}
		for _, bid := range branchIDs {
			ok, err := h.authz.UserHasBranch(c.Request.Context(), bid, pr.UserID)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{"error": "AUTHZ_UNAVAILABLE"})
				return
			}
			if !ok {
				c.JSON(http.StatusForbidden, gin.H{"error": "BRANCH_FORBIDDEN"})
				return
			}
		}
	}

	var rows []salesSummaryByBranchRow
	err := h.db.WithContext(c.Request.Context()).
		Raw(
			`SELECT
				branch_id,
				COUNT(*) AS sale_count,
				COALESCE(SUM(subtotal_cents), 0) AS subtotal_cents,
				COALESCE(SUM(tax_cents), 0) AS tax_cents,
				COALESCE(SUM(total_cents), 0) AS total_cents
			FROM sales
			WHERE tenant_id = ? AND branch_id IN ? AND created_at >= ? AND created_at < ?
			GROUP BY branch_id`,
			pr.TenantID, branchIDs, from, to,
		).
		Scan(&rows).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	byBranch := make(map[uuid.UUID]salesSummaryByBranchRow, len(rows))
	var total salesSummaryRow
	for _, r := range rows {
		byBranch[r.BranchID] = r
		total.SaleCount += r.SaleCount
		total.SubtotalCents += r.SubtotalCents
		total.TaxCents += r.TaxCents
		total.TotalCents += r.TotalCents
	}

	items := make([]gin.H, 0, len(branchIDs))
	for _, bid := range branchIDs {
		r, ok := byBranch[bid]
		if !ok {
			items = append(items, gin.H{
				"branch_id": bid.String(),
				"metrics": gin.H{
					"sale_count":      int64(0),
					"subtotal_cents":  int64(0),
					"tax_cents":       int64(0),
					"total_cents":     int64(0),
					"currency_hint":   "USD",
					"avg_total_cents": int64(0),
				},
			})
			continue
		}
		items = append(items, gin.H{
			"branch_id": bid.String(),
			"metrics": gin.H{
				"sale_count":      r.SaleCount,
				"subtotal_cents":  r.SubtotalCents,
				"tax_cents":       r.TaxCents,
				"total_cents":     r.TotalCents,
				"currency_hint":   "USD",
				"avg_total_cents": avgCents(r.TotalCents, r.SaleCount),
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"branch_ids": rawBranchIDs,
		"from":       from.Format(time.RFC3339),
		"to":         to.Format(time.RFC3339),
		"total": gin.H{
			"sale_count":      total.SaleCount,
			"subtotal_cents":  total.SubtotalCents,
			"tax_cents":       total.TaxCents,
			"total_cents":     total.TotalCents,
			"currency_hint":   "USD",
			"avg_total_cents": avgCents(total.TotalCents, total.SaleCount),
		},
		"branches": items,
	})
}

func parseTimeRangeQuery(c *gin.Context) (time.Time, time.Time, bool) {
	fromRaw := strings.TrimSpace(c.Query("from"))
	toRaw := strings.TrimSpace(c.Query("to"))
	if fromRaw == "" || toRaw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_TIME_RANGE"})
		return time.Time{}, time.Time{}, false
	}

	from, fromHasTime, err := parseDateOrRFC3339(fromRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_FROM"})
		return time.Time{}, time.Time{}, false
	}
	to, toHasTime, err := parseDateOrRFC3339(toRaw)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_TO"})
		return time.Time{}, time.Time{}, false
	}

	from = from.UTC()
	to = to.UTC()

	// If "to" is a date-only value, treat it as inclusive end-of-day by bumping 24h.
	if !toHasTime {
		to = to.Add(24 * time.Hour)
	}
	// If "from" is date-only and "to" has time, we still treat "from" as midnight UTC.
	if !fromHasTime {
		from = time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, time.UTC)
	}

	if !from.Before(to) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_TIME_RANGE"})
		return time.Time{}, time.Time{}, false
	}

	// Hard cap to prevent accidentally huge scans.
	if to.Sub(from) > 366*24*time.Hour {
		c.JSON(http.StatusBadRequest, gin.H{"error": "TIME_RANGE_TOO_LARGE"})
		return time.Time{}, time.Time{}, false
	}

	return from, to, true
}

func parseDateOrRFC3339(s string) (t time.Time, hasTime bool, err error) {
	if tt, err := time.Parse(time.RFC3339, s); err == nil {
		return tt, true, nil
	}
	tt, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, false, err
	}
	return time.Date(tt.Year(), tt.Month(), tt.Day(), 0, 0, 0, 0, time.UTC), false, nil
}

func avgCents(total int64, count int64) int64 {
	if count <= 0 {
		return 0
	}
	return total / count
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

