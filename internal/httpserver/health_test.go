package httpserver

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHealthReady_NoDatabase(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	api := &API{db: nil}
	r.GET("/health/ready", api.healthReady)

	req := httptest.NewRequest(http.MethodGet, "/health/ready", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 without DB, got %d: %s", w.Code, w.Body.String())
	}
}
