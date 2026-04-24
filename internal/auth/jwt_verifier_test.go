package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestVerifyAccessToken_InvalidBranchID_ReturnsError(t *testing.T) {
	privateKey, verifier := newRS256VerifierForTest(t, "https://issuer.example")

	token := signAccessTokenForTest(t, privateKey, "https://issuer.example", map[string]any{
		"user_id":    uuid.NewString(),
		"tenant_id":  uuid.NewString(),
		"branch_id":  "not-a-uuid",
		"session_id": "session-123",
	})

	principal, err := verifier.VerifyAccessToken(token)
	require.Nil(t, principal)
	require.Error(t, err)
	require.Equal(t, "invalid branch_id", err.Error())
}

func TestVerifyAccessToken_ExpiredToken_ReturnsError(t *testing.T) {
	privateKey, verifier := newRS256VerifierForTest(t, "https://issuer.example")

	token := signAccessTokenForTestAtTime(t, privateKey, "https://issuer.example", time.Now().UTC().Add(-2*time.Hour), map[string]any{
		"user_id":   uuid.NewString(),
		"tenant_id": uuid.NewString(),
	})

	principal, err := verifier.VerifyAccessToken(token)
	require.Nil(t, principal)
	require.Error(t, err)
	require.Contains(t, err.Error(), "token invalid")
}

func TestVerifyAccessToken_WrongIssuer_ReturnsError(t *testing.T) {
	privateKey, verifier := newRS256VerifierForTest(t, "https://issuer.example")

	token := signAccessTokenForTest(t, privateKey, "https://other-issuer.example", map[string]any{
		"user_id":   uuid.NewString(),
		"tenant_id": uuid.NewString(),
	})

	principal, err := verifier.VerifyAccessToken(token)
	require.Nil(t, principal)
	require.Error(t, err)
	require.Contains(t, err.Error(), "token invalid")
}

func TestVerifyAccessToken_WrongSignature_ReturnsError(t *testing.T) {
	_, verifier := newRS256VerifierForTest(t, "https://issuer.example")

	otherPrivateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	token := signAccessTokenForTest(t, otherPrivateKey, "https://issuer.example", map[string]any{
		"user_id":   uuid.NewString(),
		"tenant_id": uuid.NewString(),
	})

	principal, err := verifier.VerifyAccessToken(token)
	require.Nil(t, principal)
	require.Error(t, err)
	require.Contains(t, err.Error(), "token invalid")
}

func TestVerifyAccessToken_HS256_ValidToken(t *testing.T) {
	secret := "0123456789abcdef0123456789abcdef" // 32 chars
	issuer := "https://issuer.example"
	verifier, err := NewHS256Verifier(secret, issuer)
	require.NoError(t, err)

	now := time.Now().UTC()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss":        issuer,
		"sub":        "user",
		"iat":        now.Unix(),
		"nbf":        now.Unix(),
		"exp":        now.Add(time.Hour).Unix(),
		"user_id":    uuid.NewString(),
		"tenant_id":  uuid.NewString(),
		"session_id": "session-hs256",
		"roles":      []string{"tenant-admin"},
	})
	signed, err := token.SignedString([]byte(secret))
	require.NoError(t, err)

	principal, verifyErr := verifier.VerifyAccessToken(signed)
	require.NoError(t, verifyErr)
	require.NotNil(t, principal)
	require.Equal(t, "session-hs256", principal.SessionID)
}

func TestVerifyAccessToken_HS256_KeyTooShort_ReturnsError(t *testing.T) {
	_, err := NewHS256Verifier("short", "issuer")
	require.Error(t, err)
	require.Contains(t, err.Error(), "32")
}

func TestVerifyAccessToken_UnexpectedAlgorithm_DoesNotIncludeNilError(t *testing.T) {
	_, verifier := newRS256VerifierForTest(t, "https://issuer.example")

	now := time.Now().UTC()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"iss":       "https://issuer.example",
		"sub":       "user",
		"iat":       now.Unix(),
		"nbf":       now.Unix(),
		"exp":       now.Add(time.Hour).Unix(),
		"user_id":   uuid.NewString(),
		"tenant_id": uuid.NewString(),
	})
	signed, err := token.SignedString([]byte("secret"))
	require.NoError(t, err)

	principal, verifyErr := verifier.VerifyAccessToken(signed)
	require.Nil(t, principal)
	require.Error(t, verifyErr)
	require.NotContains(t, verifyErr.Error(), "<nil>")
}
