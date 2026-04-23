# Lekurax Backend Foundation (Auth + Branch Context) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Lekurax backend API skeleton and harden AuthzKit (`authz`) to support multi-branch assignment + branch context enforcement without token switching, while keeping `branch_id` claim compatibility.

**Architecture:** A new service `lekurax-api` (this repo root module) verifies AuthzKit JWTs, resolves branch context with the agreed precedence, and enforces membership via AuthzKit. AuthzKit is extended to expose multi-branch assignment and to treat `branch_id` in claims as “default/last selected branch” instead of the authorization boundary.

**Tech Stack:** Go (Gin, GORM, Postgres, Goose, Zap, Viper), AuthzKit (`authz`)

---

## Task 0: Create the backend service skeleton (`lekurax-api`)

**Files:**
- Create: `cmd/lekurax-api/main.go`
- Create: `cmd/lekurax-migrate/main.go`
- Create: `internal/server/server.go`
- Create: `internal/config/config.go`
- Create: `internal/db/db.go`
- Create: `migrations/0001_init.sql`
- Modify: `go.mod`

- [ ] **Step 1: Add dependencies**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco
go get github.com/gin-gonic/gin@latest
go get github.com/spf13/viper@latest
go get go.uber.org/zap@latest
go get gorm.io/gorm@latest
go get gorm.io/driver/postgres@latest
go get github.com/pressly/goose/v3@latest
go get github.com/golang-jwt/jwt/v5@latest
go get github.com/google/uuid@latest
go get github.com/stretchr/testify@latest
go mod tidy
```

Expected: `go.mod` updated; `go test ./...` fails until code exists.

- [ ] **Step 2: Create config struct + env loading**

Create `internal/config/config.go`:

```go
package config

import "time"

type Config struct {
	HTTP struct {
		Addr string `mapstructure:"addr"`
	} `mapstructure:"http"`

	DB struct {
		DSN string `mapstructure:"dsn"`
	} `mapstructure:"db"`

	Authz struct {
		BaseURL        string `mapstructure:"base_url"`
		ServiceAPIKey  string `mapstructure:"service_api_key"` // used for introspection/membership lookups
		JWTIssuer      string `mapstructure:"jwt_issuer"`
		RS256PublicKey string `mapstructure:"rs256_public_key_pem"` // optional if using JWKS later
	} `mapstructure:"authz"`

	Security struct {
		RequireBranchContext bool          `mapstructure:"require_branch_context"`
		RequestTimeout       time.Duration `mapstructure:"request_timeout"`
	} `mapstructure:"security"`
}
```

Then create `internal/config/load.go`:

```go
package config

import (
	"fmt"

	"github.com/spf13/viper"
)

