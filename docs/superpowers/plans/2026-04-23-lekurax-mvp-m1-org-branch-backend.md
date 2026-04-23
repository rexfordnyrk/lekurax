# M1 (Backend) — Organization & Branch Management (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure AuthzKit (`authz`) provides branch CRUD + user↔branch assignment (multi-branch) with correct permissions and audit, and exposes `accessible_branches` for `GET /users/me`.

**Architecture:** Branches and membership live in AuthzKit. Lekurax backend consumes them via token claims + AuthzKit lookups (see foundation plan). This module’s backend work is therefore **primarily in `authz`**.

**Tech Stack:** AuthzKit (`authz`) Go service, Postgres, Redis

---

## Task 1: Permission registry entries for branch + membership operations

**Files (authz):**
- Modify: `authz/internal/application/seeder.go`
- Test: `authz/internal/application/seeder_test.go`

- [ ] **Step 1: Add missing permissions to seeder**

In `authz/internal/application/seeder.go`, extend the seeded permissions to include:
- `branches.users.assign`
- `branches.users.unassign`

Example snippet to add near existing branch permissions:

```go
{Name: "branches.users.assign", Label: "Assign User to Branch", Category: "Branches", Module: "system", IsSystem: true},
{Name: "branches.users.unassign", Label: "Unassign User from Branch", Category: "Branches", Module: "system", IsSystem: true},
```

- [ ] **Step 2: Run unit tests**

```bash
cd /home/ignis/GolandProjects/pharmaco/authz
go test ./... -run Seeder -v
```

- [ ] **Step 3: Commit**

```bash
git add authz/internal/application/seeder.go authz/internal/application/*test*.go
git commit -m "feat(authz): seed branch membership permissions"
```

---

## Task 2: Branch CRUD endpoints are permission-protected + audited

**Files (authz):**
- Modify: `authz/internal/delivery/http/router/router.go`
- Modify: `authz/internal/delivery/http/handler/branch_handler.go` (or equivalent branch handler)
- Modify: `authz/internal/application/branch_service.go` (or equivalent)
- Modify: `authz/internal/application/audit_service.go` (if audit writes centralized)
- Test: `authz/test/integration/*branch*`

- [ ] **Step 1: Write failing integration tests**

Add tests that assert:
- missing permission → 403
- correct permission → 2xx
- audit log entry created for create/update/delete

Run:

```bash
cd /home/ignis/GolandProjects/pharmaco/authz
go test ./... -run Branch -v
```

- [ ] **Step 2: Implement permission middleware on routes**

In router, ensure:
- `POST /v1/branches` requires `branches.create`
- `GET /v1/branches` requires `branches.list`
- `GET /v1/branches/:id` requires `branches.view`
- `PATCH /v1/branches/:id` requires `branches.update`
- `DELETE /v1/branches/:id` requires `branches.delete`

- [ ] **Step 3: Emit audit events**

For create/update/delete emit actions:
- `branch.created`
- `branch.updated`
- `branch.deleted`

Metadata should include at least `{ "branch_id": "...", "branch_name": "..." }`.

- [ ] **Step 4: Run tests + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/authz
go test ./... -v
git add authz
git commit -m "feat(authz): enforce perms and audit on branch CRUD"
```

---

## Task 3: User↔branch membership endpoints (assign/unassign/list)

**Files (authz):**
- Modify/Create: `authz/internal/delivery/http/handler/branch_handler.go` (or dedicated membership handler)
- Modify: `authz/internal/infrastructure/persistence/user_branch_repository.go`
- Modify: `authz/internal/application/user_service.go` (or new service)
- Modify: `authz/internal/delivery/http/response/branch_responses.go`
- Modify: `authz/docs/swagger.yaml`
- Tests: `authz/test/integration/*branch*` and `authz/test/integration/*user*`

- [ ] **Step 1: Add endpoints**

Implement:
- `POST /v1/branches/:branch_id/users/:user_id` (permission: `branches.users.assign`)
- `DELETE /v1/branches/:branch_id/users/:user_id` (permission: `branches.users.unassign`)
- `GET /v1/users/me/branches` (permission: `branches.list` or a dedicated `branches.me.list`)

Each endpoint must enforce:
- actor and target are in the same tenant (no cross-tenant)
- branch exists in tenant

- [ ] **Step 2: Emit audit events**

Actions:
- `branch.user_assigned`
- `branch.user_unassigned`

Metadata includes `{ "branch_id": "...", "user_id": "..." }`.

- [ ] **Step 3: Update SDK**

Update `authz/frontend/packages/authzkit-client/src/resources/branches.js` and `src/index.d.ts` to expose:
- `branches.assignUser(branchId, userId)`
- `branches.unassignUser(branchId, userId)`
- `users.listMyBranches()`

- [ ] **Step 4: Update `GET /users/me` response**

Update the response to include:
- `branches_enabled`
- `accessible_branches` (for tenant-admin: all branches; otherwise assigned only)

This is required for the Lekurax branch selector UX.

- [ ] **Step 5: Integration test for “same token, multi-branch access”**

Test:
- user assigned to 2 branches
- login once
- call a branch-scoped endpoint for each branch by **path branch_id**
- both succeed without refreshing/switching tokens

- [ ] **Step 6: Commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
git add authz
git commit -m "feat(authz): add multi-branch membership APIs and expose accessible branches"
```

