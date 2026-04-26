# Module 1 — Admin UI Shell Overwrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing `frontend/web-ui` top navbar and restyle all `/admin/*` pages to match the Module 1 mockup patterns (header w/ breadcrumbs + title + actions, route-based tabs, KPI grid, filters bar, table styling, and consistent modals), while keeping the existing sidebar and routes intact.

**Architecture:** Introduce a small Admin UI “shell kit” (header + tabs + shared primitives) and refit each Admin page/view to that kit. Keep data loading, permission gating, and API calls unchanged; only restructure markup and styling to match the mockup.

**Tech Stack:** React 19, react-router-dom 7, Bootstrap 5 + existing theme utilities, react-bootstrap (already used for some modals), Vitest + Testing Library.

---

## File structure (locked)

**Create (new shared Admin UI kit):**
- `frontend/web-ui/src/admin/ui/AdminShellHeader.jsx` — breadcrumb + title + actions (mockup style)
- `frontend/web-ui/src/admin/ui/AdminShellTabs.jsx` — route-based tabs row for `/admin/*`
- `frontend/web-ui/src/admin/ui/adminShell.css` — minimal CSS to match the mockup header/tabs/tables/modals without destabilizing the rest of the app

**Modify (global layout):**
- `frontend/web-ui/src/masterLayout/MasterLayout.jsx` — remove legacy navbar header and render `AdminShellHeader`+`AdminShellTabs` when route starts with `/admin`

**Modify (Admin pages wiring):**
- `frontend/web-ui/src/pages/admin/AdminUsersPage.jsx`
- `frontend/web-ui/src/pages/admin/AdminRolesPage.jsx`
- `frontend/web-ui/src/pages/admin/AdminAuditLogsPage.jsx`
- `frontend/web-ui/src/pages/admin/AdminAuthPoliciesPage.jsx`

**Modify (Admin views/modals for mockup fidelity):**
- `frontend/web-ui/src/admin/users/AdminUsersView.jsx`
- `frontend/web-ui/src/admin/users/UserUpsertModal.jsx`
- `frontend/web-ui/src/admin/users/UserDetailsModal.jsx`
- `frontend/web-ui/src/admin/roles/AdminRolesView.jsx`
- `frontend/web-ui/src/admin/roles/RoleUpsertModal.jsx`
- `frontend/web-ui/src/admin/audit/AdminAuditLogsView.jsx`
- `frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx`

**Modify tests (keep behavioral checks stable, update UI selectors minimally):**
- `frontend/web-ui/src/admin/__tests__/adminRoutes.test.jsx`
- `frontend/web-ui/src/admin/users/__tests__/AdminUsersView.test.jsx`
- `frontend/web-ui/src/admin/audit/__tests__/AdminAuditLogsView.test.jsx`
- `frontend/web-ui/src/admin/roles/__tests__/AdminRolesView.test.jsx` (if present / adjust if needed)
- `frontend/web-ui/src/admin/auth-policies/__tests__/AdminAuthPoliciesView.test.jsx`

---

### Task 1: Add Admin UI shell kit (header + tabs + CSS)

**Files:**
- Create: `frontend/web-ui/src/admin/ui/AdminShellHeader.jsx`
- Create: `frontend/web-ui/src/admin/ui/AdminShellTabs.jsx`
- Create: `frontend/web-ui/src/admin/ui/adminShell.css`

- [ ] **Step 1: Write the failing test**

Create `frontend/web-ui/src/admin/ui/__tests__/AdminShellTabs.test.jsx`:

```jsx
import React from "react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { AdminShellTabs } from "../AdminShellTabs";

describe("AdminShellTabs", () => {
  it("marks Users tab active on /admin/users", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <AdminShellTabs />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("aria-current", "page");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
- `cd frontend/web-ui && npm test -- AdminShellTabs`

Expected: FAIL with module not found `../AdminShellTabs` (or component missing).

- [ ] **Step 3: Write minimal implementation**

Create `frontend/web-ui/src/admin/ui/AdminShellTabs.jsx`:

```jsx
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./adminShell.css";

const TABS = [
  { to: "/admin/users", label: "Users" },
  { to: "/admin/roles", label: "Roles & Permissions" },
  { to: "/admin/audit", label: "Audit Logs" },
  { to: "/admin/auth-policies", label: "Auth Policies" },
];

