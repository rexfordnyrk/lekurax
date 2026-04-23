# M6 (Frontend) — POS (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an MVP POS page that builds a cart, displays backend totals, and submits a sale.

**Architecture:** Frontend uses the backend quote endpoint for totals and then submits sale creation to branch-scoped endpoint.

**Tech Stack:** React (`frontend/web-ui`)

---

## Task 1: POS page

**Files:**
- Create: `frontend/web-ui/src/pages/PosPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement cart building**

For MVP:
- load products via `GET /api/v1/products`
- allow adding to cart with quantities

- [ ] **Step 2: Display totals**

Call:
- `POST /api/v1/pricing/quote`

Use `is_rx` per line to allow tax rule selection server-side.

- [ ] **Step 3: Submit sale**

Call:
- `POST /api/v1/branches/${branchId}/sales`

Show success message with sale id.

- [ ] **Step 4: Wire route**

Add:
- `/pos` → `<PosPage />`

- [ ] **Step 5: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/PosPage.jsx src/App.jsx
git commit -m "feat(web-ui): add MVP POS page"
```

