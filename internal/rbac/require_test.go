package rbac

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"lekurax/internal/auth"
)

func TestRequirePermission_Granted(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("principal", &auth.Principal{
			UserID:      uuid.New(),
			TenantID:    uuid.New(),
			Permissions: []string{"orders.view", "orders.create"},
		})
		c.Next()
	})
	router.GET("/test", RequirePermission("orders.create"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/test", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code)
}

func TestRequirePermission_Denied(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("principal", &auth.Principal{
			UserID:      uuid.New(),
			TenantID:    uuid.New(),
			Permissions: []string{"orders.view"},
		})
		c.Next()
	})
	router.GET("/test", RequirePermission("orders.create"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/test", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusForbidden, recorder.Code)
	require.JSONEq(t, `{"error":"FORBIDDEN"}`, recorder.Body.String())
}

func TestRequirePermission_NoPrincipal(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.GET("/test", RequirePermission("orders.view"), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/test", nil)
	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusUnauthorized, recorder.Code)
	require.JSONEq(t, `{"error":"UNAUTHORIZED"}`, recorder.Body.String())
}
