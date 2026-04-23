# E10 (Backend) — Delivery & Logistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support delivery orders created from sales/prescriptions, courier assignment, and status tracking.

**Architecture:** Delivery is branch-scoped. A delivery order references a sale and carries address + status transitions. Route optimization is out of scope for the first cut.

---

## Task 1: Schema

**Files:**
- Create: `migrations/0015_delivery.sql`

- [ ] **Step 1: Create migration**

```sql
-- +goose Up

CREATE TABLE IF NOT EXISTS couriers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  phone text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  courier_id uuid NULL REFERENCES couriers(id) ON DELETE SET NULL,
  address text NOT NULL,
  status text NOT NULL DEFAULT 'created', -- created|assigned|picked_up|delivered|failed
  created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS couriers;
```

- [ ] **Step 2: Apply + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco
go run ./cmd/lekurax-migrate
git add migrations/0015_delivery.sql
git commit -m "feat(lekurax-api): add delivery schema"
```

---

## Task 2: Courier + delivery endpoints

**Files:**
- Create: `internal/delivery/http/couriers_handler.go`
- Create: `internal/delivery/http/deliveries_handler.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Tenant-scoped:
- `POST /api/v1/couriers` (perm `delivery.couriers.manage`, audit `courier.created`)
- `GET /api/v1/couriers` (perm `delivery.couriers.view`)

Branch-scoped:
- `POST /api/v1/branches/:branch_id/deliveries` (perm `delivery.orders.create`, audit `delivery.created`)
- `POST /api/v1/branches/:branch_id/deliveries/:id/assign` (perm `delivery.orders.assign`, audit `delivery.assigned`)
- `POST /api/v1/branches/:branch_id/deliveries/:id/status` (perm `delivery.orders.manage`, audit `delivery.status_changed`)
- `GET /api/v1/branches/:branch_id/deliveries` (perm `delivery.orders.view`)

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/delivery internal/server
git commit -m "feat(lekurax-api): add couriers and delivery order endpoints"
```

