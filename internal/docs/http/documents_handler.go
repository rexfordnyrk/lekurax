package http

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
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
	"lekurax/internal/docs/infra"
	"lekurax/internal/rbac"
)

const (
	defaultDocumentsBaseDir       = "./tmp/documents"
	maxUploadBytes          int64 = 10 << 20 // 10MiB
	maxUploadOverheadBytes  int64 = 1 << 20  // 1MiB
)

type DocumentsHandler struct {
	db    *gorm.DB
	audit *audit.Writer
	authz *authzkit.Client
	store *infra.LocalStorage
}

func RegisterDocumentRoutes(v1 *gin.RouterGroup, db *gorm.DB, verifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) {
	baseDir := strings.TrimSpace(os.Getenv("LEKURAX_DOCUMENTS_BASE_DIR"))
	if baseDir == "" {
		baseDir = defaultDocumentsBaseDir
	}
	store, err := infra.NewLocalStorage(baseDir)
	if err != nil {
		// If storage can't init, still register routes but they will return NO_STORAGE.
		store = nil
	}

	h := &DocumentsHandler{db: db, audit: auditWriter, authz: authzClient, store: store}

	v1.POST("/documents",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("documents.upload"),
		h.upload,
	)
	v1.GET("/documents",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("documents.view"),
		h.list,
	)
	v1.GET("/documents/:id",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("documents.view"),
		h.get,
	)
	v1.GET("/documents/:id/content",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		rbac.RequirePermission("documents.view"),
		h.getContent,
	)
}

type Document struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey"`
	TenantID    uuid.UUID  `json:"tenant_id" gorm:"type:uuid;not null;index"`
	BranchID    *uuid.UUID `json:"branch_id,omitempty" gorm:"type:uuid;index"`
	OwnerUserID *uuid.UUID `json:"owner_user_id,omitempty" gorm:"type:uuid;index"`
	Kind        string     `json:"kind" gorm:"type:text;not null;index"`
	Filename    string     `json:"filename" gorm:"type:text;not null"`
	ContentType string     `json:"content_type" gorm:"type:text;not null"`
	StoragePath string     `json:"-" gorm:"type:text;not null"`
	CreatedAt   time.Time  `json:"created_at" gorm:"type:timestamptz;not null"`
}

func (Document) TableName() string { return "documents" }

type uploadResponse struct {
	Document Document `json:"document"`
}

func (h *DocumentsHandler) upload(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}
	if h.store == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_STORAGE"})
		return
	}

	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	// Cap request size before any multipart/form parsing.
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadBytes+maxUploadOverheadBytes)

	kind := strings.TrimSpace(c.PostForm("kind"))
	if kind == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "KIND_REQUIRED"})
		return
	}

	var contextBranchID *uuid.UUID
	if raw := strings.TrimSpace(c.GetString(branchctx.ContextKey)); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err == nil && parsed != uuid.Nil {
			contextBranchID = &parsed
		}
	}

	var branchID *uuid.UUID
	if s := strings.TrimSpace(c.PostForm("branch_id")); s != "" {
		parsed, err := uuid.Parse(s)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH_ID"})
			return
		}
		if contextBranchID != nil && parsed != *contextBranchID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH_ID"})
			return
		}
		branchID = &parsed
	}
	if contextBranchID != nil {
		// If a branch context is required (non-admin), force the document branch_id to match.
		// If a branch context is merely present (admin), forbid mismatch to avoid cross-branch upload confusion.
		if branchID == nil {
			branchID = contextBranchID
		} else if *branchID != *contextBranchID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH_ID"})
			return
		}
	}

	ownerUserID := pr.UserID
	if s := strings.TrimSpace(c.PostForm("owner_user_id")); s != "" {
		parsed, err := uuid.Parse(s)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_OWNER_USER_ID"})
			return
		}
		if parsed != pr.UserID && !isTenantAdmin(pr) {
			c.JSON(http.StatusForbidden, gin.H{"error": "FORBIDDEN"})
			return
		}
		ownerUserID = parsed
	}

	fh, err := c.FormFile("file")
	if err != nil {
		// When the request exceeds MaxBytesReader limit, multipart parsing fails with a generic error.
		if strings.Contains(strings.ToLower(err.Error()), "request body too large") {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "FILE_TOO_LARGE", "max_bytes": maxUploadBytes})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "FILE_REQUIRED"})
		return
	}
	if fh.Size <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "EMPTY_FILE"})
		return
	}
	if fh.Size > maxUploadBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "FILE_TOO_LARGE", "max_bytes": maxUploadBytes})
		return
	}

	file, err := fh.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_FILE"})
		return
	}
	defer func() { _ = file.Close() }()

	sniff, fileReader, sniffedCT, err := sniffContentType(file)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_FILE"})
		return
	}
	_ = sniff
	if !allowedContentType(sniffedCT) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "UNSUPPORTED_CONTENT_TYPE", "content_type": sniffedCT})
		return
	}

	docID := uuid.New()
	now := time.Now().UTC()

	storagePath, err := h.store.Put(c.Request.Context(), pr.TenantID, branchID, docID, fileReader, maxUploadBytes)
	if err != nil {
		if errors.Is(err, infra.ErrTooLarge) {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "FILE_TOO_LARGE", "max_bytes": maxUploadBytes})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "STORAGE_ERROR"})
		return
	}

	doc := Document{
		ID:          docID,
		TenantID:    pr.TenantID,
		BranchID:    branchID,
		OwnerUserID: &ownerUserID,
		Kind:        kind,
		Filename:    sanitizeFilename(fh.Filename),
		ContentType: sniffedCT,
		StoragePath: storagePath,
		CreatedAt:   now,
	}

	if err := h.db.WithContext(c.Request.Context()).Create(&doc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	logAudit(c, h.audit, "document.uploaded", "document", &doc.ID, map[string]any{
		"document_id":   doc.ID.String(),
		"kind":          doc.Kind,
		"filename":      doc.Filename,
		"branch_id":     func() any { if branchID == nil || *branchID == uuid.Nil { return nil }; return branchID.String() }(),
		"owner_user_id": ownerUserID.String(),
		"content_type":  doc.ContentType,
		"size_bytes":    fh.Size,
	})

	c.JSON(http.StatusCreated, uploadResponse{Document: doc})
}

