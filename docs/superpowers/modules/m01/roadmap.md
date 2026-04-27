# Module 01 — User Management & Security: Roadmap

> Each phase links to its plan file. Executors mark tasks ✅ when done and update **Status** column.

## Legend
| Symbol | Meaning |
|---|---|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Complete |
| ❌ | Blocked |

---

## Phase Overview

| Phase | Description | Plan | Status |
|---|---|---|---|
| P0 | Admin UI shell & navigation (mockup replication) | (completed before this roadmap) | ✅ |
| P1 | Authz — tenant self-service config endpoint | [plan-p1-authz-self-service.md](plan-p1-authz-self-service.md) | ⬜ |
| P2 | Lekurax web-ui — centralised permission system | [plan-p2-permission-system.md](plan-p2-permission-system.md) | ⬜ |
| P3 | Lekurax web-ui — admin page permission wiring | [plan-p3-admin-permission-wiring.md](plan-p3-admin-permission-wiring.md) | ⬜ |
| P4 | Lekurax backend — permission registration at startup | [plan-p4-permission-registration.md](plan-p4-permission-registration.md) | ⬜ |

---

## Phase P1 — Authz: Tenant Self-Service Config Endpoint

**Goal:** Tenant admins can update their own password + MFA policies without platform credentials.

| # | Task | File / Location | Status |
|---|---|---|---|
| 1.1 | Add `tenant.settings.update` to permission registry in authz | `authz/internal/domain/` or migration | ⬜ |
| 1.2 | Implement `UpdateMyConfig` handler in `TenantHandler` | `authz/internal/delivery/http/handler/tenant_handler.go` | ⬜ |
| 1.3 | Register `PUT /v1/tenants/me/config` route | `authz/internal/delivery/http/handler/tenant_handler.go` | ⬜ |
| 1.4 | Assign `tenant.settings.update` to default tenant-admin role in provisioning | `authz/internal/application/` | ⬜ |
| 1.5 | Add `updateMyConfig(params)` to authzkit JS client `TenantsResource` | `authz/frontend/packages/authzkit-client/src/resources/tenants.js` | ⬜ |
| 1.6 | Add `updateMyConfig` type signature to `index.d.ts` | `authz/frontend/packages/authzkit-client/src/index.d.ts` | ⬜ |
| 1.7 | Write integration test for new endpoint | `authz/test/integration/` | ⬜ |
| 1.8 | Rebuild & publish authzkit-client package | `authz/frontend/packages/authzkit-client/` | ⬜ |

---

## Phase P2 — Web-UI: Centralised Permission System

**Goal:** Single source of truth for permissions across all Lekurax frontend pages.

| # | Task | File / Location | Status |
|---|---|---|---|
| 2.1 | Create `permissions.js` helper (granted/any/all/cache) | `frontend/web-ui/src/auth/permissions.js` | ⬜ |
| 2.2 | Create `PermissionContext.jsx` provider + `usePermissions` hook | `frontend/web-ui/src/auth/PermissionContext.jsx` | ⬜ |
| 2.3 | Create `PermissionRoute.jsx` route guard | `frontend/web-ui/src/auth/PermissionRoute.jsx` | ⬜ |
| 2.4 | Wire `PermissionProvider` into `App.jsx` inside `AuthContext` | `frontend/web-ui/src/App.jsx` | ⬜ |
| 2.5 | Write unit tests for `permissions.js` helpers | `frontend/web-ui/src/test/` | ⬜ |
| 2.6 | Write tests for `PermissionContext` (mock `getMyPermissions`) | `frontend/web-ui/src/auth/` | ⬜ |

---

## Phase P3 — Web-UI: Admin Page Permission Wiring

**Goal:** All admin pages use `usePermissions()` hook; all action buttons are gated correctly.

| # | Task | File / Location | Status |
|---|---|---|---|
| 3.1 | Remove ad-hoc `getMyPermissions` + local perms state from `AdminUsersView` | `frontend/web-ui/src/admin/users/AdminUsersView.jsx` | ⬜ |
| 3.2 | Gate "Add User" on `users.create`; gate edit/delete on respective perms | `frontend/web-ui/src/admin/users/AdminUsersView.jsx` | ⬜ |
| 3.3 | Remove ad-hoc `getMyPermissions` from `AdminRolesView` | `frontend/web-ui/src/admin/roles/AdminRolesView.jsx` | ⬜ |
| 3.4 | Gate role create/edit/delete buttons via `usePermissions()` | `frontend/web-ui/src/admin/roles/AdminRolesView.jsx` | ⬜ |
| 3.5 | Remove ad-hoc `getMyPermissions` from `AdminAuthPoliciesView` | `frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx` | ⬜ |
| 3.6 | Switch auth policies save to `authzkit.tenants.updateMyConfig()` | `frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx` | ⬜ |
| 3.7 | Gate auth policies save button on `tenant.settings.update` | `frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx` | ⬜ |
| 3.8 | Wire `usePermissions()` in `UserUpsertModal` (role + branch assignment gates) | `frontend/web-ui/src/admin/users/UserUpsertModal.jsx` | ⬜ |
| 3.9 | Wire `usePermissions()` in `UserDetailsModal` (delete gate) | `frontend/web-ui/src/admin/users/UserDetailsModal.jsx` | ⬜ |
| 3.10 | Wrap admin routes in `App.jsx` with `PermissionRoute` | `frontend/web-ui/src/App.jsx` | ⬜ |
| 3.11 | Update admin view tests to mount `PermissionProvider` in setup | `frontend/web-ui/src/admin/**/__tests__/` | ⬜ |

---

## Phase P4 — Backend: Permission Registration at Startup

**Goal:** All Lekurax permissions appear in the authz role editor on first boot.

| # | Task | File / Location | Status |
|---|---|---|---|
| 4.1 | Define permission manifest (all constants with label + module) | `internal/authzkit/permreg.go` (new file) | ⬜ |
| 4.2 | Implement `registerPermissions()` startup function | `internal/authzkit/permreg.go` | ⬜ |
| 4.3 | Call `registerPermissions()` from server startup after routes are wired | `internal/server/server.go` | ⬜ |
| 4.4 | Verify `config.authz.service_api_key` is forwarded as `X-Service-Key` | `internal/server/server.go` | ⬜ |
| 4.5 | Write unit test asserting manifest covers all permission strings used in `api.go` | `internal/authzkit/permreg_test.go` | ⬜ |

---

## Spec & Design Reference

- **Spec:** [spec.md](spec.md)
- **Prior admin UI shell spec:** [../specs/2026-04-26-module-1-admin-ui-shell-overwrite-design.md](../specs/2026-04-26-module-1-admin-ui-shell-overwrite-design.md)
- **Prior user management spec:** [../specs/2026-04-26-module-1-user-management-security-design.md](../specs/2026-04-26-module-1-user-management-security-design.md)
- **Authz integration guide:** [../../../authz/docs/00_auth_service_backend_integration_guide.md](../../../authz/docs/00_auth_service_backend_integration_guide.md)
