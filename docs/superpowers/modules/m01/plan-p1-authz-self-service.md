# M01-P1: Authz — Tenant Self-Service Config Endpoint

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `PUT /v1/tenants/me/config` to the authz service so tenant admins can update their own password + MFA policies without platform credentials.

**Architecture:** New handler method on the existing `TenantHandler`, derives tenant from the JWT principal (no tenant ID in path). New permission `tenant.settings.update` gates the route. New `updateMyConfig` method added to the authzkit JS client.

**Tech Stack:** Go 1.21+, Gin, GORM, authzkit-client (vanilla JS ES modules). Working directory for all Go steps: `authz/`. Working directory for JS steps: `authz/frontend/packages/authzkit-client/`.

**Dependency:** Must complete before M01-P3 (admin page wiring uses the new client method).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `authz/internal/delivery/http/handler/tenant_handler.go` | Add `UpdateMyConfig` handler + route registration |
| Modify | `authz/internal/delivery/http/request/tenant_requests.go` | Add `UpdateMyTenantConfigRequest` DTO |
| Modify | `authz/internal/application/tenant_service.go` | Expose `UpdateTenantConfig` method scoped to tenant |
| Modify | `authz/pkg/permseeder/seeder.go` (or migration) | Register `tenant.settings.update` permission |
| Modify | `authz/frontend/packages/authzkit-client/src/resources/tenants.js` | Add `updateMyConfig` method |
| Modify | `authz/frontend/packages/authzkit-client/src/index.d.ts` | Add TypeScript signature |
| Create | `authz/internal/delivery/http/handler/tenant_handler_myconfig_test.go` | Integration test for the new endpoint |

---

## Task 1: Add the request DTO

**Files:**
- Modify: `authz/internal/delivery/http/request/tenant_requests.go`

- [ ] **Step 1.1: Add `UpdateMyTenantConfigRequest` to the request file**

Open `authz/internal/delivery/http/request/tenant_requests.go` and append:

```go
// UpdateMyTenantConfigRequest is the body for PUT /v1/tenants/me/config.
// Only the fields present in the JSON body are applied (nil pointer = no change).
// Platform-only fields (branches_enabled, is_platform_tenant, allowed_providers) are excluded.
type UpdateMyTenantConfigRequest struct {
	MFAPolicy           *string              `json:"mfa_policy,omitempty"`
	AllowPasswordlessOTP *bool               `json:"allow_passwordless_otp,omitempty"`
	AutoCreateOnOTP     *bool                `json:"auto_create_on_otp,omitempty"`
	PasswordPolicy      *PasswordPolicyInput `json:"password_policy,omitempty"`
}

// PasswordPolicyInput is a partial password-policy update.
type PasswordPolicyInput struct {
	MinLength         *int  `json:"min_length,omitempty"`
	RequireUppercase  *bool `json:"require_uppercase,omitempty"`
	RequireDigit      *bool `json:"require_digit,omitempty"`
	RequireSpecialChar *bool `json:"require_special_char,omitempty"`
	MaxFailedAttempts *int  `json:"max_failed_attempts,omitempty"`
	LockoutDuration   *int  `json:"lockout_duration,omitempty"`
}
```

- [ ] **Step 1.2: Commit**

```bash
cd authz
git add internal/delivery/http/request/tenant_requests.go
git commit -m "feat(authz): add UpdateMyTenantConfigRequest DTO"
```

---

## Task 2: Add `UpdateMyConfig` handler

**Files:**
- Modify: `authz/internal/delivery/http/handler/tenant_handler.go`

- [ ] **Step 2.1: Write the failing test first**

Create `authz/internal/delivery/http/handler/tenant_handler_myconfig_test.go`:

