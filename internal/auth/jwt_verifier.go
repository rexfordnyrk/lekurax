package auth

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"

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

type Verifier struct {
	pubKey *rsa.PublicKey
	issuer string
}

func NewRS256Verifier(publicKeyPEM, issuer string) (*Verifier, error) {
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

	return &Verifier{pubKey: pubKey, issuer: issuer}, nil
}

func (v *Verifier) VerifyAccessToken(tokenString string) (*Principal, error) {
	claims := &accessClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		if token.Method.Alg() != jwt.SigningMethodRS256.Alg() {
			return nil, fmt.Errorf("unexpected alg: %s", token.Method.Alg())
		}
		return v.pubKey, nil
	}, jwt.WithIssuer(v.issuer))
	if err != nil || token == nil || !token.Valid {
		return nil, fmt.Errorf("token invalid: %w", err)
	}

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
		if err == nil {
			branchID = &parsed
		}
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
