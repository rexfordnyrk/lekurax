# M4 (Backend) — Patient (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement patient identity CRUD + allergy recording.

**Architecture:** Patients are tenant-scoped entities; endpoints require auth. When branches are enabled, requests should still require branch context for consistent audit attribution (branch_id stored in audit metadata).

**Tech Stack:** Go, Postgres, Goose

---

## Task 1: Schema

**Files:**
- Create: `migrations/0004_patients.sql`

- [ ] **Step 1: Create migration**

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NULL,
  phone text NULL,
  email text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patients_tenant_name ON patients (tenant_id, last_name, first_name);

CREATE TABLE IF NOT EXISTS patient_allergies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  allergen text NOT NULL,
  reaction text NULL,
  severity text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_tenant_patient ON patient_allergies (tenant_id, patient_id);

-- +goose Down
DROP TABLE IF EXISTS patient_allergies;
DROP TABLE IF EXISTS patients;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0004_patients.sql
git commit -m "feat(lekurax-api): add patient schema"
```

---

## Task 2: APIs

**Files:**
- Create: `internal/patients/domain/patient.go`
- Create: `internal/patients/app/patient_service.go`
- Create: `internal/patients/infra/patient_repo.go`
- Create: `internal/patients/http/patient_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Routes:
- `POST /api/v1/patients` (perm `patients.create`, audit `patient.created`)
- `GET /api/v1/patients` (perm `patients.list`)
- `GET /api/v1/patients/:id` (perm `patients.view`)
- `PATCH /api/v1/patients/:id` (perm `patients.update`, audit `patient.updated`)
- `POST /api/v1/patients/:id/allergies` (perm `patients.allergies.manage`, audit `patient.allergy_added`)
- `GET /api/v1/patients/:id/allergies` (perm `patients.allergies.view`)

- [ ] **Step 2: Tests + commit**

```bash
go test ./... -v
git add internal/patients internal/server
git commit -m "feat(lekurax-api): add patient CRUD and allergy endpoints"
```

