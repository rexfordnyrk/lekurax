package http

import (
	"encoding/json"
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
	"lekurax/internal/branchctx"
	"lekurax/internal/rbac"
)

type IncidentsHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
}

func RegisterIncidentRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	h := &IncidentsHandler{db: db, audit: auditWriter, authz: authzClient}

	base := "/branches/:branch_id/incidents"

	v1.POST(base,
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("quality.incidents.create"),
		h.createIncident,
	)
	v1.GET(base,
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("quality.incidents.view"),
		h.listIncidents,
	)
	v1.POST(base+"/:id/capa",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		branchctx.RequireBranchContext(),
		requireConsistentBranchParam(),
		rbac.RequirePermission("quality.capa.manage"),
		h.createCAPAAction,
	)
}

type IncidentStatus string

const (
	IncidentStatusOpen          IncidentStatus = "open"
	IncidentStatusInvestigating IncidentStatus = "investigating"
	IncidentStatusClosed        IncidentStatus = "closed"
)

type IncidentKind string

const (
	IncidentKindMedError     IncidentKind = "med_error"
	IncidentKindAdverseEvent IncidentKind = "adverse_event"
	IncidentKindSecurity     IncidentKind = "security"
	IncidentKindGeneral      IncidentKind = "general"
)

type IncidentSeverity string

const (
	IncidentSeverityLow      IncidentSeverity = "low"
	IncidentSeverityMedium   IncidentSeverity = "medium"
	IncidentSeverityHigh     IncidentSeverity = "high"
	IncidentSeverityCritical IncidentSeverity = "critical"
)

type Incident struct {
	ID               uuid.UUID        `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID         uuid.UUID        `json:"tenant_id" gorm:"type:uuid;not null;index"`
	BranchID         uuid.UUID        `json:"branch_id" gorm:"type:uuid;not null;index"`
	Kind             IncidentKind     `json:"kind" gorm:"type:text;not null"`
	Severity         IncidentSeverity `json:"severity" gorm:"type:text;not null"`
	Description      string           `json:"description" gorm:"type:text;not null"`
	Status           IncidentStatus   `json:"status" gorm:"type:text;not null"`
	ReportedByUserID *uuid.UUID       `json:"reported_by_user_id" gorm:"type:uuid;index"`
	CreatedAt        time.Time        `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (Incident) TableName() string { return "incidents" }

type CAPAStatus string

const (
	CAPAStatusOpen CAPAStatus = "open"
	CAPAStatusDone CAPAStatus = "done"
)

type CAPAAction struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID  `json:"tenant_id" gorm:"type:uuid;not null;index"`
	IncidentID  uuid.UUID  `json:"incident_id" gorm:"type:uuid;not null;index"`
	Action      string     `json:"action" gorm:"type:text;not null"`
	OwnerUserID *uuid.UUID `json:"owner_user_id" gorm:"type:uuid;index"`
	DueOn       *string    `json:"due_on" gorm:"type:date"`
	Status      CAPAStatus `json:"status" gorm:"type:text;not null"`
	CreatedAt   time.Time  `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (CAPAAction) TableName() string { return "capa_actions" }

type createIncidentBody struct {
	Kind        string `json:"kind"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
}

func (h *IncidentsHandler) createIncident(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	var body createIncidentBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	kind, ok := parseIncidentKind(body.Kind)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	severity, ok := parseIncidentSeverity(body.Severity)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	desc := strings.TrimSpace(body.Description)
	if desc == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	now := time.Now().UTC()
	uid := pr.UserID
	row := Incident{
		ID:               uuid.New(),
		TenantID:         pr.TenantID,
		BranchID:         mustBranchID(c),
		Kind:             kind,
		Severity:         severity,
		Description:      desc,
		Status:           IncidentStatusOpen,
		ReportedByUserID: &uid,
		CreatedAt:        now,
	}

	if err := h.db.WithContext(c.Request.Context()).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAuditBranch(c, h.audit, "incident.created", "incident", &row.ID, map[string]any{
		"kind":      string(row.Kind),
		"severity":  string(row.Severity),
		"status":    string(row.Status),
		"branch_id": row.BranchID.String(),
	})
	c.JSON(http.StatusCreated, row)
}

