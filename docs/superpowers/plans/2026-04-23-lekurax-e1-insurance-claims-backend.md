# E1 (Backend) — Insurance & Claims Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add insurance providers/plans, patient coverage, and a claim lifecycle tied to prescription sales (submit → adjudicate → reconcile).

**Architecture:** Claims are tenant-scoped and typically branch-scoped for operational reporting. For MVP+1, implement a “manual adjudication” flow first (no external gateway), then add gateway integrations as a later extension under E8.

**Tech Stack:** Go, Postgres, Goose

---

## Task 1: Schema (providers, plans, coverages, claims)

**Files:**
- Create: `migrations/0007_insurance_claims.sql`

- [ ] **Step 1: Create migration**

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS insurance_providers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  payer_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insurance_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_coverages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES insurance_plans(id) ON DELETE RESTRICT,
  member_id text NOT NULL,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES insurance_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft', -- draft|submitted|approved|rejected|paid
  submitted_at timestamptz NULL,
  adjudicated_at timestamptz NULL,
  paid_at timestamptz NULL,
  rejection_reason text NULL,
  approved_amount_cents bigint NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS patient_coverages;
DROP TABLE IF EXISTS insurance_plans;
DROP TABLE IF EXISTS insurance_providers;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0007_insurance_claims.sql
git commit -m "feat(lekurax-api): add insurance and claims schema"
```

---

## Task 2: Provider/plan endpoints

**Files:**
- Create: `internal/claims/http/providers_handler.go`
- Create: `internal/claims/http/plans_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Routes:
- `POST /api/v1/insurance/providers` (perm `claims.providers.manage`, audit `insurance.provider_created`)
- `GET /api/v1/insurance/providers` (perm `claims.providers.view`)
- `POST /api/v1/insurance/providers/:id/plans` (perm `claims.plans.manage`, audit `insurance.plan_created`)
- `GET /api/v1/insurance/plans` (perm `claims.plans.view`)

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/claims internal/server
git commit -m "feat(lekurax-api): add insurance provider and plan endpoints"
```

---

## Task 3: Patient coverage endpoints

**Files:**
- Create: `internal/claims/http/coverage_handler.go`

- [ ] **Step 1: Implement routes**

Routes:
- `POST /api/v1/patients/:id/coverages` (perm `claims.coverage.manage`, audit `patient.coverage_added`)
- `GET /api/v1/patients/:id/coverages` (perm `claims.coverage.view`)

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/claims
git commit -m "feat(lekurax-api): add patient coverage endpoints"
```

---

## Task 4: Claim lifecycle (manual adjudication)

**Files:**
- Create: `internal/claims/http/claim_handler.go`
- Create: `internal/claims/app/claim_service.go`

- [ ] **Step 1: Implement routes**

Branch-scoped:
- `POST /api/v1/branches/:branch_id/claims` (create draft from sale)
- `POST /api/v1/branches/:branch_id/claims/:id/submit`
- `POST /api/v1/branches/:branch_id/claims/:id/adjudicate` (approve/reject)
- `POST /api/v1/branches/:branch_id/claims/:id/mark-paid`

Permissions:
- `claims.create|submit|adjudicate|mark_paid|list|view`

Audit:
- `claim.created|submitted|adjudicated|paid`

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/claims
git commit -m "feat(lekurax-api): add claims lifecycle endpoints (manual adjudication)"
```

