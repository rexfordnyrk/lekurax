package http

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/rbac"
)

type PrescriptionReportHandler struct {
	db *gorm.DB
}

func RegisterPrescriptionReportRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, _ *audit.Writer, authzClient *authzkit.Client) {
	h := &PrescriptionReportHandler{db: db}

	branches := v1.Group("/branches/:branch_id")
	branches.GET("/reports/prescriptions/volume",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("reports.view"),
		h.volume,
	)
}

type rxStatusCountRow struct {
	Status string `gorm:"column:status"`
	Count  int64  `gorm:"column:count"`
}

func (h *PrescriptionReportHandler) volume(c *gin.Context) {
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

	var rows []rxStatusCountRow
	err := h.db.WithContext(c.Request.Context()).
		Raw(
			`SELECT status, COUNT(*) AS count
			FROM prescriptions
			WHERE tenant_id = ? AND branch_id = ? AND created_at >= ? AND created_at < ?
			GROUP BY status
			ORDER BY status ASC`,
			pr.TenantID, branchID, from, to,
		).
		Scan(&rows).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	breakdown := make([]gin.H, 0, len(rows))
	var total int64
	for _, r := range rows {
		total += r.Count
		breakdown = append(breakdown, gin.H{
			"status": r.Status,
			"count":  r.Count,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"branch_id": branchID.String(),
		"from":      from.Format(time.RFC3339),
		"to":        to.Format(time.RFC3339),
		"metrics": gin.H{
			"total_count": total,
		},
		"by_status": breakdown,
	})
}

