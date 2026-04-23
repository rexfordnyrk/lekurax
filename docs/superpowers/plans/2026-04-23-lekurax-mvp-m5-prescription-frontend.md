# M5 (Frontend) — Prescription (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide prescription entry + dispense UI that calls branch-scoped backend endpoints.

**Tech Stack:** React (`frontend/web-ui`)

---

## Task 1: Prescriptions list + create

**Files:**
- Create: `frontend/web-ui/src/pages/PrescriptionsPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement list**

Call:
- `GET /api/v1/branches/${branchId}/prescriptions`

- [ ] **Step 2: Implement create**

Call:
- `POST /api/v1/branches/${branchId}/prescriptions`

then navigate to detail page.

- [ ] **Step 3: Wire route**

Add:
- `/prescriptions` → `<PrescriptionsPage />`

- [ ] **Step 4: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/PrescriptionsPage.jsx src/App.jsx
git commit -m "feat(web-ui): add MVP prescriptions list and create"
```

---

## Task 2: Prescription detail (items + submit + dispense)

**Files:**
- Create: `frontend/web-ui/src/pages/PrescriptionDetailPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement detail view**

Calls:
- `GET /api/v1/branches/${branchId}/prescriptions/${id}`

Actions:
- add item: `POST /api/v1/branches/${branchId}/prescriptions/${id}/items`
- submit: `POST /api/v1/branches/${branchId}/prescriptions/${id}/submit`
- dispense: `POST /api/v1/branches/${branchId}/prescriptions/${id}/dispense`

- [ ] **Step 2: Wire route**

Add:
- `/prescriptions/:id` → `<PrescriptionDetailPage />`

- [ ] **Step 3: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/PrescriptionDetailPage.jsx src/App.jsx
git commit -m "feat(web-ui): add MVP prescription detail and dispense UI"
```

