# E3 (Backend) — Reporting & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide branch and tenant dashboards for sales, inventory, and prescriptions with filterable time ranges.

**Architecture:** Start with read-optimized SQL queries over existing tables. Later add materialized views / async jobs (E4/E8) if needed.

---

## Task 1: Reporting endpoints (read-only)

**Files:**
- Create: `internal/reports/http/sales_reports.go`
- Create: `internal/reports/http/inventory_reports.go`
- Create: `internal/reports/http/prescription_reports.go`
- Modify: `internal/server/server.go`

- [ ] **Step 1: Implement routes**

Branch-scoped:
- `GET /api/v1/branches/:branch_id/reports/sales/summary?from=...&to=...`
- `GET /api/v1/branches/:branch_id/reports/inventory/near-expiry?days=30`
- `GET /api/v1/branches/:branch_id/reports/prescriptions/volume?from=...&to=...`

Multi-branch dashboards (query parameterized):
- `GET /api/v1/reports/sales/summary?branch_id=...&branch_id=...&from=...&to=...`

Permissions:
- `reports.view`

Audit:
- No audit for reads (MVP), but log request IDs in app logs.

- [ ] **Step 2: Commit**

```bash
go test ./... -v
git add internal/reports internal/server
git commit -m "feat(lekurax-api): add initial reporting endpoints"
```

