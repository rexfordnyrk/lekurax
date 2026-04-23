# E2 (Backend) — Procurement (Advanced) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add requisitions, approval workflow, RFQs, and supplier contracts (beyond MVP inventory receiving).

**Architecture:** Procurement is branch-scoped for requisitions and receiving, tenant-scoped for supplier master and contracts. All state transitions audited.

---

## Task 1: Schema

**Files:**
- Create: `migrations/0008_procurement.sql`

- [ ] **Step 1: Create migration**

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  contact_email text NULL,
  contact_phone text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft|submitted|approved|rejected|cancelled
  requested_by_user_id uuid NULL,
  approved_by_user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_requisition_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  requisition_id uuid NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS purchase_requisition_lines;
DROP TABLE IF EXISTS purchase_requisitions;
DROP TABLE IF EXISTS suppliers;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0008_procurement.sql
git commit -m "feat(lekurax-api): add procurement schema (suppliers, requisitions)"
```

---

## Task 2: Supplier endpoints

**Files:**
- Create: `internal/procurement/http/suppliers_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Routes:
- `POST /api/v1/suppliers` (perm `procurement.suppliers.manage`, audit `supplier.created`)
- `GET /api/v1/suppliers` (perm `procurement.suppliers.view`)

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/procurement internal/server
git commit -m "feat(lekurax-api): add supplier endpoints"
```

---

## Task 3: Requisition workflow endpoints

**Files:**
- Create: `internal/procurement/http/requisitions_handler.go`

- [ ] **Step 1: Implement routes**

Branch-scoped:
- `POST /api/v1/branches/:branch_id/requisitions`
- `POST /api/v1/branches/:branch_id/requisitions/:id/lines`
- `POST /api/v1/branches/:branch_id/requisitions/:id/submit`
- `POST /api/v1/branches/:branch_id/requisitions/:id/approve`
- `POST /api/v1/branches/:branch_id/requisitions/:id/reject`
- `GET /api/v1/branches/:branch_id/requisitions`

Permissions:
- `procurement.requisitions.create|submit|approve|reject|list|view`

Audit:
- `requisition.created|submitted|approved|rejected`

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/procurement
git commit -m "feat(lekurax-api): add requisition workflow endpoints"
```

