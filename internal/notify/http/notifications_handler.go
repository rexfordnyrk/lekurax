package http

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"lekurax/internal/auth"
	"lekurax/internal/rbac"
)

type NotificationsHandler struct {
	db *gorm.DB
}

func RegisterNotificationRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier) {
	h := &NotificationsHandler{db: db}

	v1.GET("/notifications",
		auth.RequireAuth(verifier),
		rbac.RequirePermission("notifications.view"),
		h.listNotifications,
	)
	v1.POST("/notifications/:id/read",
		auth.RequireAuth(verifier),
		rbac.RequirePermission("notifications.manage"),
		h.markRead,
	)
}

type Notification struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID  uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	Channel   string    `json:"channel" gorm:"type:text;not null"`
	Title     string    `json:"title" gorm:"type:text;not null"`
	Message   string    `json:"message" gorm:"type:text;not null"`
	Status    string    `json:"status" gorm:"type:text;not null"`
	CreatedAt time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (Notification) TableName() string { return "notifications" }

func (h *NotificationsHandler) listNotifications(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	status := strings.TrimSpace(c.Query("status"))
	if status != "" && status != "unread" && status != "read" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	limit := 50
	if raw := c.Query("limit"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
			return
		}
		if n > 200 {
			n = 200
		}
		limit = n
	}

	q := h.db.WithContext(c.Request.Context()).
		Model(&Notification{}).
		Where("tenant_id = ? AND user_id = ?", pr.TenantID, pr.UserID)
	if status != "" {
		q = q.Where("status = ?", status)
	}

	var rows []Notification
	if err := q.Order("created_at DESC").Limit(limit).Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Notification{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

func (h *NotificationsHandler) markRead(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	notificationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	result := h.db.WithContext(c.Request.Context()).
		Model(&Notification{}).
		Where("id = ? AND tenant_id = ? AND user_id = ?", notificationID, pr.TenantID, pr.UserID).
		Update("status", "read")
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

