# E9 (Backend) — Patient Portal / Online Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose patient-facing APIs for viewing prescriptions, requesting refills, and viewing order status.

**Architecture:** Patient portal auth is separate from staff auth. For this extension, implement a minimal patient identity + access token model using AuthzKit tenants with a “customer” role. (A full mobile app is outside this plan; web portal only.)

---

## Task 1: Portal roles/permissions in AuthzKit

**Files (authz):**
- Modify: `authz/internal/application/seeder.go`

- [ ] **Step 1: Seed patient-portal permissions**

Add permissions:
- `portal.profile.view|update`
- `portal.prescriptions.view`
- `portal.refills.request`
- `portal.orders.view`

- [ ] **Step 2: Commit**

```bash
git add authz
git commit -m "feat(authz): add patient portal permissions"
```

---

## Task 2: Refill requests schema + endpoints

**Files:**
- Create: `migrations/0014_portal_refills.sql`
- Create: `internal/portal/http/refills_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Migration**

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS refill_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'requested', -- requested|approved|denied|filled
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS refill_requests;
```

- [ ] **Step 2: Endpoint**

Routes:
- `POST /api/v1/portal/refills` (perm `portal.refills.request`, audit `portal.refill_requested`)
- `GET /api/v1/portal/prescriptions` (perm `portal.prescriptions.view`)

- [ ] **Step 3: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
go test ./... -v
git add migrations/0014_portal_refills.sql internal/portal internal/server
git commit -m "feat(lekurax-api): add patient portal refill request endpoints"
```