```go
package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/rexfordnyrk/authzKit/internal/delivery/http/middleware"
	"github.com/rexfordnyrk/authzKit/internal/domain"
)

func TestUpdateMyConfig_RequiresTenantSettingsPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// Arrange: principal WITHOUT tenant.settings.update
	principal := &domain.RequestPrincipal{
		TenantID:    uuid.New(),
		Permissions: []string{},
	}

	r := gin.New()
	r.Use(func(c *gin.Context) {
		middleware.SetPrincipal(c, principal)
		c.Next()
	})
	r.Use(middleware.RequirePermission("tenant.settings.update"))
	r.PUT("/v1/tenants/me/config", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	body, _ := json.Marshal(map[string]any{"mfa_policy": "required"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPut, "/v1/tenants/me/config", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestUpdateMyConfig_AcceptsValidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	// Arrange: principal WITH tenant.settings.update
	tenantID := uuid.New()
	principal := &domain.RequestPrincipal{
		TenantID:    tenantID,
		Permissions: []string{"tenant.settings.update"},
	}

	r := gin.New()
	r.Use(func(c *gin.Context) {
		middleware.SetPrincipal(c, principal)
		c.Next()
	})
	r.Use(middleware.RequirePermission("tenant.settings.update"))

	var capturedTenantID uuid.UUID
	r.PUT("/v1/tenants/me/config", func(c *gin.Context) {
		capturedTenantID = middleware.MustGetPrincipal(c).TenantID
		c.Status(http.StatusOK)
	})

	body, _ := json.Marshal(map[string]any{"mfa_policy": "required"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPut, "/v1/tenants/me/config", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, tenantID, capturedTenantID)
}
```

- [ ] **Step 2.2: Run tests to verify they fail**

```bash
cd authz
go test ./internal/delivery/http/handler/... -run TestUpdateMyConfig -v
```

Expected: compile error or FAIL — `UpdateMyConfig` not yet implemented.

- [ ] **Step 2.3: Implement `UpdateMyConfig` in `tenant_handler.go`**

Add this method to `TenantHandler` (after `UpdateTenant`):

```go
// UpdateMyConfig handles PUT /v1/tenants/me/config.
// Updates the calling user's own tenant's password and MFA policies.
// Requires: tenant.settings.update permission (tenant-scoped, not platform).
// Platform-only fields (branches_enabled, allowed_providers) are ignored.
func (h *TenantHandler) UpdateMyConfig(c *gin.Context) {
	principal := middleware.MustGetPrincipal(c)

	var req request.UpdateMyTenantConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, domain.ErrInvalidInput.WithDetails(map[string]string{
			"body": err.Error(),
		}))
		return
	}

	// Build a partial TenantConfig update from only the fields present in the request.
	configUpdate := &domain.TenantConfigUpdate{}
	if req.MFAPolicy != nil {
		configUpdate.MFAPolicy = req.MFAPolicy
	}
	if req.AllowPasswordlessOTP != nil {
		configUpdate.AllowPasswordlessOTP = req.AllowPasswordlessOTP
	}
	if req.AutoCreateOnOTP != nil {
		configUpdate.AutoCreateOnOTP = req.AutoCreateOnOTP
	}
	if req.PasswordPolicy != nil {
		pp := domain.PasswordPolicyUpdate{}
		if req.PasswordPolicy.MinLength != nil {
			pp.MinLength = req.PasswordPolicy.MinLength
		}
		if req.PasswordPolicy.RequireUppercase != nil {
			pp.RequireUppercase = req.PasswordPolicy.RequireUppercase
		}
		if req.PasswordPolicy.RequireDigit != nil {
			pp.RequireDigit = req.PasswordPolicy.RequireDigit
		}
		if req.PasswordPolicy.RequireSpecialChar != nil {
			pp.RequireSpecialChar = req.PasswordPolicy.RequireSpecialChar
		}
		if req.PasswordPolicy.MaxFailedAttempts != nil {
			pp.MaxFailedAttempts = req.PasswordPolicy.MaxFailedAttempts
		}
		if req.PasswordPolicy.LockoutDuration != nil {
			pp.LockoutDuration = req.PasswordPolicy.LockoutDuration
		}
		configUpdate.PasswordPolicy = &pp
	}

	tenant, err := h.tenantService.UpdateTenantConfig(c.Request.Context(), principal.TenantID, configUpdate)
	if err != nil {
		response.Error(c, err)
		return
	}

	response.OK(c, response.NewTenantResponse(tenant))
}
```

- [ ] **Step 2.4: Add `TenantConfigUpdate` and `PasswordPolicyUpdate` to `domain/entities.go`**

