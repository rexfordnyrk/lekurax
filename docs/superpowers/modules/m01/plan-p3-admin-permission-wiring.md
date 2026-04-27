# M01-P3: Lekurax Web-UI — Admin Page Permission Wiring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every ad-hoc `getMyPermissions()` fetch in admin views with the centralised `usePermissions()` hook, gate all action buttons correctly, switch auth policies save to the new self-service endpoint, and wrap admin routes with `PermissionRoute`.

**Architecture:** Pure refactor of existing admin components — no new files, no business logic changes. Each view drops its local permissions state and reads from `PermissionContext` instead.

**Tech Stack:** React 18, React Router v6, Vitest + @testing-library/react. Working directory: `frontend/web-ui/`.

**Dependencies:**
- M01-P1 must be complete (provides `authzkit.tenants.updateMyConfig()`)
- M01-P2 must be complete (provides `usePermissions()`, `PermissionRoute`)

---

## File Map

| Action | Path | What changes |
|---|---|---|
| Modify | `frontend/web-ui/src/admin/users/AdminUsersView.jsx` | Remove ad-hoc fetch; add `users.create/update/delete` gates |
| Modify | `frontend/web-ui/src/admin/users/UserUpsertModal.jsx` | Add `users.roles.assign` + `branches.users.assign` gates |
| Modify | `frontend/web-ui/src/admin/users/UserDetailsModal.jsx` | Add `users.delete` gate via hook |
| Modify | `frontend/web-ui/src/admin/roles/AdminRolesView.jsx` | Remove ad-hoc fetch; add `roles.create/update/delete` gates |
| Modify | `frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx` | Remove ad-hoc fetch; switch to `updateMyConfig`; gate on `tenant.settings.update` |
| Modify | `frontend/web-ui/src/App.jsx` | Wrap admin routes with `PermissionRoute` |
| Modify | `frontend/web-ui/src/admin/users/__tests__/AdminUsersView.test.jsx` | Add `PermissionProvider` to test setup |
| Modify | `frontend/web-ui/src/admin/roles/__tests__/AdminRolesView.test.jsx` | Add `PermissionProvider` to test setup |
| Modify | `frontend/web-ui/src/admin/auth-policies/__tests__/AdminAuthPoliciesView.test.jsx` | Add `PermissionProvider` to test setup |

---

## Task 1: Fix `AdminUsersView.jsx`

**Files:**
- Modify: `frontend/web-ui/src/admin/users/AdminUsersView.jsx`
- Modify: `frontend/web-ui/src/admin/users/__tests__/AdminUsersView.test.jsx`

- [ ] **Step 1.1: Update the test setup to include `PermissionProvider`**

In `AdminUsersView.test.jsx`, find the render helper and wrap with `PermissionProvider`. Add a mock for `authzkit.users.getMyPermissions` returning the required permissions:

```jsx
import { PermissionProvider } from '../../../auth/PermissionContext.jsx';

// In vi.mock or beforeEach:
authzkit.users.getMyPermissions = vi.fn().mockResolvedValue({
  permissions: ['users.list', 'users.create', 'users.update', 'users.delete',
                'users.roles.assign', 'users.roles.revoke', 'branches.list',
                'branches.users.assign'],
  roles: ['admin'],
});

// Wrap renders:
const renderView = () =>
  render(
    <MemoryRouter>
      <PermissionProvider>
        <AdminUsersView />
      </PermissionProvider>
    </MemoryRouter>
  );
```

- [ ] **Step 1.2: Run existing tests to establish baseline**

```bash
cd frontend/web-ui
npx vitest run src/admin/users/__tests__/AdminUsersView.test.jsx
```

Note which tests pass/fail before any changes.

- [ ] **Step 1.3: Remove the ad-hoc permissions fetch from `AdminUsersView.jsx`**

Delete the following pattern (fetch + state + useEffect) from `AdminUsersView.jsx`:

```jsx
// DELETE these:
const [perms, setPerms] = useState([]);
// ... any useEffect that calls authzkit.users.getMyPermissions()
// ... any local canXxx derived from perms array
```

- [ ] **Step 1.4: Replace with `usePermissions()` hook**

Add at the top of the `AdminUsersView` component body:

```jsx
import { usePermissions } from '../../auth/PermissionContext.jsx';

// Inside component:
const { hasPermission } = usePermissions();
const canCreate = hasPermission('users.create');
const canUpdate = hasPermission('users.update');
const canDelete = hasPermission('users.delete');
```

- [ ] **Step 1.5: Gate the "Add User" button on `users.create`**

Find the "Add User" / "Invite User" / "Create User" button and ensure it is conditionally rendered:

```jsx
{canCreate && (
  <button ... onClick={() => setCreateOpen(true)}>
    Add User
  </button>
)}
```

- [ ] **Step 1.6: Gate edit and delete row actions**

```jsx
// Edit action:
{canUpdate && <button onClick={() => openEdit(user)}>Edit</button>}

// Delete action:
{canDelete && <button onClick={() => setDeleteUser(user)}>Delete</button>}
```

