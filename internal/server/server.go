package server

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"lekurax/internal/audit"
	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/branchctx"
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
	r.Use(ExposeDependencies(authVerifier, auditWriter, authzClient))
	r.GET("/health/live", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/api/v1/branches/:branch_id/ping",
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
	return &Server{Engine: r}
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
