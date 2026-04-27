# Module 01 — User Management & Security: API & Permission Gap Fixes

**Date:** 2026-04-27
**Status:** Approved — pending implementation plan
**Module:** M01 — User Management & Security (Admin UI)

## Context

The Module 1 Admin UI (Users, Roles & Permissions, Audit Logs, Auth Policies) is visually
implemented against the Module 1 mockup. However, three functional gaps remain that prevent it
from working correctly for a real tenant admin:

1. **Auth policies calls a platform-only endpoint** — `PUT /admin/tenants/:id` requires
   `tenants.update`, a superadmin permission. A regular tenant admin will hit 403 on save.
2. **No centralised permission system in the web-ui** — each admin view independently calls
   `GET /v1/users/me/permissions` and stores the result in local state. No shared context,
   no route guards, no reusable helpers.
3. **Permission registration not wired at backend startup** — Lekurax permissions
   (`inventory.*`, `rx.*`, `pos.*`, etc.) are never registered with the authz service, so they
   do not appear in the role editor.

## Goals

Close all three gaps as part of Module 1, producing a working end-to-end admin experience for a
tenant admin without requiring platform superadmin credentials.

## Non-Goals

- Session policy (idle timeout, token lifetime per tenant) — deferred; requires deeper authz
  token-issuance changes.
- Any new admin pages beyond the four already implemented (Users, Roles, Audit, Auth Policies).
- Changes to the Lekurax backend domain logic beyond startup permission registration.

---

## Part 1 — Authz Service: Tenant Self-Service Config Endpoint

### New endpoint

```
PUT /v1/tenants/me/config
```

- **Auth**: Bearer token required (standard auth middleware).
- **Permission**: `tenant.settings.update` — a new tenant-scoped permission, NOT a platform
  permission. Enforced via `middleware.RequirePermission("tenant.settings.update")`.
- **Tenant scope**: derived entirely from the caller's JWT `tenant_id` claim. No tenant ID in
  the path — a user cannot update another tenant's config.
- **Accepted fields** (partial update — only present keys are applied):
  ```json
  {
    "mfa_policy": "optional | required | disabled",
    "allow_passwordless_otp": true,
    "auto_create_on_otp": false,
    "password_policy": {
      "min_length": 12,
      "require_uppercase": true,
      "require_digit": true,
      "require_special_char": true,
      "max_failed_attempts": 5,
      "lockout_duration": 15
    }
  }
  ```
- **Excluded fields**: `branches_enabled`, `is_platform_tenant`, `allowed_providers` — these
  remain platform-only.
- **Response**: `200 OK` with the updated tenant object (same shape as `GET /admin/tenants/:id`).

### New permission registration

`tenant.settings.update` must be registered in the authz permission registry and assigned to
the default **tenant-admin** role created during tenant provisioning.

### Authzkit JS client update

New method on `TenantsResource`:

```js
updateMyConfig(params) {
  return this._http.put('/tenants/me/config', params);
}
```

### Go handler location

New method `UpdateMyConfig` on the existing `TenantHandler`, registered as:

```go
rg.PUT("/tenants/me/config",
  h.authMiddleware,
  middleware.RequirePermission("tenant.settings.update"),
  h.UpdateMyConfig,
)
```

---

## Part 2 — Lekurax Web-UI: Centralised Permission System

Mirrors the console's three-layer system exactly.

### Layer 1 — `src/auth/permissions.js`

Pure helper functions, no React dependency:

| Export | Signature | Behaviour |
|---|---|---|
| `permissionGranted` | `(perms[], name) → bool` | true if `*` or exact match |
| `permissionGrantedAny` | `(perms[], names[]) → bool` | true if any match |
| `permissionGrantedAll` | `(perms[], names[]) → bool` | true if all match |
| `seedCachedPermissions` | `(perms[]) → void` | pre-fills in-memory cache |
| `clearPermissionCache` | `() → void` | clears cache on logout |

In-memory cache with 30-minute TTL to avoid redundant API calls.

### Layer 2 — `src/auth/PermissionContext.jsx`

React context provider:

- Fetches `GET /v1/users/me/permissions` via `authzkit.users.getMyPermissions()` on mount
  and on each route change (same trigger as the console).
- Seeds the `permissions.js` cache via `seedCachedPermissions`.
- Exposes: `{ permissions, roleNames, loading, hasPermission, hasAny, hasAll, refresh }`.
- On logout / unauthenticated state: clears cache and returns empty arrays.

```jsx
export function usePermissions() { ... }          // throws if outside provider
export function usePermissionsOptional() { ... }  // returns null if outside provider
```

### Layer 3 — `src/auth/PermissionRoute.jsx`

Route guard component:

```jsx
<PermissionRoute permission="users.list">
  <AdminUsersView />
</PermissionRoute>
```

Props: `permission` (single), `anyOf` (array), `allOf` (array), `redirectTo` (default `/`).

- While `loading`: renders a centred spinner.
- Unauthenticated (no auth token in storage): redirects to `/sign-in`.
- Permission denied: redirects to `redirectTo`.

### Wiring in `App.jsx`

