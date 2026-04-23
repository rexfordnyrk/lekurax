# E4 (Frontend) — Notifications & Communications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app notifications inbox and “mark as read” interactions.

---

## Task 1: Notifications page

**Files:**
- Create: `frontend/web-ui/src/pages/NotificationsInboxPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement inbox**

Calls:
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/:id/read`

- [ ] **Step 2: Wire route + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/NotificationsInboxPage.jsx src/App.jsx
git commit -m "feat(web-ui): add notifications inbox page"
```

