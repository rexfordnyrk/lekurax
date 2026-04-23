# E3 (Frontend) — Reporting & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dashboards that call backend reporting endpoints and filter by active branch or selected branch set.

---

## Task 1: Sales dashboard page

**Files:**
- Create: `frontend/web-ui/src/pages/ReportsSalesPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement page**

Calls:
- `GET /api/v1/branches/${branchId}/reports/sales/summary?from=...&to=...`

- [ ] **Step 2: Wire route + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/ReportsSalesPage.jsx src/App.jsx
git commit -m "feat(web-ui): add sales reporting dashboard"
```

---

## Task 2: Inventory and prescription dashboards

**Files:**
- Create: `frontend/web-ui/src/pages/ReportsInventoryPage.jsx`
- Create: `frontend/web-ui/src/pages/ReportsPrescriptionsPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement pages**

Calls:
- inventory: `GET /api/v1/branches/${branchId}/reports/inventory/near-expiry?days=30`
- rx: `GET /api/v1/branches/${branchId}/reports/prescriptions/volume?from=...&to=...`

- [ ] **Step 2: Wire routes + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/ReportsInventoryPage.jsx src/pages/ReportsPrescriptionsPage.jsx src/App.jsx
git commit -m "feat(web-ui): add inventory and prescription reporting dashboards"
```

