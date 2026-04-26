# Module 1 — User Management & Security (Admin UI) — Design

**Date:** 2026-04-26  
**Status:** Draft (approved in chat; pending implementation plan)  
**Source mockup:** `frontend/mockups/Module 1 - User Management & Security.html`  

## Goal

Deliver a **Module 1 Admin area** in `frontend/web-ui` that matches the approved mockup’s **layout density, hierarchy, and workflows**, and replaces the current mismatched “implemented” UI.

Module 1 covers:
- **User management**
- **Roles & permissions**
- **Audit logs**
- **Tenant security configuration** (password + MFA + session policies) on a **single page**

Auth policies are backed by **Authz** capabilities (“authz already makes API provisions for that”).

## Non-goals (this pass)

- No new modules beyond Module 1.
- No additional pages beyond the four Admin pages defined below.
- No re-architecture of the entire application shell beyond adding an **Admin** menu section.
- No pixel-perfect reproduction of the HTML mockup’s raw CSS; the contract is **layout/workflow parity** within the app’s React + Bootstrap-based UI system.

## Information Architecture (IA)

Move Module 1 navigation into the **app sidebar** under an **Admin** section.

### Admin menu items and routes

- **Users** → `/admin/users`
- **Roles & Permissions** → `/admin/roles`
- **Audit logs** → `/admin/audit`
- **Auth policies** → `/admin/auth-policies`

### Compatibility redirects (recommended)

Preserve existing entry points by redirecting:
- `/users-list` → `/admin/users`
- `/role-access` → `/admin/roles`
- `/assign-role` → `/admin/roles` (optionally deep-link to assignment UI state)

### Adjacent restyles in scope (selected)

The following existing routes should be **restyled to match Module 1** visual system (not moved into Admin):
- `/sign-in`, `/forgot-password`, `/sign-in/otp`
- `/lekurax/branches/:branchId/users`

## Global layout contract (all Admin pages)

- **App sidebar** contains the Admin section items above.
- **Top bar** shows: breadcrumb `Admin → {Page}`, page title, right-side page primary action.
- **Content density**: data-first (KPI cards, filter bar, table cards).
- **Responsive behavior**:
  - Desktop: 24px padding, full table layout.
  - Mobile: tables may scroll horizontally or collapse into stacked rows; actions remain reachable.
- **Interaction basics**:
  - Hover row highlight on tables.
  - Visible focus states for keyboard navigation.
  - Fast feedback: loading/empty/error states per page.

## Design system guidance (ui-ux-pro-max)

Use a **data-dense dashboard** style with a pharmacy/trust palette:
- **Primary**: `#15803D` (pharmacy green)
- **CTA / accent**: `#0369A1` (trust blue)
- **Background**: `#F0FDF4`

Typography:
- Mockup uses **Inter**; keep Inter unless there is a deliberate global typography switch.

## Page contracts

### 1) Admin → Users (`/admin/users`)

**Purpose:** Manage tenant users and their access posture.

**Layout:**
- KPI row: Total users, Active users, MFA enabled, Active sessions
- Filter bar: search (name/email/phone), role filter, status filter, “More filters”
- Table columns (baseline):
  - User (avatar + name + email)
  - Role
  - Branch
  - Status
  - Last login
  - MFA
  - Actions (view, edit, overflow)

**Primary action:** Add user → modal

**Modal flows:**
- Create user
- Edit user
- View user (with suspend/deactivate affordance)

**Must support:**
- Create/edit/suspend user
- Branch assignment consistent with Authz capabilities
- Display and/or control MFA requirement at the user level (if supported)

### 2) Admin → Roles & Permissions (`/admin/roles`)

**Purpose:** View built-in roles; create and manage custom roles with granular permissions.

**Layout:**
- Roles table columns:
  - Role name
  - Description
  - Type (System / Predefined / Custom)
  - Users count
  - Permissions summary
  - Actions

**Primary action:** Create custom role → modal

**Role editor modal:**
- Role metadata (name, description, type=custom)
- Permission matrix grouped by module/feature as checkbox grid

**Rules:**
- System/predefined roles are view-only (no delete).
- Custom roles can be edited (and deleted only if allowed by backend rules).

### 3) Admin → Audit logs (`/admin/audit`)

**Purpose:** Operational + security visibility with filtering and export.

**Layout:**
- Filters: search, category filter, time range selector, export button
- Table columns:
  - Timestamp
  - User
  - Action
  - Category
  - IP address
  - Details (view)

**Primary action:** Export logs (CSV/JSON)

**Details view:** row action opens modal or side panel with full event payload.

### 4) Admin → Auth policies (`/admin/auth-policies`)

**Purpose:** Single tenant security settings page consolidating:
- Password policies
- MFA settings
- Session management

**Layout:** Single page with 3 configuration cards and one save flow:
- Password policy card (min length, complexity, expiry, history, lockout)
- MFA policy card (required/optional, allowed methods, grace period)
- Session policy card (idle timeout, max session age, device/session limit)

**Primary action:** Save policies (validation + success toast)

**Backend dependency:** Use Authz-provided policy APIs; no new backend work in this spec unless gaps are discovered.

## Error handling + states (all pages)

- **Loading**: skeleton rows/cards or compact spinners.
- **Empty**: explicit empty state with next action (“Add user”, “Create role”, etc.).
- **Errors**: user-facing message + retry; include request correlation when available.
- **Permissions**: hide/disable actions the current user cannot perform (Authz-driven).

## Success criteria (acceptance)

The implementation is considered complete for Module 1 UI when:
- Admin section exists in the app sidebar with the 4 pages and routes above.
- Each page matches the approved **layout/workflow contract** and is usable on mobile + desktop.
- Auth pages (`/sign-in`, `/forgot-password`, `/sign-in/otp`) and branch users page (`/lekurax/branches/:branchId/users`) are visually aligned to the Module 1 system.
- No additional pages are introduced beyond the agreed scope.