func (h *IncidentsHandler) listIncidents(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	tid := tenantIDFromPrincipal(c)
	bid := mustBranchID(c)
	if tid == uuid.Nil || bid == uuid.Nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	var (
		status   *IncidentStatus
		kind     *IncidentKind
		severity *IncidentSeverity
		limit    = 50
	)

	if raw := strings.TrimSpace(c.Query("status")); raw != "" {
		s, ok := parseIncidentStatus(raw)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
			return
		}
		status = &s
	}
	if raw := strings.TrimSpace(c.Query("kind")); raw != "" {
		k, ok := parseIncidentKind(raw)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
			return
		}
		kind = &k
	}
	if raw := strings.TrimSpace(c.Query("severity")); raw != "" {
		s, ok := parseIncidentSeverity(raw)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
			return
		}
		severity = &s
	}
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
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
		Model(&Incident{}).
		Where("tenant_id = ? AND branch_id = ?", tid, bid).
		Order("created_at DESC").
		Limit(limit)

	if status != nil {
		q = q.Where("status = ?", string(*status))
	}
	if kind != nil {
		q = q.Where("kind = ?", string(*kind))
	}
	if severity != nil {
		q = q.Where("severity = ?", string(*severity))
	}

	var rows []Incident
	if err := q.Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Incident{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
}

type createCAPABody struct {
	Action      string  `json:"action"`
	OwnerUserID *string `json:"owner_user_id"`
	DueOn       *string `json:"due_on"`
}

type capaActionRow struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	IncidentID  uuid.UUID  `json:"incident_id"`
	Action      string     `json:"action"`
	OwnerUserID *uuid.UUID `json:"owner_user_id"`
	DueOn       *string    `json:"due_on"`
	Status      CAPAStatus `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
}

func (h *IncidentsHandler) createCAPAAction(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	incidentID, err := uuid.Parse(c.Param("id"))
	if err != nil || incidentID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var body createCAPABody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}
	action := strings.TrimSpace(body.Action)
	if action == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
		return
	}

	var ownerID *uuid.UUID
	if body.OwnerUserID != nil {
		raw := strings.TrimSpace(*body.OwnerUserID)
		if raw != "" {
			oid, err := uuid.Parse(raw)
			if err != nil || oid == uuid.Nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
				return
			}
			ownerID = &oid
		}
	}

	var dueOn *string
	if body.DueOn != nil {
		raw := strings.TrimSpace(*body.DueOn)
		if raw != "" {
			if _, err := time.Parse("2006-01-02", raw); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_INPUT"})
				return
			}
			dueOn = &raw
		}
	}

	tid := pr.TenantID
	bid := mustBranchID(c)

	var incidentCount int64
	if err := h.db.WithContext(c.Request.Context()).
		Model(&Incident{}).
		Where("id = ? AND tenant_id = ? AND branch_id = ?", incidentID, tid, bid).
		Count(&incidentCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if incidentCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
		return
	}

	now := time.Now().UTC()
	row := CAPAAction{
		ID:          uuid.New(),
		TenantID:    tid,
		IncidentID:  incidentID,
		Action:      action,
		OwnerUserID: ownerID,
		DueOn:       dueOn,
		Status:      CAPAStatusOpen,
		CreatedAt:   now,
	}

	if err := h.db.WithContext(c.Request.Context()).Create(&row).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAuditBranch(c, h.audit, "capa.created", "capa_action", &row.ID, map[string]any{
		"incident_id": row.IncidentID.String(),
		"branch_id":   bid.String(),
	})

	out := capaActionRow{
		ID:          row.ID,
		TenantID:    row.TenantID,
		IncidentID:  row.IncidentID,
		Action:      row.Action,
		OwnerUserID: row.OwnerUserID,
		DueOn:       row.DueOn,
		Status:      row.Status,
		CreatedAt:   row.CreatedAt,
	}
	c.JSON(http.StatusCreated, out)
}

func parseIncidentStatus(raw string) (IncidentStatus, bool) {
	v := strings.TrimSpace(strings.ToLower(raw))
	switch v {
	case string(IncidentStatusOpen):
		return IncidentStatusOpen, true
	case string(IncidentStatusInvestigating):
		return IncidentStatusInvestigating, true
	case string(IncidentStatusClosed):
		return IncidentStatusClosed, true
	default:
		return "", false
	}
}

func parseIncidentKind(raw string) (IncidentKind, bool) {
	v := strings.TrimSpace(strings.ToLower(raw))
	switch v {
	case string(IncidentKindMedError):
		return IncidentKindMedError, true
	case string(IncidentKindAdverseEvent):
		return IncidentKindAdverseEvent, true
	case string(IncidentKindSecurity):
		return IncidentKindSecurity, true
	case string(IncidentKindGeneral):
		return IncidentKindGeneral, true
	default:
		return "", false
	}
}

func parseIncidentSeverity(raw string) (IncidentSeverity, bool) {
	v := strings.TrimSpace(strings.ToLower(raw))
	switch v {
	case string(IncidentSeverityLow):
		return IncidentSeverityLow, true
	case string(IncidentSeverityMedium):
		return IncidentSeverityMedium, true
	case string(IncidentSeverityHigh):
		return IncidentSeverityHigh, true
	case string(IncidentSeverityCritical):
		return IncidentSeverityCritical, true
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
