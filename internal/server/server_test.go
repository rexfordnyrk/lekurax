package server

import (
	"bytes"
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

	"lekurax/internal/auth"
	"lekurax/internal/authzkit"
)

func TestNew_HealthLiveReturnsOK(t *testing.T) {
	_, verifier := newRS256VerifierForServerTest(t, "https://issuer.example")
	s := New(verifier, authzkit.New("http://127.0.0.1:1", "test-service-key"))

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	s.Engine.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var body map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, "ok", body["status"])
}

func TestNew_LogsRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var logBuffer bytes.Buffer
	originalWriter := gin.DefaultWriter
	gin.DefaultWriter = &logBuffer
	defer func() {
		gin.DefaultWriter = originalWriter
	}()

	_, verifier := newRS256VerifierForServerTest(t, "https://issuer.example")
	s := New(verifier, authzkit.New("http://127.0.0.1:1", "test-service-key"))

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health/live", nil)
	s.Engine.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	require.Contains(t, logBuffer.String(), "/health/live")
}

func TestNew_BranchPingReturnsResolvedBranchAndTenant(t *testing.T) {
	gin.SetMode(gin.TestMode)

	privateKey, verifier := newRS256VerifierForServerTest(t, "https://issuer.example")
	s := New(verifier, authzkit.New("http://127.0.0.1:1", "test-service-key"))

	tenantID := uuid.New()
	claimBranchID := uuid.New()
	pathBranchID := uuid.New()

	token := signAccessTokenForServerTest(t, privateKey, "https://issuer.example", map[string]any{
		"user_id":    uuid.NewString(),
		"tenant_id":  tenantID.String(),
		"branch_id":  claimBranchID.String(),
		"roles":      []string{"tenant_admin"},
		"session_id": "session-123",
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/branches/"+pathBranchID.String()+"/ping", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	s.Engine.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	var body map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Equal(t, pathBranchID.String(), body["branch_id"])
	require.Equal(t, tenantID.String(), body["tenant_id"])
}

func newRS256VerifierForServerTest(t *testing.T, issuer string) (*rsa.PrivateKey, *auth.Verifier) {
	t.Helper()

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	publicDER, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	require.NoError(t, err)

	publicPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicDER,
	})

	verifier, err := auth.NewRS256Verifier(string(publicPEM), issuer)
	require.NoError(t, err)

	return privateKey, verifier
}

func signAccessTokenForServerTest(t *testing.T, privateKey *rsa.PrivateKey, issuer string, claims map[string]any) string {
	t.Helper()

	mapClaims := jwt.MapClaims{
		"iss": issuer,
		"sub": "user",
		"iat": time.Now().UTC().Unix(),
		"nbf": time.Now().UTC().Unix(),
		"exp": time.Now().UTC().Add(time.Hour).Unix(),
	}
	for key, value := range claims {
		mapClaims[key] = value
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, mapClaims)
	signed, err := token.SignedString(privateKey)
	require.NoError(t, err)

	return signed
}
