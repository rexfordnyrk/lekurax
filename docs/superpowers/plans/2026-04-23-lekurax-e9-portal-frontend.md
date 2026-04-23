# E9 (Frontend) — Patient Portal / Online Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add patient-portal routes (separate shell) for viewing prescriptions and requesting refills.

---

## Task 1: Portal shell routes

**Files:**
- Create: `frontend/web-ui/src/pages/portal/PortalHomePage.jsx`
- Create: `frontend/web-ui/src/pages/portal/PortalPrescriptionsPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement pages**

Calls:
- `GET /api/v1/portal/prescriptions`
- `POST /api/v1/portal/refills`

- [ ] **Step 2: Wire routes**

Add:
- `/portal`
- `/portal/prescriptions`

- [ ] **Step 3: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/portal src/App.jsx
git commit -m "feat(web-ui): add patient portal prescriptions and refill UI"
```

