# E1 (Frontend) — Insurance & Claims Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add UI for insurance providers/plans, patient coverages, and a claims work queue for branch staff.

**Tech Stack:** React (`frontend/web-ui`)

---

## Task 1: Providers + plans admin UI

**Files:**
- Create: `frontend/web-ui/src/pages/InsuranceProvidersPage.jsx`
- Create: `frontend/web-ui/src/pages/InsurancePlansPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Providers page**

Calls:
- `GET /api/v1/insurance/providers`
- `POST /api/v1/insurance/providers`

- [ ] **Step 2: Plans page**

Calls:
- `GET /api/v1/insurance/plans`
- `POST /api/v1/insurance/providers/:id/plans`

- [ ] **Step 3: Wire routes**

Add:
- `/insurance/providers`
- `/insurance/plans`

- [ ] **Step 4: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/InsuranceProvidersPage.jsx src/pages/InsurancePlansPage.jsx src/App.jsx
git commit -m "feat(web-ui): add insurance providers and plans pages"
```

---

## Task 2: Patient coverage UI

**Files:**
- Modify: `frontend/web-ui/src/pages/PatientDetailPage.jsx`

- [ ] **Step 1: Add coverage section**

Calls:
- `GET /api/v1/patients/:id/coverages`
- `POST /api/v1/patients/:id/coverages`

- [ ] **Step 2: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/PatientDetailPage.jsx
git commit -m "feat(web-ui): add patient coverage management"
```

---

## Task 3: Claims queue UI

**Files:**
- Create: `frontend/web-ui/src/pages/ClaimsPage.jsx`
- Create: `frontend/web-ui/src/pages/ClaimDetailPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Claims list**

Branch-scoped calls:
- `GET /api/v1/branches/${branchId}/claims`

- [ ] **Step 2: Claim detail actions**

Calls:
- submit: `POST /api/v1/branches/${branchId}/claims/${id}/submit`
- adjudicate: `POST /api/v1/branches/${branchId}/claims/${id}/adjudicate`
- mark paid: `POST /api/v1/branches/${branchId}/claims/${id}/mark-paid`

- [ ] **Step 3: Wire routes**

Add:
- `/claims`
- `/claims/:id`

- [ ] **Step 4: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/ClaimsPage.jsx src/pages/ClaimDetailPage.jsx src/App.jsx
git commit -m "feat(web-ui): add claims queue and detail pages"
```

