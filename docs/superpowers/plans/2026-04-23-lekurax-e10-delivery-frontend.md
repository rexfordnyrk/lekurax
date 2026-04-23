# E10 (Frontend) — Delivery & Logistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add courier management UI and delivery order board with assignment and status updates.

---

## Task 1: Couriers page

**Files:**
- Create: `frontend/web-ui/src/pages/CouriersPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement**

Calls:
- `GET /api/v1/couriers`
- `POST /api/v1/couriers`

- [ ] **Step 2: Wire route + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/CouriersPage.jsx src/App.jsx
git commit -m "feat(web-ui): add couriers management page"
```

---

## Task 2: Deliveries board page

**Files:**
- Create: `frontend/web-ui/src/pages/DeliveriesPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement**

Branch-scoped calls:
- `GET /api/v1/branches/${branchId}/deliveries`
- create: `POST /api/v1/branches/${branchId}/deliveries`
- assign: `POST /api/v1/branches/${branchId}/deliveries/${id}/assign`
- status: `POST /api/v1/branches/${branchId}/deliveries/${id}/status`

- [ ] **Step 2: Wire route + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/DeliveriesPage.jsx src/App.jsx
git commit -m "feat(web-ui): add deliveries board page"
```

