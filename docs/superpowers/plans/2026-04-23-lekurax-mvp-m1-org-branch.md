# M1 — Organization & Branch Management (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide tenant-admin workflows to create/manage branches and assign users to branches (multi-branch membership), with permission protection and audit logging.

**Architecture:** Branches and user↔branch membership are the source of truth in `authz`. Lekurax UI consumes `accessible_branches` from AuthzKit and offers admin UIs for branch management and membership assignment via AuthzKit APIs.

**Tech Stack:** AuthzKit (`authz`), `@authzkit/client`, `frontend/web-ui`

---

## Task 1: AuthzKit — Branch CRUD endpoints review + hardening

**Files (authz):**
- Modify: `authz/internal/delivery/http/handler/branch_handler.go` (or existing branch handler)
- Modify: `authz/internal/application/branch_service.go` (if exists)
- Test: `authz/test/integration/*branch*`

- [ ] **Step 1: Add failing integration tests**

Write tests for:
- create branch requires `branches.create`
- list branch requires `branches.list`
- update branch requires `branches.update`
- delete branch requires `branches.delete`

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco/authz
go test ./... -run Branch -v
```

Expected: some tests fail until permissions/middleware are aligned.

- [ ] **Step 2: Implement/fix permission protection**

Ensure each route requires the correct permission and is tenant-scoped (no cross-tenant leakage).

- [ ] **Step 3: Add audit events**

For create/update/delete, publish audit events with:
- `action`: `branch.created|branch.updated|branch.deleted`
- `actor_user_id`
- `tenant_id`
- `branch_id`

- [ ] **Step 4: Run tests**

```bash
cd /home/ignis/GolandProjects/pharmaco/authz
go test ./... -run Branch -v
```

- [ ] **Step 5: Commit**

```bash
git add authz
git commit -m "feat(authz): harden branch CRUD permissions and audit events"
```

---

## Task 2: AuthzKit — user↔branch membership endpoints

**Files (authz):**
- Modify/Create: `authz/internal/delivery/http/handler/user_branch_handler.go`
- Modify: `authz/internal/application/user_branch_service.go`
- Modify: `authz/frontend/packages/authzkit-client/src/resources/branches.js`
- Modify: `authz/frontend/packages/authzkit-client/src/index.d.ts`
- Test: `authz/test/integration/*user_branch*`

- [ ] **Step 1: Write failing tests**

Test matrix:
- tenant-admin can assign/unassign users to branches
- non-admin cannot assign
- user can list own accessible branches

- [ ] **Step 2: Implement endpoints**

Implement:
- `POST /v1/branches/{branch_id}/users/{user_id}`
- `DELETE /v1/branches/{branch_id}/users/{user_id}`
- `GET /v1/users/me/branches`

All must:
- validate tenant scoping
- require permissions `branches.users.assign`, `branches.users.unassign`, `branches.list` (or a dedicated `branches.me.list`)
- emit audit events: `branch.user_assigned`, `branch.user_unassigned`

- [ ] **Step 3: Update SDK**

Add methods:
- `client.branches.assignUser(branchId, userId)`
- `client.branches.unassignUser(branchId, userId)`
- `client.users.listMyBranches()`

- [ ] **Step 4: Run tests**

```bash
cd /home/ignis/GolandProjects/pharmaco/authz
go test ./... -v
cd /home/ignis/GolandProjects/pharmaco/authz/frontend/packages/authzkit-client
npm test
```

- [ ] **Step 5: Commit**

```bash
git add authz
git commit -m "feat(authz): add user-branch membership endpoints and SDK support"
```

---

## Task 3: Web UI — Branch admin pages (MVP)

**Files (web-ui):**
- Create: `frontend/web-ui/src/pages/BranchesListPage.jsx`
- Create: `frontend/web-ui/src/pages/BranchUsersPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Branches list page**

Implement page that calls:
- `authzkit.branches.list()` (or new method if required)
- show create/edit/delete actions (admin only)

- [ ] **Step 2: Branch users assignment page**

Implement:
- select branch
- list users (via `authzkit.users.list`)
- assign/unassign actions using SDK methods from Task 2

- [ ] **Step 3: Wire routes**

Add:
- `/admin/branches`
- `/admin/branches/:branchId/users`

- [ ] **Step 4: Build**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/web-ui/src/pages frontend/web-ui/src/App.jsx
git commit -m "feat(web-ui): add branch admin and membership assignment pages"
```