func Load() (*Config, error) {
	v := viper.New()
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("./config")

	v.AutomaticEnv()
	v.SetEnvPrefix("LEKURAX")
	v.SetDefault("http.addr", ":8081")
	v.SetDefault("security.require_branch_context", true)
	v.SetDefault("security.request_timeout", "15s")

	_ = v.ReadInConfig() // optional

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}
	if cfg.DB.DSN == "" {
		return nil, fmt.Errorf("db.dsn is required")
	}
	if cfg.Authz.BaseURL == "" {
		return nil, fmt.Errorf("authz.base_url is required")
	}
	if cfg.Authz.ServiceAPIKey == "" {
		return nil, fmt.Errorf("authz.service_api_key is required")
	}
	return &cfg, nil
}
```

- [ ] **Step 3: Create DB wiring**

Create `internal/db/db.go`:

```go
package db

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Open(dsn string) (*gorm.DB, error) {
	gdb, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	return gdb, nil
}
```

- [ ] **Step 4: Add migrations runner**

Create `cmd/lekurax-migrate/main.go`:

```go
package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"lekurax/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	db, err := sql.Open("pgx", cfg.DB.DSN)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	if err := goose.Up(db, "migrations"); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
```

- [ ] **Step 5: Create the first migration**

Create `migrations/0001_init.sql`:

```sql
-- +goose Up

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Generic audit log table for Lekurax domain events (separate from AuthzKit audit).
CREATE TABLE IF NOT EXISTS lekurax_audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NULL,
  actor_user_id uuid NULL,
  action text NOT NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lekurax_audit_tenant_created ON lekurax_audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lekurax_audit_branch_created ON lekurax_audit_logs (tenant_id, branch_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS lekurax_audit_logs;
```

- [ ] **Step 6: Create the HTTP server wiring**

Create `internal/server/server.go`:

```go
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
	r.Use(gin.Recovery())
	r.GET("/health/live", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	return &Server{Engine: r}
}
```

Create `cmd/lekurax-api/main.go`:

```go
package main

import (
	"fmt"
	"os"

	"go.uber.org/zap"
	"lekurax/internal/config"
	"lekurax/internal/server"
)

func main() {
	log, _ := zap.NewProduction()
	defer log.Sync()

	cfg, err := config.Load()
	if err != nil {
		_ = log.Sync()
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	s := server.New()
	log.Info("starting lekurax-api", zap.String("addr", cfg.HTTP.Addr))
	if err := s.Engine.Run(cfg.HTTP.Addr); err != nil {
		log.Fatal("server failed", zap.Error(err))
	}
}
```

- [ ] **Step 7: Verify skeleton builds**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco
go test ./...
go run ./cmd/lekurax-api
```

Expected:
- tests compile (may be “no test files”)
- server starts and `GET /health/live` returns `{ "status": "ok" }`

- [ ] **Step 8: Commit**

```bash
git add go.mod go.sum cmd/lekurax-api cmd/lekurax-migrate internal migrations
git commit -m "feat(lekurax-api): scaffold service with config, db, migrations, health"
```

---

## Task 1: Add JWT auth middleware + request principal context

**Files:**
- Create: `internal/auth/principal.go`
- Create: `internal/auth/jwt_verifier.go`
- Create: `internal/auth/middleware.go`
- Modify: `internal/server/server.go`
- Test: `internal/auth/middleware_test.go`

- [ ] **Step 1: Define request principal**

Create `internal/auth/principal.go`:

```go
package auth

import "github.com/google/uuid"

type Principal struct {
	UserID      uuid.UUID
	TenantID    uuid.UUID
	Roles       []string
	Permissions []string
	BranchID    *uuid.UUID // legacy default / last-selected
	IsPlatform  bool
	SessionID   string
}
```

- [ ] **Step 2: Implement RS256 JWT verification**

Create `internal/auth/jwt_verifier.go`:

```go
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
	pubAny, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse public key: %w", err)
	}
	pub, ok := pubAny.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("public key is not RSA")
	}
	return &Verifier{pubKey: pub, issuer: issuer}, nil
}

func (v *Verifier) VerifyAccessToken(tokenString string) (*Principal, error) {
	claims := &accessClaims{}
	tok, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodRS256.Alg() {
			return nil, fmt.Errorf("unexpected alg: %s", t.Method.Alg())
		}
		return v.pubKey, nil
	}, jwt.WithIssuer(v.issuer))
	if err != nil || tok == nil || !tok.Valid {
		return nil, fmt.Errorf("token invalid: %w", err)
	}
	uid, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid user_id")
	}
	tid, err := uuid.Parse(claims.TenantID)
	if err != nil {
		return nil, fmt.Errorf("invalid tenant_id")
	}
	var bid *uuid.UUID
	if claims.BranchID != nil && *claims.BranchID != "" {
		parsed, err := uuid.Parse(*claims.BranchID)
		if err == nil {
			bid = &parsed
		}
	}
	return &Principal{
		UserID:      uid,
		TenantID:    tid,
		Roles:       claims.Roles,
		Permissions: claims.Permissions,
		BranchID:    bid,
		IsPlatform:  claims.IsPlatformUser,
		SessionID:   claims.SessionID,
	}, nil
}
```

- [ ] **Step 3: Gin middleware that sets principal**

Create `internal/auth/middleware.go`:

```go
package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const principalKey = "principal"

func RequireAuth(v *Verifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(strings.ToLower(h), "bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
			return
		}
		token := strings.TrimSpace(h[len("Bearer "):])
		p, err := v.VerifyAccessToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
			return
		}
		c.Set(principalKey, p)
		c.Next()
	}
}

func GetPrincipal(c *gin.Context) *Principal {
	v, ok := c.Get(principalKey)
	if !ok {
		return nil
	}
	p, _ := v.(*Principal)
	return p
}
```

- [ ] **Step 4: Add a protected test route**

Modify `internal/server/server.go` to add a `/whoami` route behind auth middleware (wire verifier creation later in Task 2). For now add a placeholder group and a TODO is NOT allowed; instead skip wiring until Task 2. Do this in Task 2.

- [ ] **Step 5: Tests**

Create `internal/auth/middleware_test.go` with a table test:

```go
package auth_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"lekurax/internal/auth"
)

func TestRequireAuth_MissingBearer_Returns401(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/x", auth.RequireAuth(&auth.Verifier{}), func(c *gin.Context) { c.Status(200) })

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	r.ServeHTTP(w, req)
	require.Equal(t, 401, w.Code)
}
```

Then in later tasks replace the stub verifier with a real one by generating an RS256 key in test and creating a signed token.

- [ ] **Step 6: Commit**

```bash
git add internal/auth
git commit -m "feat(lekurax-api): add JWT auth middleware and principal context"
```

---

## Task 2: Branch context resolver + enforcement (path/query/header/claim)

**Files:**
- Create: `internal/branchctx/resolve.go`
- Create: `internal/branchctx/middleware.go`
- Modify: `internal/server/server.go`
- Test: `internal/branchctx/resolve_test.go`

- [ ] **Step 1: Implement resolver**

Create `internal/branchctx/resolve.go`:

```go
package branchctx

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lekurax/internal/auth"
)

type Result struct {
	BranchID uuid.UUID
	Source   string // path|query|header|claim
	Present  bool
}

func Resolve(c *gin.Context) (Result, error) {
	// 1) path
	if v := c.Param("branch_id"); v != "" {
		id, err := uuid.Parse(v)
		return Result{BranchID: id, Source: "path", Present: true}, err
	}
	// 2) query
	if v := c.Query("branch_id"); v != "" {
		id, err := uuid.Parse(v)
		return Result{BranchID: id, Source: "query", Present: true}, err
	}
	// 3) header
	if v := c.GetHeader("X-Branch-Id"); v != "" {
		id, err := uuid.Parse(v)
		return Result{BranchID: id, Source: "header", Present: true}, err
	}
	// 4) claim (legacy default)
	p := auth.GetPrincipal(c)
	if p != nil && p.BranchID != nil {
		return Result{BranchID: *p.BranchID, Source: "claim", Present: true}, nil
	}
	return Result{Present: false}, nil
}

func AbortBranchRequired(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "BRANCH_REQUIRED"})
}
```

- [ ] **Step 2: Middleware that requires branch when configured**

Create `internal/branchctx/middleware.go`:

```go
package branchctx

import "github.com/gin-gonic/gin"

const branchKey = "branch_id"

func RequireBranchContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		res, err := Resolve(c)
		if err != nil {
			c.AbortWithStatusJSON(400, gin.H{"error": "INVALID_BRANCH_ID"})
			return
		}
		if !res.Present {
			AbortBranchRequired(c)
			return
		}
		c.Set(branchKey, res.BranchID.String())
		c.Next()
	}
}
```

- [ ] **Step 3: Add an example branch-scoped route**

Modify `internal/server/server.go` to include:
- `/api/v1/branches/:branch_id/ping` returning branch_id and tenant_id from principal

Use both `auth.RequireAuth(...)` and `branchctx.RequireBranchContext()`.

- [ ] **Step 4: Tests**

Create `internal/branchctx/resolve_test.go` with three cases verifying precedence (path beats query beats header beats claim).

- [ ] **Step 5: Commit**

```bash
git add internal/branchctx internal/server
git commit -m "feat(lekurax-api): resolve and require branch context with precedence"
```

---

## Task 3: AuthzKit changes — multi-branch assignment and membership enforcement helpers

This task updates the `authz` service (not the Lekurax API) to support:
- user ↔ branches many-to-many assignment in the API
- `GET /users/me` (or equivalent) returns `accessible_branches`
- branch_id claim remains for compatibility but is not the authorization boundary

**Files (authz):**
- Modify: `authz/internal/domain/entities.go` (if user currently has single `BranchID`)
- Modify: `authz/internal/infrastructure/persistence/user_branch_repository.go`
- Modify: `authz/internal/application/user_service.go` (or relevant service)
- Modify: `authz/internal/delivery/http/handler/*` (new endpoints)
- Modify: `authz/docs/swagger.yaml` (endpoints)
- Test: `authz/test/integration/*` (new coverage)

- [ ] **Step 1: Locate current user branch model**

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco/authz
rg -n \"BranchID\" internal/domain/entities.go internal/infrastructure/persistence internal/application
```

Expected: find whether user has `BranchID *uuid.UUID` today and how it’s used in token claims and permission resolution.

- [ ] **Step 2: Add/confirm many-to-many persistence**

`authz/internal/infrastructure/persistence/user_branch_repository.go` already exists. Ensure it supports:
- assign user to branch
- unassign
- list branches for user
- list users for branch

Add missing methods if needed and unit tests mirroring existing repo patterns.

- [ ] **Step 3: Add API endpoints**

Add endpoints (tenant-scoped, permission-protected):
- `POST /branches/:branch_id/users/:user_id` (assign)
- `DELETE /branches/:branch_id/users/:user_id` (unassign)
- `GET /users/me/branches` (list my accessible branches)

Update `@authzkit/client` resources:
- add `users.listMyBranches()` and update type defs.

- [ ] **Step 4: Update `getMe` response**

Modify the backend response model so `GET /users/me` returns:
- `branches_enabled`
- `accessible_branches: [{id,name,status,...}]`
- optional `default_branch_id` (use legacy claim or first assignment)

Update console app only if needed; Lekurax web-ui will consume this.

- [ ] **Step 5: Keep `branch_id` claim but change semantics**

Ensure token minting still includes `branch_id` (existing behavior), but:
- it is treated as default/last-selected in clients
- permission checks MUST enforce membership against the branch resolved from request context (path/query/header/claim)

Add an auth middleware helper in authz (or document) that downstream services can implement consistently.

- [ ] **Step 6: Integration tests**

Write an integration test that:
- creates tenant + 2 branches
- assigns user to both
- logs in (single token)
- calls a branch-scoped endpoint with each branch in the path; both succeed without refreshing token

- [ ] **Step 7: Commit**

```bash
git add authz
git commit -m "feat(authz): support multi-branch user assignment and expose accessible branches"
```

---

## Task 4: Lekurax API membership enforcement via AuthzKit

**Files:**
- Create: `internal/authzkit/client.go`
- Create: `internal/authzkit/membership.go`
- Create: `internal/authzkit/middleware.go`
- Modify: `internal/server/server.go`
- Test: `internal/authzkit/membership_test.go`

- [ ] **Step 1: Minimal AuthzKit HTTP client (service account key)**

Create `internal/authzkit/client.go`:

```go
package authzkit

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

type Client struct {
	baseURL   string
	apiKey    string
	httpClient *http.Client
}

func New(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) get(ctx context.Context, path string, q url.Values, out any) error {
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return fmt.Errorf("parse base url: %w", err)
	}
	u.Path = "/v1" + path
	if q != nil {
		u.RawQuery = q.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Accept", "application/json")
	res, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("do request: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return fmt.Errorf("authzkit http %d", res.StatusCode)
	}
	return json.NewDecoder(res.Body).Decode(out)
}
```

- [ ] **Step 2: Membership check**

Create `internal/authzkit/membership.go`:

```go
package authzkit

import (
	"context"
	"net/url"

	"github.com/google/uuid"
)

type listBranchUsersResponse struct {
	Items []struct {
		ID string `json:"id"`
	} `json:"items"`
}

func (c *Client) UserHasBranch(ctx context.Context, branchID, userID uuid.UUID) (bool, error) {
	// This assumes AuthzKit branch users list supports filtering by user_id.
	// If it does not, add a purpose-built endpoint in AuthzKit and update this.
	q := url.Values{}
	q.Set("user_id", userID.String())

	var out listBranchUsersResponse
	if err := c.get(ctx, "/branches/"+branchID.String()+"/users", q, &out); err != nil {
		return false, err
	}
	for _, it := range out.Items {
		if it.ID == userID.String() {
			return true, nil
		}
	}
	return false, nil
}
```

- [ ] **Step 3: Middleware**

Create `internal/authzkit/middleware.go`:

```go
package authzkit

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"lekurax/internal/auth"
	"lekurax/internal/branchctx"
)

func RequireBranchMembership(client *Client, isTenantAdmin func(p *auth.Principal) bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		p := auth.GetPrincipal(c)
		if p == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
			return
		}
		if isTenantAdmin != nil && isTenantAdmin(p) {
			c.Next()
			return
		}

		res, err := branchctx.Resolve(c)
		if err != nil || !res.Present {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "BRANCH_REQUIRED"})
			return
		}

		ok, err := client.UserHasBranch(c.Request.Context(), res.BranchID, p.UserID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadGateway, gin.H{"error": "AUTHZ_UNAVAILABLE"})
			return
		}
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "BRANCH_FORBIDDEN"})
			return
		}
		c.Set("branch_id", res.BranchID.String())
		c.Next()
	}
}
```

- [ ] **Step 4: Tests**

Add a unit test using an httptest server stub for AuthzKit responses to verify 403 on missing membership.

- [ ] **Step 5: Commit**

```bash
git add internal/authzkit internal/server
git commit -m "feat(lekurax-api): enforce branch membership via AuthzKit lookups"
```

---

## Task 5: Permission checks + audit writer (shared building blocks for all modules)

**Files:**
- Create: `internal/rbac/require.go`
- Create: `internal/audit/writer.go`
- Modify: `internal/server/server.go`
- Test: `internal/rbac/require_test.go`

- [ ] **Step 1: Permission middleware**

Create `internal/rbac/require.go`:

```go
package rbac

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"lekurax/internal/auth"
)

