package auth

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type accessClaims struct {
	UserID         string   `json:"user_id"`
	TenantID       string   `json:"tenant_id"`
	BranchID       *string  `json:"branch_id"`
	Roles          []string `json:"roles"`
	Permissions    []string `json:"permissions"`
	SessionID      string   `json:"session_id"`
	PrincipalType  string   `json:"principal_type"`
	IsPlatformUser bool     `json:"is_platform_user"`
	jwt.RegisteredClaims
}

// Verifier validates Authz-issued access tokens (RS256 or HS256).
type Verifier struct {
	issuer     string
	pubKey     *rsa.PublicKey // set for RS256
	hmacSecret []byte         // set for HS256
}

const minHS256KeyLen = 32

// NewRS256Verifier builds a verifier from an Authz RS256 public key PEM and expected issuer.
func NewRS256Verifier(publicKeyPEM, issuer string) (*Verifier, error) {
	return NewVerifier(VerifierOptions{
		Issuer:           issuer,
		Algorithm:        "RS256",
		RS256PublicKeyPEM: publicKeyPEM,
	})
}

// NewHS256Verifier builds a verifier from the same symmetric signing key Authz uses for HS256.
func NewHS256Verifier(signingKey, issuer string) (*Verifier, error) {
	return NewVerifier(VerifierOptions{
		Issuer:          issuer,
		Algorithm:       "HS256",
		HS256SigningKey: signingKey,
	})
}

// VerifierOptions selects RS256 vs HS256 validation (must match Authz jwt.algorithm).
type VerifierOptions struct {
	Issuer            string
	Algorithm         string // RS256 or HS256 (empty defaults to RS256)
	RS256PublicKeyPEM string
	HS256SigningKey   string
}

// NewVerifier constructs a Verifier from explicit algorithm and key material.
func NewVerifier(opts VerifierOptions) (*Verifier, error) {
	alg := strings.TrimSpace(strings.ToUpper(opts.Algorithm))
	if alg == "" {
		alg = "RS256"
	}
	issuer := strings.TrimSpace(opts.Issuer)
	if issuer == "" {
		return nil, fmt.Errorf("issuer is required")
	}

	switch alg {
	case "RS256":
		pemStr := strings.TrimSpace(opts.RS256PublicKeyPEM)
		if pemStr == "" {
			return nil, fmt.Errorf("rs256_public_key_pem is required when jwt_algorithm is RS256")
		}
		pub, err := parseRSAPublicKeyPEM(pemStr)
		if err != nil {
			return nil, err
		}
		return &Verifier{issuer: issuer, pubKey: pub}, nil

	case "HS256":
		key := strings.TrimSpace(opts.HS256SigningKey)
		if len(key) < minHS256KeyLen {
			return nil, fmt.Errorf("hs256_signing_key must be at least %d characters", minHS256KeyLen)
		}
		return &Verifier{issuer: issuer, hmacSecret: []byte(key)}, nil

	default:
		return nil, fmt.Errorf("unsupported jwt_algorithm %q (use RS256 or HS256)", alg)
	}
}

func parseRSAPublicKeyPEM(publicKeyPEM string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return nil, fmt.Errorf("invalid public key PEM")
	}

	publicKey, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse public key: %w", err)
	}

	pubKey, ok := publicKey.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("public key is not RSA")
	}
	return pubKey, nil
}

func (v *Verifier) VerifyAccessToken(tokenString string) (*Principal, error) {
	claims := &accessClaims{}

	if len(v.hmacSecret) > 0 {
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
			if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
				return nil, fmt.Errorf("unexpected alg: %s", token.Method.Alg())
			}
			return v.hmacSecret, nil
		}, jwt.WithIssuer(v.issuer))
		if err != nil {
			return nil, fmt.Errorf("token invalid: %w", err)
		}
		if token == nil || !token.Valid {
			return nil, fmt.Errorf("token invalid")
		}
		return principalFromClaims(claims)
	}

	if v.pubKey == nil {
		return nil, fmt.Errorf("verifier not configured")
	}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		if token.Method.Alg() != jwt.SigningMethodRS256.Alg() {
			return nil, fmt.Errorf("unexpected alg: %s", token.Method.Alg())
		}
		return v.pubKey, nil
	}, jwt.WithIssuer(v.issuer))
	if err != nil {
		return nil, fmt.Errorf("token invalid: %w", err)
	}
	if token == nil || !token.Valid {
		return nil, fmt.Errorf("token invalid")
	}

	return principalFromClaims(claims)
}

func principalFromClaims(claims *accessClaims) (*Principal, error) {
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid user_id")
	}

	tenantID, err := uuid.Parse(claims.TenantID)
	if err != nil {
		return nil, fmt.Errorf("invalid tenant_id")
	}

	var branchID *uuid.UUID
	if claims.BranchID != nil && *claims.BranchID != "" {
		parsed, err := uuid.Parse(*claims.BranchID)
		if err != nil {
			return nil, fmt.Errorf("invalid branch_id")
		}
		branchID = &parsed
	}

	return &Principal{
		UserID:      userID,
		TenantID:    tenantID,
		Roles:       claims.Roles,
		Permissions: claims.Permissions,
		BranchID:    branchID,
		IsPlatform:  claims.IsPlatformUser,
		SessionID:   claims.SessionID,
	}, nil
}
