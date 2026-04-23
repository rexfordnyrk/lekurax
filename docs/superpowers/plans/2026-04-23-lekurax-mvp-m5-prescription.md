# M5 — Prescription (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manual prescription entry + dispense workflow that decrements inventory, with audit logging and branch context enforcement.

**Architecture:** Prescriptions are branch-scoped for dispensing operations (must provide branch context). A dispense action creates a dispense record and decrements stock batches using FEFO (earliest expiry first) when possible.

**Tech Stack:** Go (Gin, GORM, Postgres, Goose), `frontend/web-ui`

---

## Task 1: Prescription schema

**Files:**
- Create: `migrations/0005_prescriptions.sql`

- [ ] **Step 1: Create migration**

Create `migrations/0005_prescriptions.sql`:

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,

  prescriber_name text NULL,
  notes text NULL,
  status text NOT NULL DEFAULT 'draft', -- draft|ready|dispensed|cancelled

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant_branch_created
  ON prescriptions (tenant_id, branch_id, created_at DESC);

CREATE TABLE IF NOT EXISTS prescription_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  quantity bigint NOT NULL,
  directions text NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rx_items_tenant_rx ON prescription_items (tenant_id, prescription_id);

CREATE TABLE IF NOT EXISTS dispensations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE RESTRICT,

  actor_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispensations_tenant_branch_created
  ON dispensations (tenant_id, branch_id, created_at DESC);

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

## Task 2: Prescription API

**Files:**
- Create: `internal/prescriptions/domain/rx.go`
- Create: `internal/prescriptions/app/rx_service.go`
- Create: `internal/prescriptions/http/rx_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Routes**

Routes:
- `POST /api/v1/branches/:branch_id/prescriptions` (create)
- `POST /api/v1/branches/:branch_id/prescriptions/:id/items` (add item)
- `GET /api/v1/branches/:branch_id/prescriptions` (list)
- `GET /api/v1/branches/:branch_id/prescriptions/:id` (detail)
- `POST /api/v1/branches/:branch_id/prescriptions/:id/submit` (mark ready)

Permissions:
- `rx.create|list|view|update`
- `rx.items.manage`
- `rx.submit`

Audit:
- `rx.created`, `rx.item_added`, `rx.submitted`

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/prescriptions internal/server
git commit -m "feat(lekurax-api): add prescription entry endpoints"
```

---

## Task 3: Dispense workflow (decrement inventory)

**Files:**
- Modify/Create: `internal/prescriptions/app/dispense_service.go`
- Modify: `internal/inventory/app/stock_service.go` (export FEFO decrement helper)
- Create: `internal/prescriptions/http/dispense_handler.go`

- [ ] **Step 1: API**

Route:
- `POST /api/v1/branches/:branch_id/prescriptions/:id/dispense`

Behavior:
- validates rx is `ready`
- creates `dispensations` record
- decrements `stock_batches` across batches by FEFO until required qty is met
- if insufficient stock → 409 `INSUFFICIENT_STOCK`
- sets rx status to `dispensed`

Permissions:
- `rx.dispense`

Audit:
- `rx.dispensed`
- `stock.decremented_for_dispense` (metadata: rx_id, product_id, qty)

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/prescriptions internal/inventory
git commit -m "feat(lekurax-api): implement dispense workflow with FEFO stock decrement"
```

---

## Task 4: Web UI — prescription entry + dispense screens

**Files (web-ui):**
- Create: `frontend/web-ui/src/pages/PrescriptionsPage.jsx`
- Create: `frontend/web-ui/src/pages/PrescriptionDetailPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement pages**

Use branch path endpoints for all actions.

- [ ] **Step 2: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages src/App.jsx
git commit -m "feat(web-ui): add MVP prescription entry and dispense pages"
```

