package server

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
	"lekurax/internal/branchctx"
)

type Server struct {
	Engine *gin.Engine
}

func New(verifier *auth.Verifier, client *authzkit.Client) *Server {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.GET("/health/live", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/api/v1/branches/:branch_id/ping",
		auth.RequireAuth(verifier),
		authzkit.RequireBranchMembership(client, isTenantAdmin),
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

func isTenantAdmin(principal *auth.Principal) bool {
	if principal == nil {
		return false
	}

	for _, role := range principal.Roles {
		if role == "tenant_admin" {
			return true
		}
	}

	return false
}
