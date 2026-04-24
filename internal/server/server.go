package server

import (
	"net/http"
	"reflect"
	"unsafe"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/branchctx"
	claimshttp "lekurax/internal/claims/http"
)

const (
	authVerifierContextKey = "auth_verifier"
	auditWriterContextKey  = "audit_writer"
	authzClientContextKey  = "authz_client"
)

type Server struct {
	Engine *gin.Engine
}

func New(authVerifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) *Server {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(allowAllCORS())
	r.Use(ExposeDependencies(authVerifier, auditWriter, authzClient))
	r.GET("/health/live", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })

	v1 := r.Group("/api/v1")

	v1.GET("/branches/:branch_id/ping",
		auth.RequireAuth(authVerifier),
		authzkit.RequireBranchMembership(authzClient, isTenantAdmin),
		func(c *gin.Context) {
			principal := auth.GetPrincipal(c)
			c.JSON(http.StatusOK, gin.H{
				"branch_id": c.GetString(branchctx.ContextKey),
				"tenant_id": principal.TenantID.String(),
			})
		},
	)

	// Claims/insurance routes need DB access, but we intentionally keep server.New's signature unchanged.
	claimsDB := dbFromAuditWriter(auditWriter)
	claimshttp.RegisterProviderRoutes(v1, claimsDB, authVerifier, auditWriter, authzClient)
	claimshttp.RegisterPlanRoutes(v1, claimsDB, authVerifier, auditWriter, authzClient)

	return &Server{Engine: r}
}

// dbFromAuditWriter extracts the underlying *gorm.DB from audit.Writer without changing constructor signatures.
// audit.Writer intentionally keeps its DB private; this is a narrow compatibility bridge for server-level routes.
func dbFromAuditWriter(w *audit.Writer) *gorm.DB {
	if w == nil {
		return nil
	}

	rv := reflect.ValueOf(w)
	if rv.Kind() != reflect.Ptr || rv.IsNil() {
		return nil
	}
	ev := rv.Elem()
	if ev.Kind() != reflect.Struct {
		return nil
	}

	f := ev.FieldByName("db")
	if !f.IsValid() {
		return nil
	}
	if f.Kind() != reflect.Ptr {
		return nil
	}

	// Reading an unexported field requires unsafe; reflect won't allow Interface().
	// f is a *gorm.DB field value; f.Pointer() gives the underlying pointer value.
	ptr := unsafe.Pointer(f.Pointer())
	if ptr == nil {
		return nil
	}
	return (*gorm.DB)(ptr)
}

// allowAllCORS reflects the request Origin and allows typical API headers (insecure; dev / MVP).
func allowAllCORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		if o := c.GetHeader("Origin"); o != "" {
			c.Header("Access-Control-Allow-Origin", o)
			c.Header("Access-Control-Allow-Credentials", "true")
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Branch-Id")
		c.Header("Access-Control-Max-Age", "3600")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// ExposeDependencies attaches shared services to the Gin context for downstream handlers.
func ExposeDependencies(authVerifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		if authVerifier != nil {
			c.Set(authVerifierContextKey, authVerifier)
		}
		if auditWriter != nil {
			c.Set(auditWriterContextKey, auditWriter)
		}
		if authzClient != nil {
			c.Set(authzClientContextKey, authzClient)
		}
		c.Next()
	}
}

func GetAuthVerifier(c *gin.Context) *auth.Verifier {
	value, ok := c.Get(authVerifierContextKey)
	if !ok {
		return nil
	}

	verifier, _ := value.(*auth.Verifier)
	return verifier
}

func GetAuditWriter(c *gin.Context) *audit.Writer {
	value, ok := c.Get(auditWriterContextKey)
	if !ok {
		return nil
	}

	writer, _ := value.(*audit.Writer)
	return writer
}

func GetAuthzClient(c *gin.Context) *authzkit.Client {
	value, ok := c.Get(authzClientContextKey)
	if !ok {
		return nil
	}

	client, _ := value.(*authzkit.Client)
	return client
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