func (h *DocumentsHandler) get(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var doc Document
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ?", id, pr.TenantID).
		First(&doc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	c.JSON(http.StatusOK, doc)
}

func (h *DocumentsHandler) getContent(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}
	if h.store == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_STORAGE"})
		return
	}
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_ID"})
		return
	}

	var doc Document
	if err := h.db.WithContext(c.Request.Context()).
		Where("id = ? AND tenant_id = ?", id, pr.TenantID).
		First(&doc).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}

	f, err := h.store.Open(doc.StoragePath)
	if err != nil {
		if errors.Is(err, infra.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "NOT_FOUND"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "STORAGE_ERROR"})
		return
	}
	defer func() { _ = f.Close() }()

	stat, err := f.Stat()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "STORAGE_ERROR"})
		return
	}

	c.Header("Content-Type", doc.ContentType)
	c.Header("Content-Disposition", "inline; filename="+strconv.Quote(doc.Filename))
	c.DataFromReader(http.StatusOK, stat.Size(), doc.ContentType, f, nil)
}

func (h *DocumentsHandler) list(c *gin.Context) {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "NO_DATABASE"})
		return
	}
	pr := auth.GetPrincipal(c)
	if pr == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
		return
	}

	kind := strings.TrimSpace(c.Query("kind"))
	var branchID *uuid.UUID
	if s := strings.TrimSpace(c.Query("branch_id")); s != "" {
		parsed, err := uuid.Parse(s)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_BRANCH_ID"})
			return
		}
		branchID = &parsed
	}

	limit := 50
	if s := strings.TrimSpace(c.Query("limit")); s != "" {
		v, err := strconv.Atoi(s)
		if err != nil || v <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "INVALID_LIMIT"})
			return
		}
		if v > 200 {
			v = 200
		}
		limit = v
	}

	q := h.db.WithContext(c.Request.Context()).Model(&Document{}).Where("tenant_id = ?", pr.TenantID)
	if kind != "" {
		q = q.Where("kind = ?", kind)
	}
	if branchID != nil {
		q = q.Where("branch_id = ?", *branchID)
	}

	var rows []Document
	if err := q.Order("created_at DESC").Limit(limit).Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB_ERROR"})
		return
	}
	if rows == nil {
		rows = []Document{}
	}
	c.JSON(http.StatusOK, gin.H{"items": rows})
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

func sniffContentType(f multipart.File) (sniff []byte, r io.Reader, ct string, err error) {
	buf := make([]byte, 512)
	n, readErr := io.ReadFull(f, buf)
	if readErr != nil && !errors.Is(readErr, io.ErrUnexpectedEOF) && !errors.Is(readErr, io.EOF) {
		return nil, nil, "", readErr
	}
	sniff = buf[:n]
	ct = http.DetectContentType(sniff)
	r = io.MultiReader(bytes.NewReader(sniff), f)
	return sniff, r, ct, nil
}

func allowedContentType(ct string) bool {
	ct = strings.ToLower(strings.TrimSpace(ct))
	switch ct {
	case "application/pdf",
		"image/png",
		"image/jpeg",
		"image/gif",
		"image/webp",
		"text/plain; charset=utf-8",
		"text/plain",
		"text/csv; charset=utf-8",
		"text/csv":
		return true
	default:
		// Accept some common "unknown but safe-ish" types explicitly if needed later.
		return false
	}
}

func sanitizeFilename(name string) string {
	n := strings.TrimSpace(name)
	if n == "" {
		return "upload"
	}
	n = filepath.Base(n)
	n = strings.ReplaceAll(n, string(os.PathSeparator), "_")
	n = strings.ReplaceAll(n, "/", "_")
	return n
}
