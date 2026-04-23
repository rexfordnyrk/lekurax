package branchctx

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

func TestRequireBranchContext_InvalidBranchIDReturns400(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.GET("/branches/:branch_id", RequireBranchContext(), func(c *gin.Context) {
		t.Fatal("handler should not run")
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/branches/not-a-uuid", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code)
	require.Equal(t, map[string]string{"error": "INVALID_BRANCH_ID"}, decodeErrorBody(t, w))
}

func TestRequireBranchContext_InvalidQueryBranchIDReturns400(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.GET("/branches", RequireBranchContext(), func(c *gin.Context) {
		t.Fatal("handler should not run")
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/branches?"+QueryParamKey+"=not-a-uuid", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code)
	require.Equal(t, map[string]string{"error": "INVALID_BRANCH_ID"}, decodeErrorBody(t, w))
}

func TestRequireBranchContext_InvalidHeaderBranchIDReturns400(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.GET("/branches", RequireBranchContext(), func(c *gin.Context) {
		t.Fatal("handler should not run")
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/branches", nil)
	req.Header.Set(HeaderName, "not-a-uuid")
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code)
	require.Equal(t, map[string]string{"error": "INVALID_BRANCH_ID"}, decodeErrorBody(t, w))
}

func TestRequireBranchContext_MissingBranchIDReturns400(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.GET("/branches", RequireBranchContext(), func(c *gin.Context) {
		t.Fatal("handler should not run")
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/branches", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code)
	require.Equal(t, map[string]string{"error": "BRANCH_REQUIRED"}, decodeErrorBody(t, w))
}

func TestRequireBranchContext_SetsResolvedBranchIDOnContext(t *testing.T) {
	gin.SetMode(gin.TestMode)

	claimID := uuid.New()

	r := gin.New()
	r.GET("/branches", setPrincipalForBranchContextTest(&claimID), RequireBranchContext(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"branch_id": c.GetString(ContextKey)})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/branches", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var body map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, claimID.String(), body["branch_id"])
}

func setPrincipalForBranchContextTest(branchID *uuid.UUID) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("principal", &auth.Principal{BranchID: branchID})
		c.Next()
	}
}

func decodeErrorBody(t *testing.T, w *httptest.ResponseRecorder) map[string]string {
	t.Helper()

	var body map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	return body
}