- [ ] **Step 1.7: Run tests**

```bash
cd frontend/web-ui
npx vitest run src/admin/users/__tests__/AdminUsersView.test.jsx
```

Expected: all existing tests still pass; no regressions.

- [ ] **Step 1.8: Commit**

```bash
git add frontend/web-ui/src/admin/users/AdminUsersView.jsx \
        frontend/web-ui/src/admin/users/__tests__/AdminUsersView.test.jsx
git commit -m "refactor(web-ui): AdminUsersView uses usePermissions hook"
```

---

## Task 2: Fix `UserUpsertModal.jsx` and `UserDetailsModal.jsx`

**Files:**
- Modify: `frontend/web-ui/src/admin/users/UserUpsertModal.jsx`
- Modify: `frontend/web-ui/src/admin/users/UserDetailsModal.jsx`

- [ ] **Step 2.1: Add `usePermissions` to `UserUpsertModal`**

```jsx
import { usePermissions } from '../../auth/PermissionContext.jsx';

// Inside component:
const { hasPermission } = usePermissions();
const canAssignRole = hasPermission('users.roles.assign');
const canAssignBranch = hasPermission('branches.users.assign');
```

- [ ] **Step 2.2: Gate role and branch assignment fields in `UserUpsertModal`**

Find the role selector and branch selector and wrap in conditionals:

```jsx
{canAssignRole && (
  <div>
    {/* role selector field */}
  </div>
)}
{canAssignBranch && (
  <div>
    {/* branch selector field */}
  </div>
)}
```

- [ ] **Step 2.3: Add `usePermissions` to `UserDetailsModal`**

```jsx
import { usePermissions } from '../../auth/PermissionContext.jsx';

// Inside component:
const { hasPermission } = usePermissions();
const canDelete = hasPermission('users.delete');
```

- [ ] **Step 2.4: Gate delete button in `UserDetailsModal`**

```jsx
{canDelete && (
  <button onClick={() => onDelete(user)}>Delete User</button>
)}
```

- [ ] **Step 2.5: Commit**

```bash
git add frontend/web-ui/src/admin/users/UserUpsertModal.jsx \
        frontend/web-ui/src/admin/users/UserDetailsModal.jsx
git commit -m "refactor(web-ui): user modals use usePermissions hook"
```

---

## Task 3: Fix `AdminRolesView.jsx`

**Files:**
- Modify: `frontend/web-ui/src/admin/roles/AdminRolesView.jsx`
- Modify: `frontend/web-ui/src/admin/roles/__tests__/AdminRolesView.test.jsx`

- [ ] **Step 3.1: Update test setup — wrap with `PermissionProvider` and mock `getMyPermissions`**

```jsx
// In AdminRolesView.test.jsx:
import { PermissionProvider } from '../../../auth/PermissionContext.jsx';

authzkit.users.getMyPermissions = vi.fn().mockResolvedValue({
  permissions: ['roles.list', 'roles.create', 'roles.update', 'roles.delete',
                'roles.permissions.assign', 'roles.permissions.revoke', 'permissions.list'],
  roles: ['admin'],
});

const renderView = () =>
  render(
    <MemoryRouter>
      <PermissionProvider>
        <AdminRolesView />
      </PermissionProvider>
    </MemoryRouter>
  );
```

- [ ] **Step 3.2: Remove ad-hoc `getMyPermissions` from `AdminRolesView.jsx`**

Delete the local `perms` state and the `useEffect` that fetches permissions.

- [ ] **Step 3.3: Replace with `usePermissions()`**

```jsx
import { usePermissions } from '../../auth/PermissionContext.jsx';

const { hasPermission } = usePermissions();
const canCreate = hasPermission('roles.create');
const canUpdate = hasPermission('roles.update');
const canDelete = hasPermission('roles.delete');
```

- [ ] **Step 3.4: Gate role action buttons**

```jsx
{canCreate && <button onClick={openCreateModal}>Add Role</button>}
// In table rows:
{canUpdate && <button onClick={() => openEdit(role)}>Edit</button>}
{canDelete && <button onClick={() => setDeleteRole(role)}>Delete</button>}
```

- [ ] **Step 3.5: Run tests**

```bash
cd frontend/web-ui
npx vitest run src/admin/roles/__tests__/AdminRolesView.test.jsx
```

- [ ] **Step 3.6: Commit**

```bash
git add frontend/web-ui/src/admin/roles/AdminRolesView.jsx \
        frontend/web-ui/src/admin/roles/__tests__/AdminRolesView.test.jsx
git commit -m "refactor(web-ui): AdminRolesView uses usePermissions hook"
```

---

## Task 4: Fix `AdminAuthPoliciesView.jsx`

**Files:**
- Modify: `frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx`
- Modify: `frontend/web-ui/src/admin/auth-policies/__tests__/AdminAuthPoliciesView.test.jsx`

- [ ] **Step 4.1: Update test setup**

