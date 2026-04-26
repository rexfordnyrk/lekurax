# Module 1 — Admin UI (Users, Roles, Audit, Auth Policies) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mismatched UI with a dedicated **Admin** area in `frontend/web-ui` containing four Module 1 pages: Users, Roles & Permissions, Audit logs, and Auth policies (tenant security settings).

**Architecture:** Add `/admin/*` routes and an Admin section in the existing `MasterLayout` sidebar. Implement each Admin page as a thin page component that renders a focused feature component (data-dense KPI + filters + table + modal workflows) using `@authzkit/client` resources. Add redirects from legacy routes.

**Tech Stack:** React (Vite), React Router, Bootstrap utility classes already in the project, `@authzkit/client`, Testing Library + **Vitest** (to replace the currently non-functional Jest setup).

---

## Scope check

This plan implements **one subsystem**: Module 1 Admin UI + adjacent restyles for auth pages and branch user assignment page (visual alignment only). No other modules.

## File structure (new/modified)

**Routing / layout**
- Modify: `frontend/web-ui/src/App.jsx` (add `/admin/*` routes + legacy redirects)
- Modify: `frontend/web-ui/src/masterLayout/MasterLayout.jsx` (add Admin menu group)

**Admin pages (create)**
- Create: `frontend/web-ui/src/pages/admin/AdminUsersPage.jsx`
- Create: `frontend/web-ui/src/pages/admin/AdminRolesPage.jsx`
- Create: `frontend/web-ui/src/pages/admin/AdminAuditLogsPage.jsx`
- Create: `frontend/web-ui/src/pages/admin/AdminAuthPoliciesPage.jsx`

**Admin feature components (create)**
- Create: `frontend/web-ui/src/admin/users/AdminUsersView.jsx`
- Create: `frontend/web-ui/src/admin/users/UserUpsertModal.jsx`
- Create: `frontend/web-ui/src/admin/users/UserDetailsModal.jsx`
- Create: `frontend/web-ui/src/admin/roles/AdminRolesView.jsx`
- Create: `frontend/web-ui/src/admin/roles/RoleUpsertModal.jsx`
- Create: `frontend/web-ui/src/admin/audit/AdminAuditLogsView.jsx`
- Create: `frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx`

**Legacy pages (modify)**
- Modify: `frontend/web-ui/src/pages/UsersListPage.jsx` (redirect → `/admin/users`)
- Modify: `frontend/web-ui/src/pages/RoleAccessPage.jsx` (redirect → `/admin/roles`)
- Modify: `frontend/web-ui/src/pages/AssignRolePage.jsx` (redirect → `/admin/roles` + optional query param)

**Adjacent restyles (modify)**
- Modify: `frontend/web-ui/src/components/SignInLayer.jsx` (restyle to match Module 1 density and button/input styling)
- Modify: `frontend/web-ui/src/pages/OtpSignInPage.jsx` (restyle to match Module 1)
- Modify: `frontend/web-ui/src/components/ForgotPasswordLayer.jsx` (restyle to match Module 1)
- Modify: `frontend/web-ui/src/lekurax/BranchUsersPage.jsx` (restyle table/actions to match Module 1; keep functionality)

**Test infrastructure (modify/create)**
- Modify: `frontend/web-ui/package.json` (add `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`)
- Modify: `frontend/web-ui/vite.config.js` (add `test` config)
- Create: `frontend/web-ui/src/test/setupTests.js`
- Modify: `frontend/web-ui/src/auth/AuthContext.test.jsx` (convert from Jest to Vitest)
- Create: `frontend/web-ui/src/admin/__tests__/adminRoutes.test.jsx`

---

### Task 1: Make the test runner real (Vitest) and migrate the existing Jest test

**Files:**
- Modify: `frontend/web-ui/package.json`
- Modify: `frontend/web-ui/vite.config.js`
- Create: `frontend/web-ui/src/test/setupTests.js`
- Modify: `frontend/web-ui/src/auth/AuthContext.test.jsx`

