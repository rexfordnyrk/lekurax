# E5 (Frontend) — Document Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide document upload UI and document viewer/download links.

---

## Task 1: Documents page

**Files:**
- Create: `frontend/web-ui/src/pages/DocumentsPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement upload**

Use `FormData` to call:
- `POST /api/v1/documents`

Then list by calling a listing endpoint (add `GET /api/v1/documents` if needed as part of backend task).

- [ ] **Step 2: Wire route + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/DocumentsPage.jsx src/App.jsx
git commit -m "feat(web-ui): add documents upload and listing page"
```

