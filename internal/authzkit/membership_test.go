package authzkit

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"lekurax/internal/auth"
)

func TestClientUserHasBranch_UsesServiceKeyAndV1Prefix(t *testing.T) {
	gin.SetMode(gin.TestMode)

	branchID := uuid.New()
	userID := uuid.New()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, http.MethodGet, r.Method)
		require.Equal(t, "/v1/branches/"+branchID.String()+"/users", r.URL.Path)
		require.Equal(t, userID.String(), r.URL.Query().Get("user_id"))
		require.Equal(t, "test-service-key", r.Header.Get("X-Service-Key"))
		require.Equal(t, "application/json", r.Header.Get("Accept"))

		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"data": []map[string]string{
				{"id": userID.String()},
			},
		}))
	}))
	defer server.Close()

	client := New(server.URL, "test-service-key")

	ok, err := client.UserHasBranch(t.Context(), branchID, userID)
	require.NoError(t, err)
	require.True(t, ok)
}

func TestRequireBranchMembership_Returns403WhenUserNotInBranch(t *testing.T) {
	gin.SetMode(gin.TestMode)

	branchID := uuid.New()
	userID := uuid.New()
	tenantID := uuid.New()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/v1/branches/"+branchID.String()+"/users", r.URL.Path)
		require.Equal(t, userID.String(), r.URL.Query().Get("user_id"))

		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"data":    []map[string]string{},
		}))
	}))
	defer server.Close()

	client := New(server.URL, "test-service-key")

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("principal", &auth.Principal{
			UserID:   userID,
			TenantID: tenantID,
			Roles:    []string{"cashier"},
		})
		c.Next()
	})
	router.GET("/branches/:branch_id/ping", RequireBranchMembership(client, func(p *auth.Principal) bool {
		return false
	}), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/branches/"+branchID.String()+"/ping", nil)

	router.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusForbidden, recorder.Code)
	require.JSONEq(t, `{"error":"BRANCH_FORBIDDEN"}`, recorder.Body.String())
}
