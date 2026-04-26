## Module 1 — Admin UI Shell + Pages Overwrite (User Management & Security)

**Date:** 2026-04-26  
**Scope:** Frontend only (`frontend/web-ui`)  
**Applies to:** All `/admin/*` routes/pages and the global top bar shell.

### Goal

Bring the running app UI for Module 1 into alignment with the provided Module 1 mockup and screenshots by **overwriting**:

- The **global top bar** (currently in `src/masterLayout/MasterLayout.jsx`) to match the mockup header pattern (breadcrumb + title + right-side actions; optional tabs row).
- All existing **Admin pages** under `/admin/*` to use the mockup’s layout, spacing, table pattern, filters bar pattern, and modal structure.

The **existing sidebar is kept** (navigation entries and behavior remain as-is).

### Non-goals

- Do not change backend behavior or API contracts.
- Do not redesign or refactor non-admin feature pages (Lekurax module pages under `/lekurax/*`, demo pages, etc.).
- Do not remove the sidebar or rework routing (URLs remain the same).

---

## Current app inventory (must be overwritten)

### Routes/pages (keep routes, overwrite UI)

- `/admin/users` → `src/pages/admin/AdminUsersPage.jsx` + `src/admin/users/AdminUsersView.jsx` + modals
- `/admin/roles` → `src/pages/admin/AdminRolesPage.jsx` + `src/admin/roles/AdminRolesView.jsx` + modal(s)
- `/admin/audit` → `src/pages/admin/AdminAuditLogsPage.jsx` + `src/admin/audit/AdminAuditLogsView.jsx`
- `/admin/auth-policies` → `src/pages/admin/AdminAuthPoliciesPage.jsx` + `src/admin/auth-policies/AdminAuthPoliciesView.jsx`

### Global shell (must be overwritten)

- `src/masterLayout/MasterLayout.jsx` currently renders a “navbar header” with search + theme + dropdowns + profile.
- Replace that area entirely with the mockup-style Admin header pattern.

---

## Design contract (what “matches the mockup” means)

The mockup HTML file `frontend/mockups/Module 1 - User Management & Security.html` is the primary contract for:

- Header composition (breadcrumb + title + actions)
- Tabs row layout and active states
- Card + table styling (header row, hover rows, spacing)
- Filters bar pattern (search input with icon, select filters, “More filters”)
- Modal structure (overlay, centered card, header/body/footer)
- Button hierarchy (primary vs secondary; small button variants)
- KPI/stat card grid above the table

### Global layout rules

- Sidebar remains as implemented and is not redesigned.
- Main content must visually align to the mockup’s “admin-layout” composition:
  - Header (sticky) at top of content area
  - Tabs row (when applicable) immediately below header
  - Content area padding consistent with mockup (card spacing, section spacing)

### Header/top bar rules (replace entirely)

For all `/admin/*` pages:

- Render a **breadcrumb** above the title.
  - Breadcrumb is clickable where appropriate (at minimum “Admin” links to a stable page; see behavior below).
  - Separator style matches the mockup (arrow chevron icon).
- Render a **page title** (H1-like) below the breadcrumb.
- Render **right-side actions** that are specific to the active page:
  - Users: “Add user”
  - Roles: “Create custom role”
  - Audit logs: “Export” (dropdown or equivalent) + optional refresh
  - Auth policies: page-appropriate primary action(s) aligned to existing functionality
- Remove the current top navbar search, language, notifications, profile dropdowns from the Admin shell.

### Tabs rules

For the Module 1 admin section, render a tabs row consistent with the mockup:

- Tabs: `Users`, `Roles & Permissions`, `Audit Logs`, `Auth Policies`
- Active tab reflects the current `/admin/*` route.
- Tabs are route-based (clicking a tab navigates; no stateful in-page tab switching).

---

## Page-level contracts

### `/admin/users` (Users)

Must include:

- KPI grid (Total users, Active users, MFA enabled, Active sessions)
- Filters bar (Search, Role, Status, More filters)
- Table with columns aligned to the mockup pattern:
  - User (avatar + name + email)
  - Role
  - Branch
  - Status (badge)
  - Last login
  - MFA (badge or “Enabled/Disabled” with visual emphasis)
  - Actions (view/edit/menu)
- Modals:
  - Create/Edit user modal (form grid + footer actions)
  - View user details modal (profile summary + key fields + recent activity section)

Constraints:

- Keep current permission gating behavior (don’t regress AuthzKit permission checks).
- Keep current data loading logic and API usage.

### `/admin/roles` (Roles & Permissions)

Must include:

- Table listing roles
- “Create custom role” action
- Modal for role creation/edit that uses the mockup’s permissions grid pattern

Constraints:

- Keep current CRUD behaviors and permission gating.

### `/admin/audit` (Audit logs)

Must include:

- Filters bar pattern (search, action/category, date range)
- Table with “View details” action
- Details modal using mockup modal structure
- Export actions (JSON/CSV) presented in a way that matches the mockup-level polish (dropdown is acceptable)

Constraints:

- Keep existing export functionality.

### `/admin/auth-policies` (Auth policies)

Must include:

- Same header + tabs + page scaffolding pattern as other admin pages
- Tables/forms/modals restyled to match Module 1 visual system

Constraints:

- Preserve current behaviors (no functional regressions).

---

## Visual system application (ui-ux-pro-max)

Use a “data-dense dashboard” approach while maintaining the mockup’s clean whites + neutral borders.

Guidelines applied:

- Compact spacing where possible, but never cramped for tables/forms.
- Clear visual hierarchy: breadcrumb (muted) → title (strong) → tabs → content.
- Row hover highlighting on tables.
- Consistent button hierarchy and sizes.
- Consistent modal headers/footers and scroll behavior.

---

## Acceptance checks (definition of done)

### UI

- Navigating to any `/admin/*` route shows:
  - The new mockup-style header (breadcrumb + title + actions)
  - The tabs row with correct active tab
  - No legacy navbar elements (search/profile/notifications) visible in the header area
- Users/Roles/Audit/Auth policies pages all visually align to the Module 1 mockup patterns:
  - Filters bar spacing and control styling
  - Table header/rows/hover
  - KPI card styling (where applicable)
  - Modals match structure (header/body/footer)

### Behavior

- Existing permission gating remains correct.
- Existing API calls remain correct (no contract changes).
- No console runtime errors on visiting `/admin/users`, `/admin/roles`, `/admin/audit`, `/admin/auth-policies`.

### Engineering

- Shared shell/top-bar implementation is not duplicated across pages (one source of truth).
- Admin pages use shared primitives where it reduces drift (top bar, tabs, filters bar, table wrapper, modal shell).

