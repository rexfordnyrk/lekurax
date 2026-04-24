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
	"lekurax/internal/rbac"
)

type CoursesHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterCourseRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &CoursesHandler{db: db, audit: auditWriter, authz: authzClient}

	training := v1.Group("/training")

	training.POST("/courses",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("training.courses.manage"),
		h.createCourse,
	)
	training.GET("/courses",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("training.courses.view"),
		h.listCourses,
	)
	training.POST("/courses/:id/assign",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("training.assign.manage"),
		h.assignCourse,
	)
	training.POST("/courses/:id/complete",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("training.complete.manage"),
		h.completeCourse,
	)
}

type Course struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	Title       string    `json:"title" gorm:"type:text;not null"`
	Description *string   `json:"description" gorm:"type:text"`
	IsMandatory bool      `json:"is_mandatory" gorm:"type:boolean;not null"`
	CreatedAt   time.Time `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (Course) TableName() string { return "courses" }

type CourseAssignment struct {
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID   uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	CourseID   uuid.UUID `json:"course_id" gorm:"type:uuid;not null;index"`
	UserID     uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	AssignedAt time.Time `json:"assigned_at" gorm:"type:timestamptz;not null"`
}

func (CourseAssignment) TableName() string { return "course_assignments" }

type CourseCompletion struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID `json:"tenant_id" gorm:"type:uuid;not null;index"`
	CourseID    uuid.UUID `json:"course_id" gorm:"type:uuid;not null;index"`
	UserID      uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	CompletedAt time.Time `json:"completed_at" gorm:"type:timestamptz;not null"`
}

func (CourseCompletion) TableName() string { return "course_completions" }

type createCourseBody struct {
	Title       string  `json:"title"`
	Description *string `json:"description"`
	IsMandatory *bool   `json:"is_mandatory"`
}

func (h *CoursesHandler) createCourse(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	var body createCourseBody
	if err := c.ShouldBindJSON(&body); err != nil || strings.TrimSpace(body.Title) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	now := time.Now().UTC()
	row := Course{
		ID:          uuid.New(),
		TenantID:    tenantID(c),
		Title:       strings.TrimSpace(body.Title),
		Description: trimPtr(body.Description),
		IsMandatory: body.IsMandatory != nil && *body.IsMandatory,
		CreatedAt:   now,
	}

	if err := h.db.WithContext(c.Request.Context()).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAudit(c, h.audit, "course.created", "course", &row.ID, map[string]any{
		"title":        row.Title,
		"is_mandatory": row.IsMandatory,
	})
	c.JSON(http.StatusCreated, row)
}

func (h *CoursesHandler) listCourses(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	var rows []Course
	if err := h.db.WithContext(c.Request.Context()).
		Where("tenant_id = ?", tenantID(c)).
		Order("created_at DESC").
		Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Course{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

type assignCourseBody struct {
	UserID uuid.UUID `json:"user_id"`
}

func (h *CoursesHandler) assignCourse(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	courseID, err := uuid.Parse(c.Param("id"))
	if err != nil || courseID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var body assignCourseBody
	if err := c.ShouldBindJSON(&body); err != nil || body.UserID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	tid := tenantID(c)
	ctx := c.Request.Context()

	var courseCount int64
	if err := h.db.WithContext(ctx).
		Model(&Course{}).
		Where("id = ? AND tenant_id = ?", courseID, tid).
		Count(&courseCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if courseCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	var existing CourseAssignment
	if err := h.db.WithContext(ctx).
		Where("tenant_id = ? AND course_id = ? AND user_id = ?", tid, courseID, body.UserID).
		First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing)
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	now := time.Now().UTC()
	row := CourseAssignment{
		ID:         uuid.New(),
		TenantID:   tid,
		CourseID:   courseID,
		UserID:     body.UserID,
		AssignedAt: now,
	}
	if err := h.db.WithContext(ctx).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAudit(c, h.audit, "course.assigned", "course_assignment", &row.ID, map[string]any{
		"course_id": courseID.String(),
		"user_id":   body.UserID.String(),
	})
	c.JSON(http.StatusCreated, row)
}

func (h *CoursesHandler) completeCourse(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	courseID, err := uuid.Parse(c.Param("id"))
	if err != nil || courseID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	// Accept empty body; keep shape stable for clients.
	_ = c.ShouldBindJSON(&struct{}{})

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	tid := pr.TenantID
	uid := pr.UserID
	ctx := c.Request.Context()

	var courseCount int64
	if err := h.db.WithContext(ctx).
		Model(&Course{}).
		Where("id = ? AND tenant_id = ?", courseID, tid).
		Count(&courseCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if courseCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	var existing CourseCompletion
	if err := h.db.WithContext(ctx).
		Where("tenant_id = ? AND course_id = ? AND user_id = ?", tid, courseID, uid).
		First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing)
		return
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	now := time.Now().UTC()
	row := CourseCompletion{
		ID:          uuid.New(),
		TenantID:    tid,
		CourseID:    courseID,
		UserID:      uid,
		CompletedAt: now,
	}
	if err := h.db.WithContext(ctx).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAudit(c, h.audit, "course.completed", "course_completion", &row.ID, map[string]any{
		"course_id": courseID.String(),
		"user_id":   uid.String(),
	})
	c.JSON(http.StatusCreated, row)
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
	pr := auth.GetPrincipal(c)
	if pr == nil {
		return uuid.Nil
	}
	return pr.TenantID
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