Append to `authz/internal/domain/entities.go`:

```go
// TenantConfigUpdate holds partial updates for tenant config self-service.
// Only non-nil fields are applied by the service layer.
type TenantConfigUpdate struct {
	MFAPolicy            *string
	AllowPasswordlessOTP *bool
	AutoCreateOnOTP      *bool
	PasswordPolicy       *PasswordPolicyUpdate
}

// PasswordPolicyUpdate holds partial updates for password policy.
type PasswordPolicyUpdate struct {
	MinLength          *int
	RequireUppercase   *bool
	RequireDigit       *bool
	RequireSpecialChar *bool
	MaxFailedAttempts  *int
	LockoutDuration    *int
}
```

- [ ] **Step 2.5: Add `UpdateTenantConfig` to `TenantService`**

In `authz/internal/application/tenant_service.go`, add:

```go
// UpdateTenantConfig applies a partial config update for the given tenant.
// Only the non-nil fields in update are written. Platform-only fields are not exposed.
func (s *TenantService) UpdateTenantConfig(ctx context.Context, tenantID uuid.UUID, update *domain.TenantConfigUpdate) (*domain.Tenant, error) {
	tenant, err := s.tenantRepo.GetByID(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	cfg := tenant.Config
	if update.MFAPolicy != nil {
		cfg.MFAPolicy = *update.MFAPolicy
	}
	if update.AllowPasswordlessOTP != nil {
		cfg.AllowPasswordlessOTP = *update.AllowPasswordlessOTP
	}
	if update.AutoCreateOnOTP != nil {
		cfg.AutoCreateOnOTP = *update.AutoCreateOnOTP
	}
	if update.PasswordPolicy != nil {
		pp := cfg.PasswordPolicy
		if update.PasswordPolicy.MinLength != nil {
			pp.MinLength = *update.PasswordPolicy.MinLength
		}
		if update.PasswordPolicy.RequireUppercase != nil {
			pp.RequireUppercase = *update.PasswordPolicy.RequireUppercase
		}
		if update.PasswordPolicy.RequireDigit != nil {
			pp.RequireDigit = *update.PasswordPolicy.RequireDigit
		}
		if update.PasswordPolicy.RequireSpecialChar != nil {
			pp.RequireSpecialChar = *update.PasswordPolicy.RequireSpecialChar
		}
		if update.PasswordPolicy.MaxFailedAttempts != nil {
			pp.MaxFailedAttempts = *update.PasswordPolicy.MaxFailedAttempts
		}
		if update.PasswordPolicy.LockoutDuration != nil {
			pp.LockoutDuration = *update.PasswordPolicy.LockoutDuration
		}
		cfg.PasswordPolicy = pp
	}
	tenant.Config = cfg

	return s.tenantRepo.Update(ctx, tenant)
}
```

- [ ] **Step 2.6: Register the route in `RegisterRoutes`**

In `tenant_handler.go`, inside `RegisterRoutes`, add after the `admin` group:

```go
// Tenant self-service config — authenticated tenant users only (not platform-scoped).
selfService := rg.Group("/tenants/me")
selfService.Use(h.authMiddleware)
{
	selfService.PUT("/config",
		middleware.RequirePermission("tenant.settings.update"),
		h.UpdateMyConfig,
	)
}
```

- [ ] **Step 2.7: Run tests**

```bash
cd authz
go test ./internal/delivery/http/handler/... -run TestUpdateMyConfig -v
```

Expected: PASS

- [ ] **Step 2.8: Run full test suite**

```bash
cd authz
go test ./... 2>&1 | tail -20
```

Expected: no new failures.

- [ ] **Step 2.9: Commit**

```bash
cd authz
git add internal/delivery/http/handler/tenant_handler.go \
        internal/delivery/http/handler/tenant_handler_myconfig_test.go \
        internal/delivery/http/request/tenant_requests.go \
        internal/application/tenant_service.go \
        internal/domain/entities.go
git commit -m "feat(authz): add PUT /v1/tenants/me/config self-service endpoint"
```

---

## Task 3: Register `tenant.settings.update` permission and assign to tenant-admin role