func RequirePermission(name string) gin.HandlerFunc {
	return func(c *gin.Context) {
		p := auth.GetPrincipal(c)
		if p == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "UNAUTHORIZED"})
			return
		}
		for _, perm := range p.Permissions {
			if perm == name {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "FORBIDDEN"})
	}
}
```

- [ ] **Step 2: Audit writer**

Create `internal/audit/writer.go`:

```go
package audit

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Entry struct {
	ID          uuid.UUID `gorm:"type:uuid;default:uuid_generate_v4();primaryKey"`
	TenantID    uuid.UUID `gorm:"type:uuid;not null;index"`
	BranchID    *uuid.UUID `gorm:"type:uuid;index"`
	ActorUserID *uuid.UUID `gorm:"type:uuid;index"`
	Action      string    `gorm:"not null"`
	EntityType  *string
	EntityID    *uuid.UUID `gorm:"type:uuid"`
	Metadata    []byte    `gorm:"type:jsonb;not null;default:'{}'"`
	CreatedAt   time.Time `gorm:"not null"`
}

func (Entry) TableName() string { return "lekurax_audit_logs" }

type Writer struct{ db *gorm.DB }

func New(db *gorm.DB) *Writer { return &Writer{db: db} }

func (w *Writer) Write(ctx context.Context, e Entry) error {
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now()
	}
	return w.db.WithContext(ctx).Create(&e).Error
}
```

- [ ] **Step 3: Wire into server**

Modify `internal/server/server.go` to accept dependencies:
- `authVerifier *auth.Verifier`
- `auditWriter *audit.Writer`
- `authzClient *authzkit.Client`

Expose them via gin context or via handler structs.

- [ ] **Step 4: Run tests**

```bash
go test ./... -v
```

- [ ] **Step 5: Commit**

```bash
git add internal/rbac internal/audit internal/server
git commit -m "feat(lekurax-api): add permission middleware and audit writer"
```

