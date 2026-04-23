# E6 (Frontend) — Training & Knowledge (LMS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide course catalog, assignment UI (admin), and completion UI (staff).

---

## Task 1: Training pages

**Files:**
- Create: `frontend/web-ui/src/pages/TrainingCoursesPage.jsx`
- Create: `frontend/web-ui/src/pages/TrainingCourseDetailPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Courses list**

Calls:
- `GET /api/v1/training/courses`

- [ ] **Step 2: Course admin actions**

Calls:
- create: `POST /api/v1/training/courses`
- assign: `POST /api/v1/training/courses/:id/assign`

- [ ] **Step 3: Staff completion**

Call:
- `POST /api/v1/training/courses/:id/complete`

- [ ] **Step 4: Wire routes + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/TrainingCoursesPage.jsx src/pages/TrainingCourseDetailPage.jsx src/App.jsx
git commit -m "feat(web-ui): add training courses pages"
```

