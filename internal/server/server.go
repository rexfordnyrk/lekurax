package server

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"lekurax/internal/auth"
	"lekurax/internal/branchctx"
)

type Server struct {
	Engine *gin.Engine
}

func New(verifier *auth.Verifier) *Server {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.GET("/health/live", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.GET("/api/v1/branches/:branch_id/ping", auth.RequireAuth(verifier), branchctx.RequireBranchContext(), func(c *gin.Context) {
		principal := auth.GetPrincipal(c)
		c.JSON(http.StatusOK, gin.H{
			"branch_id": c.GetString(branchctx.ContextKey),
			"tenant_id": principal.TenantID.String(),
		})
	})
	return &Server{Engine: r}
}