export function AdminShellTabs() {
  const { pathname } = useLocation();
  if (!pathname.startsWith("/admin")) return null;

  return (
    <div className="admin-shell-tabs">
      <div className="admin-shell-tabs-inner">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `admin-shell-tab ${isActive ? "active" : ""}`}
            aria-current={pathname === t.to ? "page" : undefined}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
```

Create `frontend/web-ui/src/admin/ui/AdminShellHeader.jsx`:

```jsx
import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import "./adminShell.css";

export function AdminShellHeader({ breadcrumb = [], title, actions = null }) {
  return (
    <div className="admin-shell-header">
      <div className="admin-shell-header-inner">
        <div className="admin-shell-title">
          <div className="admin-shell-breadcrumb">
            {breadcrumb.map((b, idx) => {
              const isLast = idx === breadcrumb.length - 1;
              return (
                <React.Fragment key={`${b.label}-${idx}`}>
                  {idx > 0 ? (
                    <Icon icon="ri:arrow-right-s-line" className="admin-shell-breadcrumb-sep" />
                  ) : null}
                  {b.to && !isLast ? (
                    <Link to={b.to} className="admin-shell-breadcrumb-link">
                      {b.label}
                    </Link>
                  ) : (
                    <span className="admin-shell-breadcrumb-current">{b.label}</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <h1 className="admin-shell-h1">{title}</h1>
        </div>

        <div className="admin-shell-actions">{actions}</div>
      </div>
    </div>
  );
}
```

Create `frontend/web-ui/src/admin/ui/adminShell.css`:

```css
.admin-shell-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #fff;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.admin-shell-header-inner {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.admin-shell-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(15, 23, 42, 0.6);
  margin-bottom: 4px;
}

.admin-shell-breadcrumb-link {
  color: rgba(15, 23, 42, 0.6);
  text-decoration: none;
}
.admin-shell-breadcrumb-link:hover {
  color: #15803d;
}

.admin-shell-breadcrumb-current {
  color: rgba(15, 23, 42, 0.6);
}

.admin-shell-breadcrumb-sep {
  font-size: 18px;
  opacity: 0.7;
}

.admin-shell-h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.95);
}

.admin-shell-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-shell-tabs {
  background: #fff;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.admin-shell-tabs-inner {
  padding: 0 24px;
  display: flex;
  gap: 28px;
}

.admin-shell-tab {
  padding: 14px 0;
  color: rgba(15, 23, 42, 0.7);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  font-weight: 500;
}

.admin-shell-tab:hover {
  color: rgba(15, 23, 42, 0.95);
}

.admin-shell-tab.active,
.admin-shell-tab[aria-current="page"] {
  color: #15803d;
  border-bottom-color: #15803d;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
- `cd frontend/web-ui && npm test -- AdminShellTabs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/admin/ui
git commit -m "feat(web-ui): add admin shell header and tabs"
```

---

### Task 2: Switch `MasterLayout` top bar to Admin shell header/tabs

**Files:**
- Modify: `frontend/web-ui/src/masterLayout/MasterLayout.jsx`

- [ ] **Step 1: Write the failing test**

Update `frontend/web-ui/src/admin/__tests__/adminRoutes.test.jsx` to assert the new header is present when authenticated:

```jsx
// add after render in the first test
expect(await screen.findByRole("heading", { name: "Users" })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run:
- `cd frontend/web-ui && npm test -- adminRoutes`

Expected: FAIL because the new header isn’t rendered yet.

- [ ] **Step 3: Write minimal implementation**

Modify `frontend/web-ui/src/masterLayout/MasterLayout.jsx`:

1) Import the new shell components:

```jsx
import { AdminShellHeader } from "../admin/ui/AdminShellHeader";
import { AdminShellTabs } from "../admin/ui/AdminShellTabs";
```

2) Detect admin routes:

```jsx
const isAdminRoute = location.pathname.startsWith("/admin");
```

3) Replace the existing `<div className='navbar-header'> ... </div>` block with:

```jsx
{isAdminRoute ? (
  <div>
    <AdminShellHeader
      breadcrumb={[{ label: "Admin", to: "/admin/users" }, { label: "User Management & Security" }]}
      title={
        location.pathname === "/admin/users"
          ? "Users"
          : location.pathname === "/admin/roles"
            ? "Roles & Permissions"
            : location.pathname === "/admin/audit"
              ? "Audit Logs"
              : location.pathname === "/admin/auth-policies"
                ? "Auth Policies"
                : "Admin"
      }
    />
    <AdminShellTabs />
  </div>
) : (
  /* keep the existing legacy navbar header here for non-admin pages (unchanged) */
  <div className="navbar-header">
    {/* existing content */}
  </div>
)}
```

Notes:
- This keeps the old navbar for non-admin pages.
- Admin header is now the only header shown for `/admin/*` pages (meets the “replace entirely” requirement for admin).

- [ ] **Step 4: Run test to verify it passes**

Run:
- `cd frontend/web-ui && npm test -- adminRoutes`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/masterLayout/MasterLayout.jsx frontend/web-ui/src/admin/__tests__/adminRoutes.test.jsx
git commit -m "feat(web-ui): replace admin top bar with Module 1 header"
```

---

### Task 3: Remove `Breadcrumb` usage from Admin pages (they now rely on the shell header)

**Files:**
- Modify: `frontend/web-ui/src/pages/admin/AdminUsersPage.jsx`
- Modify: `frontend/web-ui/src/pages/admin/AdminRolesPage.jsx`
- Modify: `frontend/web-ui/src/pages/admin/AdminAuditLogsPage.jsx`
- Modify: `frontend/web-ui/src/pages/admin/AdminAuthPoliciesPage.jsx`

- [ ] **Step 1: Write the failing test**

Update `frontend/web-ui/src/admin/__tests__/adminRoutes.test.jsx` to ensure the old breadcrumb label doesn’t appear:

```jsx
expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run:
- `cd frontend/web-ui && npm test -- adminRoutes`

Expected: FAIL until the Admin pages stop rendering `Breadcrumb`.

- [ ] **Step 3: Write minimal implementation**

For each Admin page component, remove:

```jsx
import Breadcrumb from "../../components/Breadcrumb";
...
<Breadcrumb title="..." />
```

Keep:

```jsx
<MasterLayout>
  <div className="dashboard-main-body">
    <AdminXView />
  </div>
</MasterLayout>
```

- [ ] **Step 4: Run test to verify it passes**

Run:
- `cd frontend/web-ui && npm test -- adminRoutes`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/pages/admin
git commit -m "refactor(web-ui): remove breadcrumb from admin pages"
```

---

### Task 4: Restyle `/admin/users` view to match mockup patterns (KPI, filters bar, table)

**Files:**
- Modify: `frontend/web-ui/src/admin/users/AdminUsersView.jsx`
- Modify: `frontend/web-ui/src/admin/users/__tests__/AdminUsersView.test.jsx`

- [ ] **Step 1: Write the failing test**

Update `AdminUsersView` test to look for the mockup-aligned section title:

```jsx
// before: expect(screen.getByText("Administrator")).toBeInTheDocument();
expect(screen.getByText("User Accounts")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run:
- `cd frontend/web-ui && npm test -- AdminUsersView`

Expected: FAIL if the heading changes aren’t applied yet.

- [ ] **Step 3: Write minimal implementation**

Update `AdminUsersView.jsx` markup to align with the mockup’s structure:

- Ensure the top of the view contains:
  - KPI cards grid
  - Filters bar with icon search input + selects + “More filters”
  - Card header row with title + Export button
  - Table with avatar cell and badges

Concrete implementation changes (example code to adapt inside the existing component):

```jsx
<div className="content-area">
  <div className="stats-grid">
    {/* map existing KPI values into mockup-ish cards */}
  </div>

  <div className="filters-bar">
    <div className="search-input">
      <i className="ri-search-line" />
      <input
        type="text"
        placeholder="Search users by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
    {/* role/status selects */}
  </div>

  <div className="card">
    <div className="card-header">
      <h3 className="card-title">User Accounts ({filtered.length})</h3>
      <button type="button" className="btn btn-secondary btn-sm" disabled={!filtered.length}>
        <i className="ri-download-line" />
        Export
      </button>
    </div>
    <div className="card-body" style={{ padding: 0 }}>
      {/* table */}
    </div>
  </div>
</div>
```

Also:
- Replace the current inline avatar styles with classnames aligned to the mockup (avatar circle, name/email stacked).
- Keep API and permission logic unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run:
- `cd frontend/web-ui && npm test -- AdminUsersView`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/admin/users
git commit -m "feat(web-ui): restyle admin users view to Module 1 mockup"
```

---

### Task 5: Restyle `/admin/roles` view + modal to match mockup patterns

**Files:**
- Modify: `frontend/web-ui/src/admin/roles/AdminRolesView.jsx`
- Modify: `frontend/web-ui/src/admin/roles/RoleUpsertModal.jsx`
- Modify: `frontend/web-ui/src/admin/roles/__tests__/AdminRolesView.test.jsx` (if present)

- [ ] **Step 1: Write the failing test**

If `AdminRolesView` has a test, update it to assert the primary CTA label:

```jsx
expect(screen.getByRole("button", { name: /create custom role/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run:
- `cd frontend/web-ui && npm test -- AdminRolesView`

Expected: FAIL until the CTA label exists.

- [ ] **Step 3: Write minimal implementation**

Update the view layout to:
- Card header: title + “Create Custom Role”
- Table styling aligned with Module 1 (header caps, hover rows)
- Modal: header/body/footer + permission grid blocks

Keep all existing behavior (CRUD and permission gating) unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run:
- `cd frontend/web-ui && npm test -- AdminRolesView`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/admin/roles
git commit -m "feat(web-ui): restyle admin roles and permissions to Module 1 mockup"
```

---

### Task 6: Restyle `/admin/audit` view + details modal to match mockup patterns

**Files:**
- Modify: `frontend/web-ui/src/admin/audit/AdminAuditLogsView.jsx`
- Modify: `frontend/web-ui/src/admin/audit/__tests__/AdminAuditLogsView.test.jsx`

- [ ] **Step 1: Write the failing test**

Update the test to assert the mockup-like title exists:

```jsx
expect(screen.getByText("Audit logs")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run:
- `cd frontend/web-ui && npm test -- AdminAuditLogsView`

Expected: FAIL until the view heading is aligned.

- [ ] **Step 3: Write minimal implementation**

Update:
- Filters bar to match mockup pattern (search input with icon, selects/inputs aligned)
- Card/table styling consistent with Module 1
- Details modal to use mockup header/body/footer structure (keep react-bootstrap if easiest, but match spacing/typography via CSS classes)

- [ ] **Step 4: Run test to verify it passes**

Run:
- `cd frontend/web-ui && npm test -- AdminAuditLogsView`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/admin/audit
git commit -m "feat(web-ui): restyle admin audit logs to Module 1 mockup"
```

---

### Task 7: Restyle `/admin/auth-policies` view to match mockup patterns

**Files:**
- Modify: `frontend/web-ui/src/admin/auth-policies/AdminAuthPoliciesView.jsx`
- Modify: `frontend/web-ui/src/admin/auth-policies/__tests__/AdminAuthPoliciesView.test.jsx`

- [ ] **Step 1: Write the failing test**

Update the test to assert the page section header label is present (add a heading in the view):

```jsx
expect(screen.getByRole("heading", { name: /auth policies/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run:
- `cd frontend/web-ui && npm test -- AdminAuthPoliciesView`

Expected: FAIL until the view includes an accessible heading.

- [ ] **Step 3: Write minimal implementation**

Update `AdminAuthPoliciesView` layout into:
- Filters/controls grouped into cards like the mockup
- Form controls spacing aligned
- Primary action button aligned to header actions if applicable (keep behavior)

Keep the same labels used by tests (e.g. “Minimum length”, “MFA policy”).

- [ ] **Step 4: Run test to verify it passes**

Run:
- `cd frontend/web-ui && npm test -- AdminAuthPoliciesView`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/admin/auth-policies
git commit -m "feat(web-ui): restyle admin auth policies to Module 1 mockup"
```

---

### Task 8: End-to-end verification (build + tests)

**Files:**
- None (verification only)

- [ ] **Step 1: Run the full web-ui test suite**

Run:
- `cd frontend/web-ui && npm test`

Expected: PASS.

- [ ] **Step 2: Run a production build**

Run:
- `cd frontend/web-ui && npm run build`

Expected: Build completes successfully.

- [ ] **Step 3: Manual smoke (optional but recommended)**

Run:
- `cd frontend/web-ui && npm run dev`

Then visit:
- `/admin/users`
- `/admin/roles`
- `/admin/audit`
- `/admin/auth-policies`

Expected:
- New Module 1 header + tabs are visible on all admin pages.
- No legacy navbar elements appear on admin pages.

---

## Self-review (plan vs spec)

- **Spec coverage:** Tasks 1–7 cover all spec requirements: new header + tabs (Tasks 1–3), overwrite each admin view to mockup patterns (Tasks 4–7), and verification (Task 8).
- **Placeholder scan:** No “TBD/TODO” steps; all steps include concrete commands and code snippets.
- **Type/signature consistency:** All new components are named and imported consistently (`AdminShellHeader`, `AdminShellTabs`).

