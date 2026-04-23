# E2 (Frontend) — Procurement (Advanced) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add supplier management UI and requisition workflow screens.

---

## Task 1: Suppliers page

**Files:**
- Create: `frontend/web-ui/src/pages/SuppliersPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement page**

Calls:
- `GET /api/v1/suppliers`
- `POST /api/v1/suppliers`

- [ ] **Step 2: Wire route + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/SuppliersPage.jsx src/App.jsx
git commit -m "feat(web-ui): add suppliers management page"
```

---

## Task 2: Requisitions pages

**Files:**
- Create: `frontend/web-ui/src/pages/RequisitionsPage.jsx`
- Create: `frontend/web-ui/src/pages/RequisitionDetailPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement list**

Branch-scoped:
- `GET /api/v1/branches/${branchId}/requisitions`

- [ ] **Step 2: Implement detail workflow**

Calls:
- create: `POST /api/v1/branches/${branchId}/requisitions`
- add line: `POST /api/v1/branches/${branchId}/requisitions/${id}/lines`
- submit/approve/reject endpoints

- [ ] **Step 3: Wire routes + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/RequisitionsPage.jsx src/pages/RequisitionDetailPage.jsx src/App.jsx
git commit -m "feat(web-ui): add requisition workflow pages"
```

