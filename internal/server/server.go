package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Server struct {
	Engine *gin.Engine
}

func New() *Server {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.GET("/health/live", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	return &Server{Engine: r}
}
