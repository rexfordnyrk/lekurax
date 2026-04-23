package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestRequireAuth_MissingBearer_Returns401(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, verifier := newRS256VerifierForTest(t, "https://issuer.example")

	r := gin.New()
	r.GET("/x", RequireAuth(verifier), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireAuth_InvalidBearerToken_Returns401(t *testing.T) {
	gin.SetMode(gin.TestMode)
	_, verifier := newRS256VerifierForTest(t, "https://issuer.example")

	r := gin.New()
	r.GET("/x", RequireAuth(verifier), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Authorization", "Bearer not-a-valid-token")
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireAuth_InvalidBranchIDClaim_Returns401(t *testing.T) {
	gin.SetMode(gin.TestMode)

	privateKey, verifier := newRS256VerifierForTest(t, "https://issuer.example")
	userID := uuid.New()
	tenantID := uuid.New()

	r := gin.New()
	r.GET("/x", RequireAuth(verifier), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	token := signAccessTokenForTest(t, privateKey, "https://issuer.example", map[string]any{
		"user_id":    userID.String(),
		"tenant_id":  tenantID.String(),
		"branch_id":  "not-a-uuid",
		"session_id": "session-123",
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireAuth_ValidTokenSetsPrincipal(t *testing.T) {
	gin.SetMode(gin.TestMode)

	privateKey, verifier := newRS256VerifierForTest(t, "https://issuer.example")
	userID := uuid.New()
	tenantID := uuid.New()
	branchID := uuid.New()

	r := gin.New()
	r.GET("/x", RequireAuth(verifier), func(c *gin.Context) {
		principal := GetPrincipal(c)
		require.NotNil(t, principal)
		require.Equal(t, userID, principal.UserID)
		require.Equal(t, tenantID, principal.TenantID)
		require.NotNil(t, principal.BranchID)
		require.Equal(t, branchID, *principal.BranchID)
		require.Equal(t, []string{"tenant_admin"}, principal.Roles)
		require.Equal(t, []string{"branches.read", "products.write"}, principal.Permissions)
		require.True(t, principal.IsPlatform)
		require.Equal(t, "session-123", principal.SessionID)

		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	token := signAccessTokenForTest(t, privateKey, "https://issuer.example", map[string]any{
		"user_id":          userID.String(),
		"tenant_id":        tenantID.String(),
		"branch_id":        branchID.String(),
		"roles":            []string{"tenant_admin"},
		"permissions":      []string{"branches.read", "products.write"},
		"session_id":       "session-123",
		"principal_type":   "user",
		"is_platform_user": true,
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("Authorization", "bEaReR "+token)
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var body map[string]bool
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.True(t, body["ok"])
}

func newRS256VerifierForTest(t *testing.T, issuer string) (*rsa.PrivateKey, *Verifier) {
	t.Helper()

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	publicDER, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	require.NoError(t, err)

	publicPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicDER,
	})

	verifier, err := NewRS256Verifier(string(publicPEM), issuer)
	require.NoError(t, err)

	return privateKey, verifier
}

func signAccessTokenForTest(t *testing.T, privateKey *rsa.PrivateKey, issuer string, claims map[string]any) string {
	t.Helper()

	return signAccessTokenForTestAtTime(t, privateKey, issuer, time.Now().UTC(), claims)
}

func signAccessTokenForTestAtTime(t *testing.T, privateKey *rsa.PrivateKey, issuer string, now time.Time, claims map[string]any) string {
	t.Helper()

	mapClaims := jwt.MapClaims{
		"iss": issuer,
		"sub": "user",
		"iat": now.Unix(),
		"nbf": now.Unix(),
		"exp": now.Add(time.Hour).Unix(),
	}
	for key, value := range claims {
		mapClaims[key] = value
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, mapClaims)
	signed, err := token.SignedString(privateKey)
	require.NoError(t, err)

	return signed
}
