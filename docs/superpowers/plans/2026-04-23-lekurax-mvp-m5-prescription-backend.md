# M5 (Backend) — Prescription (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manual prescription entry + dispense workflow that decrements stock using FEFO.

**Architecture:** Prescriptions are branch-scoped. Dispense creates a dispensation record and decrements inventory batches. All actions audited.

**Tech Stack:** Go, Postgres, Goose

---

## Task 1: Schema

**Files:**
- Create: `migrations/0005_prescriptions.sql`

- [ ] **Step 1: Create migration**

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  prescriber_name text NULL,
  notes text NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescription_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity bigint NOT NULL,
  directions text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispensations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE RESTRICT,
  actor_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS dispensations;
DROP TABLE IF EXISTS prescription_items;
DROP TABLE IF EXISTS prescriptions;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0005_prescriptions.sql
git commit -m "feat(lekurax-api): add prescription schema"
```

---

## Task 2: Entry endpoints

**Files:**
- Create: `internal/prescriptions/app/rx_service.go`
- Create: `internal/prescriptions/http/rx_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Routes (branch path):
- `POST /api/v1/branches/:branch_id/prescriptions` (perm `rx.create`, audit `rx.created`)
- `POST /api/v1/branches/:branch_id/prescriptions/:id/items` (perm `rx.items.manage`, audit `rx.item_added`)
- `GET /api/v1/branches/:branch_id/prescriptions` (perm `rx.list`)
- `GET /api/v1/branches/:branch_id/prescriptions/:id` (perm `rx.view`)
- `POST /api/v1/branches/:branch_id/prescriptions/:id/submit` (perm `rx.submit`, audit `rx.submitted`)

- [ ] **Step 2: Tests + commit**

```bash
go test ./... -v
git add internal/prescriptions internal/server
git commit -m "feat(lekurax-api): add prescription entry endpoints"
```

---

## Task 3: Dispense workflow

**Files:**
- Create: `internal/prescriptions/app/dispense_service.go`
- Create: `internal/prescriptions/http/dispense_handler.go`
- Modify: `internal/inventory/app/stock_service.go`

- [ ] **Step 1: Implement route**

Route:
- `POST /api/v1/branches/:branch_id/prescriptions/:id/dispense`

Rules:
- rx must be `ready`
- decrement stock FEFO across batches for each item
- if insufficient stock → 409 `INSUFFICIENT_STOCK`
- mark rx `dispensed`

Permission:
- `rx.dispense`

Audit:
- `rx.dispensed`

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/prescriptions internal/inventory
git commit -m "feat(lekurax-api): implement prescription dispense with FEFO stock decrement"
```

