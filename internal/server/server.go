package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/branchctx"
	claimshttp "lekurax/internal/claims/http"
	documentshttp "lekurax/internal/docs/http"
	notifyhttp "lekurax/internal/notify/http"
	procurementhttp "lekurax/internal/procurement/http"
	reportshttp "lekurax/internal/reports/http"
)

const (
	authVerifierContextKey = "auth_verifier"
	auditWriterContextKey  = "audit_writer"
	authzClientContextKey  = "authz_client"
)

type Server struct {
	Engine *gin.Engine
}

func New(db *gorm.DB, authVerifier *auth.Verifier, auditWriter *audit.Writer, authzClient *authzkit.Client) *Server {
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

	claimshttp.RegisterProviderRoutes(v1, db, authVerifier, auditWriter, authzClient)
	claimshttp.RegisterPlanRoutes(v1, db, authVerifier, auditWriter, authzClient)
	claimshttp.RegisterCoverageRoutes(v1, db, authVerifier, auditWriter, authzClient)
	claimshttp.RegisterClaimRoutes(v1, db, authVerifier, auditWriter, authzClient)
	procurementhttp.RegisterSupplierRoutes(v1, db, authVerifier, auditWriter, authzClient)
	procurementhttp.RegisterRequisitionRoutes(v1, db, authVerifier, auditWriter, authzClient)
	reportshttp.RegisterSalesReportRoutes(v1, db, authVerifier, auditWriter, authzClient)
	reportshttp.RegisterInventoryReportRoutes(v1, db, authVerifier, auditWriter, authzClient)
	reportshttp.RegisterPrescriptionReportRoutes(v1, db, authVerifier, auditWriter, authzClient)
	notifyhttp.RegisterNotificationRoutes(v1, db, authVerifier)
	documentshttp.RegisterDocumentRoutes(v1, db, authVerifier, auditWriter, authzClient)

	return &Server{Engine: r}
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