`PermissionProvider` wraps all protected routes, nested inside `AuthContext`:

```jsx
<AuthContext>
  <PermissionProvider>
    <Routes>...</Routes>
  </PermissionProvider>
</AuthContext>
```

All four admin routes wrapped with `PermissionRoute`:

| Route | Required permission |
|---|---|
| `/admin/users` | `users.list` |
| `/admin/roles` | `roles.list` |
| `/admin/audit` | `audit.view` |
| `/admin/auth-policies` | `tenant.settings.update` |

### Admin page cleanup

Remove the three ad-hoc `getMyPermissions()` fetch + local state patterns from:
- `AdminUsersView.jsx`
- `AdminRolesView.jsx`
- `AdminAuthPoliciesView.jsx`

Replace with `const { hasPermission, hasAny } = usePermissions()`.

All permission-gated UI elements across admin pages:

| Component | Gate |
|---|---|
| AdminUsersView — "Add User" button | `users.create` |
| AdminUsersView — edit action | `users.update` |
| AdminUsersView — delete action | `users.delete` |
| UserUpsertModal — role assignment | `users.roles.assign` |
| UserUpsertModal — branch assignment | `branches.users.assign` |
| UserDetailsModal — delete | `users.delete` |
| AdminRolesView — "Add Role" button | `roles.create` |
| AdminRolesView — edit action | `roles.update` |
| AdminRolesView — delete action | `roles.delete` |
| AdminAuthPoliciesView — "Save" button | `tenant.settings.update` |

---

## Part 3 — Lekurax Backend: Permission Registration at Startup

### Mechanism

At server startup, after all services are initialised, call:

```
POST /v1/permissions/register
X-Service-Key: <config.authz.service_api_key>
Content-Type: application/json
```

Body: the full canonical list of Lekurax permissions.

### Permission manifest (initial)

| Name | Label | Module |
|---|---|---|
| `inventory.products.create` | Create Products | Inventory |
| `inventory.products.list` | List Products | Inventory |
| `inventory.products.view` | View Product | Inventory |
| `inventory.products.update` | Update Product | Inventory |
| `inventory.stock.receive` | Receive Stock | Inventory |
| `inventory.stock.adjust` | Adjust Stock | Inventory |
| `inventory.stock.view` | View Stock | Inventory |
| `pricing.price.set` | Set Product Price | Pricing |
| `pricing.quote` | Quote Cart | Pricing |
| `pricing.tax.manage` | Manage Tax Rules | Pricing |
| `patients.create` | Create Patient | Patients |
| `patients.list` | List Patients | Patients |
| `patients.view` | View Patient | Patients |
| `patients.update` | Update Patient | Patients |
| `patients.allergies.manage` | Manage Allergies | Patients |
| `patients.allergies.view` | View Allergies | Patients |
| `rx.create` | Create Prescription | Prescriptions |
| `rx.list` | List Prescriptions | Prescriptions |
| `rx.view` | View Prescription | Prescriptions |
| `rx.items.manage` | Manage Rx Items | Prescriptions |
| `rx.submit` | Submit Prescription | Prescriptions |
| `rx.dispense` | Dispense Prescription | Prescriptions |
| `pos.sales.create` | Create Sale | POS |
| `pos.sales.list` | List Sales | POS |
| `pos.sales.view` | View Sale | POS |

### Implementation location

New function `registerPermissions(ctx context.Context, cfg *config.Config)` in
`internal/server/server.go` (or a dedicated `internal/authzkit/permreg.go`), called after
`httpserver.RegisterRoutes` before `srv.ListenAndServe`.

### Failure behaviour

- On network error or non-2xx response: log warning `"[startup] permission registration failed: %v"` and continue.
- On success: log info `"[startup] registered N permissions with authz service"`.
- Do NOT block server startup on failure.

---

## Data Flow Summary

```
Browser (tenant admin)
  │
  ├─ App load: PermissionProvider → GET /v1/users/me/permissions
  │            seeds permission cache, provides usePermissions()
  │
  ├─ /admin/users: PermissionRoute("users.list") → AdminUsersView
  │                "Add User" shown only if hasPermission("users.create")
  │                Create: POST /v1/auth/register (public) + POST /v1/users/:id/roles
  │
  ├─ /admin/roles: PermissionRoute("roles.list") → AdminRolesView
  │                Permission list populated (registered by Lekurax startup)
  │
  └─ /admin/auth-policies: PermissionRoute("tenant.settings.update")
                           Save: PUT /v1/tenants/me/config (new self-service endpoint)

Lekurax server startup
  └─ POST /v1/permissions/register (X-Service-Key) → authz service
     registers all inventory/rx/pos/patients/pricing permissions
```

---

## Testing

- **Authz**: integration test for `PUT /v1/tenants/me/config` — verify tenant isolation (caller
  can only update their own tenant), verify platform-only fields are ignored, verify 403 without
  `tenant.settings.update`.
- **Web-ui**: update existing admin view tests to mount `PermissionProvider` in test setup;
  assert permission-gated buttons are hidden/shown correctly.
- **Backend startup**: unit test for permission manifest completeness (every route permission
  constant appears in the registered list).
