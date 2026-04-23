# M1 (Frontend) — Organization & Branch Management (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tenant-admin screens in `frontend/web-ui` for branch CRUD and user↔branch assignment, and ensure the branch selector uses `accessible_branches`.

**Architecture:** Frontend talks to AuthzKit via `@authzkit/client` for branch and membership operations. Branch selector reads `accessible_branches` from `getMe()` and stores the selected branch ID.

**Tech Stack:** React (`frontend/web-ui`), `@authzkit/client`

---

## Task 1: Ensure `AuthContext` boots `accessible_branches`

**Files:**
- Modify: `frontend/web-ui/src/auth/AuthContext.jsx`
- Test: `frontend/web-ui/src/auth/AuthContext.test.jsx`

- [ ] **Step 1: Update expected shape**

Update `AuthContext` usage so the `me` state is treated as:
- `{ user, is_platform_user, branches_enabled, accessible_branches, default_branch_id }`

Add a test that mocks `authzkit.users.getMe()` returning `accessible_branches` and asserts it is stored.

- [ ] **Step 2: Commit**

```bash
git add frontend/web-ui/src/auth
git commit -m "test(web-ui): cover getMe branch bootstrap shape"
```

---

## Task 2: Branch admin pages (CRUD)

**Files:**
- Create: `frontend/web-ui/src/pages/AdminBranchesPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Create branches page**

Implement `AdminBranchesPage.jsx` that:
- calls `authzkit.branches.list()`
- renders table of branches
- supports create/update/delete via SDK methods (based on AuthzKit API)

At minimum, implement create with this form state:
- `name`
- `status` (active/inactive)

On success: refresh list.

- [ ] **Step 2: Wire route**

Add route:
- `/admin/branches` → `<AdminBranchesPage />`

- [ ] **Step 3: Commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/AdminBranchesPage.jsx src/App.jsx
git commit -m "feat(web-ui): add branch admin CRUD page"
```

---

## Task 3: Branch membership assignment page (user↔branch)

**Files:**
- Create: `frontend/web-ui/src/pages/AdminBranchUsersPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement assignment page**

Implement page:
- selects a branch (`branchId` route param)
- lists users via `authzkit.users.list({ page, page_size })`
- for each user provides Assign/Unassign buttons calling:
  - `authzkit.branches.assignUser(branchId, userId)`
  - `authzkit.branches.unassignUser(branchId, userId)`

Show success/error toast.

- [ ] **Step 2: Wire route**

Add:
- `/admin/branches/:branchId/users` → `<AdminBranchUsersPage />`

- [ ] **Step 3: Commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/AdminBranchUsersPage.jsx src/App.jsx
git commit -m "feat(web-ui): add branch membership assignment page"
```