```jsx
// In AdminAuthPoliciesView.test.jsx:
import { PermissionProvider } from '../../../auth/PermissionContext.jsx';

authzkit.users.getMyPermissions = vi.fn().mockResolvedValue({
  permissions: ['tenant.settings.update'],
  roles: ['admin'],
});
authzkit.tenants.updateMyConfig = vi.fn().mockResolvedValue({});

const renderView = () =>
  render(
    <MemoryRouter>
      <PermissionProvider>
        <AdminAuthPoliciesView />
      </PermissionProvider>
    </MemoryRouter>
  );
```

- [ ] **Step 4.2: Remove ad-hoc `getMyPermissions` from `AdminAuthPoliciesView.jsx`**

Delete the `perms` state, the `useEffect` that fetches permissions, and the `canUpdateTenant` derived variable.

- [ ] **Step 4.3: Replace with `usePermissions()`**

```jsx
import { usePermissions } from '../../auth/PermissionContext.jsx';

const { hasPermission } = usePermissions();
const canUpdatePolicies = hasPermission('tenant.settings.update');
```

- [ ] **Step 4.4: Switch save call from `tenants.update` to `tenants.updateMyConfig`**

Find the `onSave` function. Replace:

```jsx
// Before:
await authzkit.tenants.update(tenantId, { config: { ... } });

// After:
await authzkit.tenants.updateMyConfig({
  mfa_policy: mfaPolicy,
  allow_passwordless_otp: Boolean(allowPasswordlessOtp),
  auto_create_on_otp: Boolean(autoCreateOnOtp),
  password_policy: {
    min_length: Number(minLength),
    require_uppercase: Boolean(requireUpper),
    require_digit: Boolean(requireDigit),
    require_special_char: Boolean(requireSpecial),
    max_failed_attempts: Number(maxFailedAttempts),
    lockout_duration: Number(lockoutDurationMins),
  },
});
```

Also remove the `tenantId` state and the lookup step that was needed only to obtain the tenant ID for `tenants.update`. The new endpoint derives tenant from the JWT.

- [ ] **Step 4.5: Gate Save button on `tenant.settings.update`**

```jsx
<button
  onClick={onSave}
  disabled={saving || !canUpdatePolicies}
>
  {canUpdatePolicies ? 'Save Changes' : 'No permission to save'}
</button>
```

- [ ] **Step 4.6: Run tests**

```bash
cd frontend/web-ui
npx vitest run src/admin/auth-policies/__tests__/AdminAuthPoliciesView.test.jsx
```

- [ ] **Step 4.7: Commit**

```bash
git add frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx \
        frontend/web-ui/src/admin/auth-policies/__tests__/AdminAuthPoliciesView.test.jsx
git commit -m "fix(web-ui): AdminAuthPoliciesView uses self-service endpoint + usePermissions"
```

---

## Task 5: Wrap admin routes with `PermissionRoute` in `App.jsx`

**Files:**
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 5.1: Import `PermissionRoute`**

```jsx
import PermissionRoute from './auth/PermissionRoute.jsx';
```

- [ ] **Step 5.2: Wrap each admin route**

Find the admin route declarations and wrap each with `PermissionRoute`:

```jsx
<Route
  path="/admin/users"
  element={
    <PermissionRoute permission="users.list">
      <AdminUsersView />
    </PermissionRoute>
  }
/>
<Route
  path="/admin/roles"
  element={
    <PermissionRoute permission="roles.list">
      <AdminRolesView />
    </PermissionRoute>
  }
/>
<Route
  path="/admin/audit"
  element={
    <PermissionRoute permission="audit.view">
      <AdminAuditLogsView />
    </PermissionRoute>
  }
/>
<Route
  path="/admin/auth-policies"
  element={
    <PermissionRoute permission="tenant.settings.update">
      <AdminAuthPoliciesView />
    </PermissionRoute>
  }
/>
```

- [ ] **Step 5.3: Run full test suite**

```bash
cd frontend/web-ui
npx vitest run
```

Expected: all pass, no regressions.

- [ ] **Step 5.4: Verify in browser — sign in as a user WITHOUT `users.list`**

With the dev server running (`npm run dev`), navigate to `/admin/users`. Confirm the route redirects to `/` instead of showing the page.

- [ ] **Step 5.5: Verify in browser — sign in as a user WITH `users.list`**

Navigate to `/admin/users`. Confirm the page loads. If "Add User" button is absent for a user without `users.create`, the gate is working.

- [ ] **Step 5.6: Commit**

```bash
git add frontend/web-ui/src/App.jsx
git commit -m "feat(web-ui): wrap admin routes with PermissionRoute guards"
```

---

## Task 6: Update roadmap

- [ ] **Step 6.1: Mark P3 tasks complete**

In `docs/superpowers/modules/m01/roadmap.md`, update Phase P3 rows 3.1–3.11 to `✅` and Phase Overview P3 Status to `✅`.

- [ ] **Step 6.2: Commit**

```bash
git add docs/superpowers/modules/m01/roadmap.md
git commit -m "docs: mark M01-P3 complete in roadmap"
```
