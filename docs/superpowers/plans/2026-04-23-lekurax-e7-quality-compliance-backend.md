# E7 (Backend) — Quality Assurance & Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture incidents/medication errors, track CAPA actions, and provide compliance audit readiness views.

---

## Task 1: Schema

**Files:**
- Create: `migrations/0012_quality.sql`

- [ ] **Step 1: Create migration**

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  kind text NOT NULL, -- med_error|adverse_event|security|general
  severity text NOT NULL, -- low|medium|high|critical
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open|investigating|closed
  reported_by_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS capa_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action text NOT NULL,
  owner_user_id uuid NULL,
  due_on date NULL,
  status text NOT NULL DEFAULT 'open', -- open|done
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS capa_actions;
DROP TABLE IF EXISTS incidents;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0012_quality.sql
git commit -m "feat(lekurax-api): add quality/compliance schema"
```

---

## Task 2: Incident + CAPA endpoints

**Files:**
- Create: `internal/quality/http/incidents_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Branch-scoped:
- `POST /api/v1/branches/:branch_id/incidents` (perm `quality.incidents.create`, audit `incident.created`)
- `GET /api/v1/branches/:branch_id/incidents` (perm `quality.incidents.view`)
- `POST /api/v1/branches/:branch_id/incidents/:id/capa` (perm `quality.capa.manage`, audit `capa.created`)

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/quality internal/server
git commit -m "feat(lekurax-api): add incident and CAPA endpoints"
```

