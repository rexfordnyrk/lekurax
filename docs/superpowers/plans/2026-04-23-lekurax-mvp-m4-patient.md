# M4 — Customer/Patient (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add patient identity CRUD + allergy recording, tenant-scoped and branch-scoped where required for workflows.

**Architecture:** Patients are tenant-scoped (shared across branches) but access is branch-gated when branches are enabled (request must carry branch context; audit includes branch). Prescriptions link to patient.

**Tech Stack:** Go (Gin, GORM, Postgres, Goose), `frontend/web-ui`

---

## Task 1: Patient schema

**Files:**
- Create: `migrations/0004_patients.sql`

- [ ] **Step 1: Create migration**

Create `migrations/0004_patients.sql`:

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

## Task 2: Patient API

**Files:**
- Create: `internal/patients/domain/patient.go`
- Create: `internal/patients/app/patient_service.go`
- Create: `internal/patients/http/patient_handler.go`
- Modify: `internal/server/server.go`
- Test: `internal/patients/app/patient_service_test.go`

- [ ] **Step 1: Implement routes**

Routes:
- `POST /api/v1/patients`
- `GET /api/v1/patients?query=...`
- `GET /api/v1/patients/:id`
- `PATCH /api/v1/patients/:id`
- `POST /api/v1/patients/:id/allergies`
- `GET /api/v1/patients/:id/allergies`

Permissions:
- `patients.create|list|view|update`
- `patients.allergies.manage|view`

Audit:
- `patient.created|updated`
- `patient.allergy_added`

For MVP, use straightforward validation (non-empty first/last).

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/patients internal/server
git commit -m "feat(lekurax-api): add patient CRUD and allergy endpoints"
```

---

## Task 3: Web UI — patient screens

**Files (web-ui):**
- Create: `frontend/web-ui/src/pages/PatientsPage.jsx`
- Create: `frontend/web-ui/src/pages/PatientDetailPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement pages**

Use `lekuraxFetch` to call patient endpoints, show allergy list and add form.

- [ ] **Step 2: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages src/App.jsx
git commit -m "feat(web-ui): add MVP patient pages"
```

