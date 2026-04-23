# E8 (Frontend) — Integrations & Interop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide admin UI to configure outbound webhooks (URL, enabled, subscribed events).

---

## Task 1: Webhooks admin page

**Files:**
- Create: `frontend/web-ui/src/pages/IntegrationsWebhooksPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement page**

Calls:
- `GET /api/v1/integrations/webhooks`
- `POST /api/v1/integrations/webhooks`
- `POST /api/v1/integrations/webhooks/:id/events`

- [ ] **Step 2: Wire route + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/IntegrationsWebhooksPage.jsx src/App.jsx
git commit -m "feat(web-ui): add webhook integrations admin page"
```

