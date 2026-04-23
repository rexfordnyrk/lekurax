# M2 (Frontend) — Inventory (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add minimal UI to manage products and branch stock (receive/adjust) using the Lekurax API, respecting branch selection.

**Architecture:** Frontend calls Lekurax API through `lekuraxFetch()` and uses branch-path endpoints for stock. The active branch comes from the branch selector context.

**Tech Stack:** React (`frontend/web-ui`)

---

## Task 1: Products page (CRUD subset)

**Files:**
- Create: `frontend/web-ui/src/pages/ProductsPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement list + create**

Page behaviors:
- list: `GET /api/v1/products`
- create: `POST /api/v1/products`

Example call:

```js
await lekuraxFetch("/api/v1/products", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: { name, is_prescription: false, is_controlled: false },
});
```

- [ ] **Step 2: Wire route**

Add:
- `/inventory/products` → `<ProductsPage />`

- [ ] **Step 3: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/ProductsPage.jsx src/App.jsx
git commit -m "feat(web-ui): add MVP products page"
```

---

## Task 2: Stock page (receive/adjust)

**Files:**
- Create: `frontend/web-ui/src/pages/StockPage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement stock list**

Use active branch id to call:
- `GET /api/v1/branches/${branchId}/stock`

- [ ] **Step 2: Implement receive + adjust forms**

Receive:
- `POST /api/v1/branches/${branchId}/stock/receive`

Adjust:
- `POST /api/v1/branches/${branchId}/stock/adjust`

- [ ] **Step 3: Wire route**

Add:
- `/inventory/stock` → `<StockPage />`

- [ ] **Step 4: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/StockPage.jsx src/App.jsx
git commit -m "feat(web-ui): add MVP stock receive/adjust page"
```

