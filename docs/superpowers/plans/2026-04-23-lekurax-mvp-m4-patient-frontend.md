# M4 (Frontend) — Patient (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide patient search/create/edit screens and allergy management UI.

**Tech Stack:** React (`frontend/web-ui`)

---

## Task 1: Patient list/search page

**Files:**
- Create: `frontend/web-ui/src/pages/PatientsPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement listing**

Call:
- `GET /api/v1/patients?query=<text>`

Render rows and link to detail page.

- [ ] **Step 2: Wire route**

Add:
- `/patients` → `<PatientsPage />`

- [ ] **Step 3: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/PatientsPage.jsx src/App.jsx
git commit -m "feat(web-ui): add MVP patients list/search page"
```

---

## Task 2: Patient detail + allergies

**Files:**
- Create: `frontend/web-ui/src/pages/PatientDetailPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement detail**

Calls:
- `GET /api/v1/patients/:id`
- `GET /api/v1/patients/:id/allergies`
- `POST /api/v1/patients/:id/allergies`

- [ ] **Step 2: Wire route**

Add:
- `/patients/:id` → `<PatientDetailPage />`

- [ ] **Step 3: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/PatientDetailPage.jsx src/App.jsx
git commit -m "feat(web-ui): add MVP patient detail and allergies UI"
```