**Files:**
- Modify: `authz/pkg/permseeder/seeder.go` (or whichever file seeds default permissions at provisioning)

- [ ] **Step 3.1: Locate where default tenant-admin permissions are seeded**

```bash
cd authz
grep -rn "tenant.admin\|tenant_admin\|admin.*role\|default.*role" pkg/permseeder/ internal/application/ --include="*.go" | head -20
```

- [ ] **Step 3.2: Add `tenant.settings.update` to the permission seed list**

In the seeder/provisioning file found above, add `tenant.settings.update` to the list of permissions registered and assigned to the default tenant-admin role. Example pattern (adapt to match the file's existing style):

```go
{Name: "tenant.settings.update", Label: "Update Tenant Security Settings", Category: "Tenant", Module: "settings"},
```

- [ ] **Step 3.3: Verify the permission appears after seeding**

```bash
cd authz
go test ./pkg/permseeder/... -v 2>&1 | tail -30
```

- [ ] **Step 3.4: Commit**

```bash
cd authz
git add pkg/permseeder/
git commit -m "feat(authz): register tenant.settings.update permission for tenant-admin role"
```

---

## Task 4: Add `updateMyConfig` to authzkit JS client

**Files:**
- Modify: `authz/frontend/packages/authzkit-client/src/resources/tenants.js`
- Modify: `authz/frontend/packages/authzkit-client/src/index.d.ts`

- [ ] **Step 4.1: Add `updateMyConfig` method to `TenantsResource`**

In `authz/frontend/packages/authzkit-client/src/resources/tenants.js`, add after the `update` method:

```js
/**
 * Update the calling user's own tenant's password and MFA policies.
 * Requires `tenant.settings.update` permission.
 * Platform-only fields (branches_enabled, allowed_providers) are ignored by the API.
 *
 * @param {object} params
 * @param {string} [params.mfa_policy]              - "required" | "optional" | "disabled"
 * @param {boolean} [params.allow_passwordless_otp]
 * @param {boolean} [params.auto_create_on_otp]
 * @param {object} [params.password_policy]
 * @param {number} [params.password_policy.min_length]
 * @param {boolean} [params.password_policy.require_uppercase]
 * @param {boolean} [params.password_policy.require_digit]
 * @param {boolean} [params.password_policy.require_special_char]
 * @param {number} [params.password_policy.max_failed_attempts]
 * @param {number} [params.password_policy.lockout_duration]      - minutes
 * @returns {Promise<object>} Updated tenant
 */
updateMyConfig(params) {
  return this._http.put('/tenants/me/config', params);
}
```

- [ ] **Step 4.2: Add TypeScript declaration**

In `authz/frontend/packages/authzkit-client/src/index.d.ts`, find the `TenantsResource` interface and add:

```ts
updateMyConfig(params: {
  mfa_policy?: 'required' | 'optional' | 'disabled';
  allow_passwordless_otp?: boolean;
  auto_create_on_otp?: boolean;
  password_policy?: {
    min_length?: number;
    require_uppercase?: boolean;
    require_digit?: boolean;
    require_special_char?: boolean;
    max_failed_attempts?: number;
    lockout_duration?: number;
  };
}): Promise<object>;
```

- [ ] **Step 4.3: Rebuild the client package**

```bash
cd authz/frontend/packages/authzkit-client
node build.js
```

Expected: dist files updated with no errors.

- [ ] **Step 4.4: Commit**

```bash
cd authz/frontend/packages/authzkit-client
git add src/resources/tenants.js src/index.d.ts
git commit -m "feat(authzkit-client): add updateMyConfig method for tenant self-service config"
```

---

## Task 5: Update roadmap

**Files:**
- Modify: `docs/superpowers/modules/m01/roadmap.md`

- [ ] **Step 5.1: Mark P1 tasks complete in roadmap**

In `docs/superpowers/modules/m01/roadmap.md`, update Phase P1 rows 1.1–1.8 from `⬜` to `✅` and the Phase Overview P1 Status from `⬜` to `✅`.

- [ ] **Step 5.2: Commit**

```bash
git add docs/superpowers/modules/m01/roadmap.md
git commit -m "docs: mark M01-P1 complete in roadmap"
```