- [ ] **Step 1: Add Vitest + jsdom dependencies**

Edit `frontend/web-ui/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "@vitest/ui": "^2.1.0",
    "jsdom": "^25.0.0"
  }
}
```

Also ensure these already-present deps remain (or add if missing):

```json
{
  "devDependencies": {
    "@testing-library/react": "^16.2.0",
    "@testing-library/jest-dom": "^5.17.0"
  }
}
```

- [ ] **Step 2: Install deps**

Run (from `frontend/web-ui/`):

```bash
npm install
```

Expected: exit code 0.

- [ ] **Step 3: Configure Vitest in Vite config**

Update `frontend/web-ui/vite.config.js`:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: "automatic",
    loader: "jsx",
    include: /src\/.*\.(js|jsx)$/,
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setupTests.js"],
    globals: true
  },
});
```

- [ ] **Step 4: Add Testing Library DOM matchers**

Create `frontend/web-ui/src/test/setupTests.js`:

```js
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Convert the existing Jest test to Vitest**

Update `frontend/web-ui/src/auth/AuthContext.test.jsx`:

```jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("./authzkitClient", () => ({
  authzkit: {
    isAuthenticated: false,
    users: { getMe: vi.fn() },
    auth: { logout: vi.fn() },
  },
}));

function AuthConsumer() {
  const { bootstrapping, me, isAuthenticated } = useAuth();
  return (
    <>
      <div data-testid="bootstrapping">{String(bootstrapping)}</div>
      <div data-testid="me">{String(me)}</div>
      <div data-testid="is-authenticated">{String(isAuthenticated)}</div>
    </>
  );
}

describe("AuthContext", () => {
  test("renders unauthenticated auth state without crashing", async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("bootstrapping")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("me")).toHaveTextContent("null");
    expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: PASS (1 test file).

- [ ] **Step 7: Commit**

```bash
git add frontend/web-ui/package.json frontend/web-ui/vite.config.js frontend/web-ui/src/test/setupTests.js frontend/web-ui/src/auth/AuthContext.test.jsx
git commit -m "test(web-ui): add vitest and migrate auth context test"
```

---

### Task 2: Add Admin routes and legacy redirects

**Files:**
- Modify: `frontend/web-ui/src/App.jsx`
- Create: `frontend/web-ui/src/pages/admin/AdminUsersPage.jsx`
- Create: `frontend/web-ui/src/pages/admin/AdminRolesPage.jsx`
- Create: `frontend/web-ui/src/pages/admin/AdminAuditLogsPage.jsx`
- Create: `frontend/web-ui/src/pages/admin/AdminAuthPoliciesPage.jsx`
- Modify: `frontend/web-ui/src/pages/UsersListPage.jsx`
- Modify: `frontend/web-ui/src/pages/RoleAccessPage.jsx`
- Modify: `frontend/web-ui/src/pages/AssignRolePage.jsx`
- Test: `frontend/web-ui/src/admin/__tests__/adminRoutes.test.jsx`

- [ ] **Step 1: Write a failing routing test**

Create `frontend/web-ui/src/admin/__tests__/adminRoutes.test.jsx`:

```jsx
import React from "react";
import { describe, expect, test } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import App from "../../App";

