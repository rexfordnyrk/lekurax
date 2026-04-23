# E7 (Frontend) — Quality Assurance & Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide incident reporting UI and CAPA tracking UI.

---

## Task 1: Incidents pages

**Files:**
- Create: `frontend/web-ui/src/pages/IncidentsPage.jsx`
- Create: `frontend/web-ui/src/pages/IncidentDetailPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement list + create**

Branch-scoped calls:
- `GET /api/v1/branches/${branchId}/incidents`
- `POST /api/v1/branches/${branchId}/incidents`

- [ ] **Step 2: CAPA actions**

Call:
- `POST /api/v1/branches/${branchId}/incidents/${id}/capa`

- [ ] **Step 3: Wire routes + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/IncidentsPage.jsx src/pages/IncidentDetailPage.jsx src/App.jsx
git commit -m "feat(web-ui): add incident reporting and CAPA pages"
```