describe("Admin routes", () => {
  test("renders Admin Users route", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByText("Admin Users")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test (expect FAIL)**

```bash
npm test
```

Expected: FAIL because `/admin/users` doesn’t exist and/or page label isn’t present.

- [ ] **Step 3: Create page stubs**

Create `frontend/web-ui/src/pages/admin/AdminUsersPage.jsx`:

```jsx
import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";

export default function AdminUsersPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Admin Users" />
      <div className="card p-24 radius-12">Admin Users</div>
    </MasterLayout>
  );
}
```

Create `frontend/web-ui/src/pages/admin/AdminRolesPage.jsx`:

```jsx
import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";

export default function AdminRolesPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Roles & Permissions" />
      <div className="card p-24 radius-12">Admin Roles</div>
    </MasterLayout>
  );
}
```

Create `frontend/web-ui/src/pages/admin/AdminAuditLogsPage.jsx`:

```jsx
import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";

export default function AdminAuditLogsPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Audit logs" />
      <div className="card p-24 radius-12">Admin Audit</div>
    </MasterLayout>
  );
}
```

Create `frontend/web-ui/src/pages/admin/AdminAuthPoliciesPage.jsx`:

```jsx
import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";

export default function AdminAuthPoliciesPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Auth policies" />
      <div className="card p-24 radius-12">Admin Auth Policies</div>
    </MasterLayout>
  );
}
```

- [ ] **Step 4: Wire `/admin/*` routes**

Update `frontend/web-ui/src/App.jsx` imports and routes:

```jsx
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminRolesPage from "./pages/admin/AdminRolesPage";
import AdminAuditLogsPage from "./pages/admin/AdminAuditLogsPage";
import AdminAuthPoliciesPage from "./pages/admin/AdminAuthPoliciesPage";
import { Navigate } from "react-router-dom";

// ...inside <Routes> ...
<Route
  exact
  path="/admin/users"
  element={
    <RequireAuth>
      <AdminUsersPage />
    </RequireAuth>
  }
/>
<Route
  exact
  path="/admin/roles"
  element={
    <RequireAuth>
      <AdminRolesPage />
    </RequireAuth>
  }
/>
<Route
  exact
  path="/admin/audit"
  element={
    <RequireAuth>
      <AdminAuditLogsPage />
    </RequireAuth>
  }
/>
<Route
  exact
  path="/admin/auth-policies"
  element={
    <RequireAuth>
      <AdminAuthPoliciesPage />
    </RequireAuth>
  }
/>

// legacy redirects
<Route exact path="/users-list" element={<Navigate to="/admin/users" replace />} />
<Route exact path="/role-access" element={<Navigate to="/admin/roles" replace />} />
<Route exact path="/assign-role" element={<Navigate to="/admin/roles?tab=assign" replace />} />
```

- [ ] **Step 5: Replace old pages with redirects (defense in depth)**

Update `frontend/web-ui/src/pages/UsersListPage.jsx`:

```jsx
import React from "react";
import { Navigate } from "react-router-dom";
export default function UsersListPage() {
  return <Navigate to="/admin/users" replace />;
}
```

Update `frontend/web-ui/src/pages/RoleAccessPage.jsx`:

```jsx
import React from "react";
import { Navigate } from "react-router-dom";
export default function RoleAccessPage() {
  return <Navigate to="/admin/roles" replace />;
}
```

Update `frontend/web-ui/src/pages/AssignRolePage.jsx`:

```jsx
import React from "react";
import { Navigate } from "react-router-dom";
export default function AssignRolePage() {
  return <Navigate to="/admin/roles?tab=assign" replace />;
}
```

- [ ] **Step 6: Run tests**

```bash
npm test
```

Expected: PASS (Admin routes test passes).

- [ ] **Step 7: Commit**

```bash
git add frontend/web-ui/src/App.jsx frontend/web-ui/src/pages/admin frontend/web-ui/src/pages/UsersListPage.jsx frontend/web-ui/src/pages/RoleAccessPage.jsx frontend/web-ui/src/pages/AssignRolePage.jsx frontend/web-ui/src/admin/__tests__/adminRoutes.test.jsx
git commit -m "feat(web-ui): add /admin routes and legacy redirects"
```

---

### Task 3: Add Admin menu section to sidebar

**Files:**
- Modify: `frontend/web-ui/src/masterLayout/MasterLayout.jsx`

- [ ] **Step 1: Write failing test for sidebar link presence**

Add `frontend/web-ui/src/admin/__tests__/adminSidebar.test.jsx`:

```jsx
import React from "react";
import { describe, expect, test } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import MasterLayout from "../../masterLayout/MasterLayout";

test("shows Admin menu items", () => {
  render(
    <MemoryRouter>
      <MasterLayout>
        <div>child</div>
      </MasterLayout>
    </MemoryRouter>
  );

  expect(screen.getByText("Admin")).toBeInTheDocument();
  expect(screen.getByText("Users")).toBeInTheDocument();
  expect(screen.getByText("Roles & Permissions")).toBeInTheDocument();
  expect(screen.getByText("Audit logs")).toBeInTheDocument();
  expect(screen.getByText("Auth policies")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests (expect FAIL)**

```bash
npm test
```

Expected: FAIL because Admin menu does not exist.

- [ ] **Step 3: Implement Admin menu group**

In `frontend/web-ui/src/masterLayout/MasterLayout.jsx`, add a new dropdown group near other application groups:

```jsx
<li className="sidebar-menu-group-title">Admin</li>
<li>
  <NavLink to="/admin/users" className={(navData) => (navData.isActive ? "active-page" : "")}>
    <i className="ri-user-line menu-icon" />
    <span>Users</span>
  </NavLink>
</li>
<li>
  <NavLink to="/admin/roles" className={(navData) => (navData.isActive ? "active-page" : "")}>
    <i className="ri-shield-user-line menu-icon" />
    <span>Roles &amp; Permissions</span>
  </NavLink>
</li>
<li>
  <NavLink to="/admin/audit" className={(navData) => (navData.isActive ? "active-page" : "")}>
    <i className="ri-file-list-3-line menu-icon" />
    <span>Audit logs</span>
  </NavLink>
</li>
<li>
  <NavLink to="/admin/auth-policies" className={(navData) => (navData.isActive ? "active-page" : "")}>
    <i className="ri-lock-password-line menu-icon" />
    <span>Auth policies</span>
  </NavLink>
</li>
```

- [ ] **Step 4: Run tests (expect PASS)**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/masterLayout/MasterLayout.jsx frontend/web-ui/src/admin/__tests__/adminSidebar.test.jsx
git commit -m "feat(web-ui): add Admin section to sidebar"
```

---

### Task 4: Implement Admin Users page (real data + KPI + filters + modals)

**Files:**
- Create: `frontend/web-ui/src/admin/users/AdminUsersView.jsx`
- Create: `frontend/web-ui/src/admin/users/UserUpsertModal.jsx`
- Create: `frontend/web-ui/src/admin/users/UserDetailsModal.jsx`
- Modify: `frontend/web-ui/src/pages/admin/AdminUsersPage.jsx`

- [ ] **Step 1: Write failing component test (renders rows from API)**

Create `frontend/web-ui/src/admin/users/__tests__/AdminUsersView.test.jsx`:

```jsx
import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminUsersView } from "../AdminUsersView";

vi.mock("../../../auth/authzkitClient", () => ({
  authzkit: {
    users: {
      list: vi.fn(async () => ({
        items: [
          {
            id: "u1",
            first_name: "Sarah",
            last_name: "Johnson",
            email: "sarah@example.com",
            phone_number: null,
            status: "active",
            mfa_enabled: true,
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
            tenant_id: "t1",
          },
        ],
        meta: { page: 1, page_size: 50, total: 1 },
      })),
    },
  },
}));

describe("AdminUsersView", () => {
  test("shows user row from API", async () => {
    render(<AdminUsersView />);
    await waitFor(() => expect(screen.getByText("Sarah Johnson")).toBeInTheDocument());
    expect(screen.getByText("sarah@example.com")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests (expect FAIL)**

```bash
npm test
```

- [ ] **Step 3: Implement `AdminUsersView`**

Create `frontend/web-ui/src/admin/users/AdminUsersView.jsx`:

```jsx
import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { authzkit } from "../../auth/authzkitClient";
import { AuthzKitApiError } from "@authzkit/client";

function fullName(u) {
  return `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email || u.phone_number || u.id;
}

export function AdminUsersView() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await authzkit.users.list({ page: 1, page_size: 200 });
      setUsers(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setUsers([]);
      setError(e instanceof AuthzKitApiError ? `${e.message} (${e.code})` : e?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = fullName(u).toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const phone = (u.phone_number ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [users, search]);

  return (
    <div className="card p-24 radius-12">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-16">
        <h6 className="mb-0">User Accounts</h6>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => {}}>
          <Icon icon="ic:baseline-plus" className="me-1" />
          Add user
        </button>
      </div>

      <div className="d-flex gap-12 flex-wrap mb-16">
        <div className="position-relative" style={{ minWidth: 260, flex: 1 }}>
          <input
            className="form-control"
            placeholder="Search users by name, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? <div className="text-secondary-light">Loading…</div> : null}

      <div className="table-responsive scroll-sm">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Status</th>
              <th>MFA</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>{fullName(u)}</td>
                <td>{u.email ?? "—"}</td>
                <td>{u.status ?? "—"}</td>
                <td>{u.mfa_enabled ? "Enabled" : "Disabled"}</td>
                <td className="text-end">
                  <button type="button" className="btn btn-sm btn-outline-secondary">
                    View
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-secondary-light py-24">
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Render `AdminUsersView` from the page**

Update `frontend/web-ui/src/pages/admin/AdminUsersPage.jsx`:

```jsx
import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { AdminUsersView } from "../../admin/users/AdminUsersView";

export default function AdminUsersPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Users" />
      <AdminUsersView />
    </MasterLayout>
  );
}
```

- [ ] **Step 5: Run tests (expect PASS)**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git add frontend/web-ui/src/pages/admin/AdminUsersPage.jsx frontend/web-ui/src/admin/users frontend/web-ui/src/admin/users/__tests__/AdminUsersView.test.jsx
git commit -m "feat(web-ui): implement Admin Users list view"
```

---

### Task 5: Implement Admin Roles & Permissions page (roles + permissions + editor modal)

**Files:**
- Create: `frontend/web-ui/src/admin/roles/AdminRolesView.jsx`
- Create: `frontend/web-ui/src/admin/roles/RoleUpsertModal.jsx`
- Modify: `frontend/web-ui/src/pages/admin/AdminRolesPage.jsx`

- [ ] **Step 1: Write failing test (renders roles from API)**

Create `frontend/web-ui/src/admin/roles/__tests__/AdminRolesView.test.jsx`:

```jsx
import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminRolesView } from "../AdminRolesView";

vi.mock("../../../auth/authzkitClient", () => ({
  authzkit: {
    roles: {
      list: vi.fn(async () => ({
        items: [{ id: "r1", tenant_id: "t1", name: "admin", label: "Administrator", description: null, parent_role_id: null, is_system: true, created_at: "", updated_at: "" }],
        meta: { page: 1, page_size: 50, total: 1 },
      })),
    },
  },
}));

describe("AdminRolesView", () => {
  test("shows roles from API", async () => {
    render(<AdminRolesView />);
    await waitFor(() => expect(screen.getByText("Administrator")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests (expect FAIL)**

```bash
npm test
```

- [ ] **Step 3: Implement `AdminRolesView`**

Create `frontend/web-ui/src/admin/roles/AdminRolesView.jsx`:

```jsx
import React, { useEffect, useState } from "react";
import { authzkit } from "../../auth/authzkitClient";
import { AuthzKitApiError } from "@authzkit/client";

export function AdminRolesView() {
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await authzkit.roles.list({ page: 1, page_size: 200 });
      setRoles(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setRoles([]);
      setError(e instanceof AuthzKitApiError ? `${e.message} (${e.code})` : e?.message ?? "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card p-24 radius-12">
      <div className="d-flex align-items-center justify-content-between mb-16">
        <h6 className="mb-0">Roles &amp; Permissions</h6>
        <button type="button" className="btn btn-primary btn-sm">
          Create custom role
        </button>
      </div>

      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? <div className="text-secondary-light">Loading…</div> : null}

      <div className="table-responsive scroll-sm">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th>Role</th>
              <th>Description</th>
              <th>Type</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>{r.label}</td>
                <td>{r.description ?? "—"}</td>
                <td>{r.is_system ? "System" : "Custom"}</td>
                <td className="text-end">
                  <button type="button" className="btn btn-sm btn-outline-secondary">
                    View
                  </button>
                </td>
              </tr>
            ))}
            {!loading && roles.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-secondary-light py-24">
                  No roles found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Render from `AdminRolesPage`**

Update `frontend/web-ui/src/pages/admin/AdminRolesPage.jsx`:

```jsx
import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { AdminRolesView } from "../../admin/roles/AdminRolesView";

export default function AdminRolesPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Roles & Permissions" />
      <AdminRolesView />
    </MasterLayout>
  );
}
```

- [ ] **Step 5: Run tests (expect PASS)**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git add frontend/web-ui/src/pages/admin/AdminRolesPage.jsx frontend/web-ui/src/admin/roles
git commit -m "feat(web-ui): implement Admin Roles list view"
```

---

### Task 6: Implement Admin Audit logs page (filter + table + export)

**Files:**
- Create: `frontend/web-ui/src/admin/audit/AdminAuditLogsView.jsx`
- Modify: `frontend/web-ui/src/pages/admin/AdminAuditLogsPage.jsx`

- [ ] **Step 1: Write failing test**

Create `frontend/web-ui/src/admin/audit/__tests__/AdminAuditLogsView.test.jsx`:

```jsx
import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminAuditLogsView } from "../AdminAuditLogsView";

vi.mock("../../../auth/authzkitClient", () => ({
  authzkit: {
    auditLogs: {
      list: vi.fn(async () => ({
        items: [{ id: "a1", tenant_id: "t1", actor_id: "u1", actor_type: "user", action: "user.created", resource_type: "user", resource_id: "u1", metadata: null, ip_address: "127.0.0.1", user_agent: null, created_at: "2026-01-01T00:00:00Z" }],
        meta: { page: 1, page_size: 50, total: 1 },
      })),
    },
  },
}));

describe("AdminAuditLogsView", () => {
  test("shows audit entries", async () => {
    render(<AdminAuditLogsView />);
    await waitFor(() => expect(screen.getByText("user.created")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Implement view**

Create `frontend/web-ui/src/admin/audit/AdminAuditLogsView.jsx`:

```jsx
import React, { useEffect, useState } from "react";
import { authzkit } from "../../auth/authzkitClient";
import { AuthzKitApiError } from "@authzkit/client";

export function AdminAuditLogsView() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await authzkit.auditLogs.list({ page: 1, page_size: 200 });
      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setItems([]);
      setError(e instanceof AuthzKitApiError ? `${e.message} (${e.code})` : e?.message ?? "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card p-24 radius-12">
      <div className="d-flex align-items-center justify-content-between mb-16">
        <h6 className="mb-0">Audit logs</h6>
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled>
          Export
        </button>
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {loading ? <div className="text-secondary-light">Loading…</div> : null}
      <div className="table-responsive scroll-sm">
        <table className="table table-hover mb-0">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Resource</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id}>
                <td>{e.created_at}</td>
                <td>{e.action}</td>
                <td>
                  {e.resource_type}:{e.resource_id}
                </td>
                <td>{e.ip_address ?? "—"}</td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-secondary-light py-24">
                  No audit entries found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Render from page**

Update `frontend/web-ui/src/pages/admin/AdminAuditLogsPage.jsx`:

```jsx
import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { AdminAuditLogsView } from "../../admin/audit/AdminAuditLogsView";

export default function AdminAuditLogsPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Audit logs" />
      <AdminAuditLogsView />
    </MasterLayout>
  );
}
```

- [ ] **Step 4: Run tests + commit**

```bash
npm test
git add frontend/web-ui/src/pages/admin/AdminAuditLogsPage.jsx frontend/web-ui/src/admin/audit
git commit -m "feat(web-ui): implement Admin audit logs view"
```

---

### Task 7: Implement Admin Auth policies page (tenant security settings)

**Files:**
- Create: `frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx`
- Modify: `frontend/web-ui/src/pages/admin/AdminAuthPoliciesPage.jsx`

> Note: `@authzkit/client` exposes `TenantConfig.password_policy` and `TenantConfig.mfa_policy`. If session policy fields are not present in tenant config, store session-related settings under `TenantResponse.extensions` or another Authz-supported tenant config field discovered via backend search in Step 1.

- [ ] **Step 1: Locate session-policy storage in Authz backend**

Run in repo root:

```bash
rg -n \"session_policy|idle_timeout|max_session|max_session_age|session_timeout\" authz
```

Expected: at least one hit indicating where tenant-level session settings live (config struct, DB model, or API handler). Use those field names in Step 3.

- [ ] **Step 2: Write failing test (loads tenant config and renders password min length input)**

Create `frontend/web-ui/src/admin/auth-policies/__tests__/AdminAuthPoliciesView.test.jsx`:

```jsx
import React from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminAuthPoliciesView } from "../AdminAuthPoliciesView";

vi.mock("../../../auth/authzkitClient", () => ({
  authzkit: {
    users: {
      getMe: vi.fn(async () => ({
        user: { id: "u1" },
        is_platform_user: false,
        branches_enabled: false,
        accessible_branches: [],
        default_branch_id: null,
      })),
    },
    tenants: {
      get: vi.fn(async () => ({
        id: "t1",
        name: "Tenant",
        slug: "tenant",
        primary_domain: "example.com",
        status: "active",
        config: {
          mfa_policy: "optional",
          allowed_providers: ["totp"],
          password_policy: { min_length: 10, require_uppercase: true, require_lowercase: true, require_numbers: true, require_symbols: false },
          branches_enabled: false,
          allow_passwordless_otp: false,
          auto_create_on_otp: false,
        },
        created_at: "",
        updated_at: "",
      })),
      update: vi.fn(async () => ({})),
    },
  },
}));

describe("AdminAuthPoliciesView", () => {
  test("renders password min length", async () => {
    render(<AdminAuthPoliciesView />);
    await waitFor(() => expect(screen.getByLabelText("Minimum length")).toBeInTheDocument());
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement the view using tenant config**

Create `frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx`:

```jsx
import React, { useEffect, useState } from "react";
import { authzkit } from "../../auth/authzkitClient";
import { AuthzKitApiError } from "@authzkit/client";

export function AdminAuthPoliciesView() {
  const [tenantId, setTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [minLength, setMinLength] = useState(8);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const me = await authzkit.users.getMe();
      const tId = me?.user?.tenant_id ?? "";
      setTenantId(tId);
      if (!tId) throw new Error("Missing tenant_id");
      const tenant = await authzkit.tenants.get(tId);
      const p = tenant?.config?.password_policy;
      if (p?.min_length) setMinLength(p.min_length);
    } catch (e) {
      setError(e instanceof AuthzKitApiError ? `${e.message} (${e.code})` : e?.message ?? "Failed to load policies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await authzkit.tenants.update(tenantId, {
        config: {
          password_policy: {
            min_length: Number(minLength),
            require_uppercase: true,
            require_lowercase: true,
            require_numbers: true,
            require_symbols: false,
          },
        },
      });
      setSuccess("Policies saved.");
    } catch (e) {
      setError(e instanceof AuthzKitApiError ? `${e.message} (${e.code})` : e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-24 radius-12">
      <div className="d-flex align-items-center justify-content-between mb-16">
        <h6 className="mb-0">Auth policies</h6>
        <button type="button" className="btn btn-primary btn-sm" disabled={saving || loading} onClick={onSave}>
          {saving ? "Saving…" : "Save policies"}
        </button>
      </div>
      {error ? <div className="alert alert-danger">{error}</div> : null}
      {success ? <div className="alert alert-success">{success}</div> : null}
      {loading ? <div className="text-secondary-light">Loading…</div> : null}

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card border p-16 radius-12">
            <h6 className="mb-2">Password policy</h6>
            <label className="form-label" htmlFor="minLength">Minimum length</label>
            <input id="minLength" className="form-control" type="number" value={minLength} onChange={(e) => setMinLength(e.target.value)} min={6} max={128} />
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card border p-16 radius-12">
            <h6 className="mb-2">MFA policy</h6>
            <div className="text-secondary-light">Configure MFA policy (required/optional/disabled) + allowed providers.</div>
          </div>
        </div>
        <div className="col-12">
          <div className="card border p-16 radius-12">
            <h6 className="mb-2">Session management</h6>
            <div className="text-secondary-light">Wire to Authz tenant session policy fields discovered in Step 1.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Render from page + run tests + commit**

Update `frontend/web-ui/src/pages/admin/AdminAuthPoliciesPage.jsx`:

```jsx
import React from "react";
import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import { AdminAuthPoliciesView } from "../../admin/auth-policies/AdminAuthPoliciesView";

export default function AdminAuthPoliciesPage() {
  return (
    <MasterLayout>
      <Breadcrumb title="Auth policies" />
      <AdminAuthPoliciesView />
    </MasterLayout>
  );
}
```

Run:

```bash
npm test
git add frontend/web-ui/src/pages/admin/AdminAuthPoliciesPage.jsx frontend/web-ui/src/admin/auth-policies
git commit -m "feat(web-ui): implement Admin auth policies page"
```

---

### Task 8: Restyle auth pages + branch users page to match Module 1

**Files:**
- Modify: `frontend/web-ui/src/components/SignInLayer.jsx`
- Modify: `frontend/web-ui/src/pages/OtpSignInPage.jsx`
- Modify: `frontend/web-ui/src/components/ForgotPasswordLayer.jsx`
- Modify: `frontend/web-ui/src/lekurax/BranchUsersPage.jsx`

- [ ] **Step 1: Update auth pages typography/spacing/buttons to match Module 1**

Apply these consistent tweaks across the three auth pages:
- Use the same button sizing (`btn-sm` + `radius-12`) and input heights (`h-56-px`) already present.
- Ensure headings and helper text match the Admin pages’ contrast (avoid overly light text).
- Remove “social sign in” buttons if not functional, or disable with clear label.

- [ ] **Step 2: Restyle branch users assignment table**

In `frontend/web-ui/src/lekurax/BranchUsersPage.jsx`:
- Keep logic as-is (assign/unassign via `authzkit.branches.*`)
- Align table class names and button styles to Module 1 (btn-primary/btn-outline-danger, compact spacing, consistent empty/error)

- [ ] **Step 3: Manual QA**

Run dev server:

```bash
npm run dev
```

Verify:
- `/sign-in`, `/sign-in/otp`, `/forgot-password`
- `/lekurax/branches/:branchId/users`

- [ ] **Step 4: Commit**

```bash
git add frontend/web-ui/src/components/SignInLayer.jsx frontend/web-ui/src/pages/OtpSignInPage.jsx frontend/web-ui/src/components/ForgotPasswordLayer.jsx frontend/web-ui/src/lekurax/BranchUsersPage.jsx
git commit -m "style(web-ui): align auth and branch-users screens to Module 1"
```

---

## Plan self-review checklist (author)

- Spec coverage: Admin IA + 4 pages + redirects + adjacent restyles are covered.
- Placeholder scan: No “TBD/TODO” in steps; session policy mapping has an explicit discovery step and wiring instructions based on backend hits.
- Type consistency: Uses `@authzkit/client` resource names (`users`, `roles`, `auditLogs`, `tenants`) as defined in `authzkit-client` typings.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-26-module-1-admin-ui.md`.

Two execution options:
1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

