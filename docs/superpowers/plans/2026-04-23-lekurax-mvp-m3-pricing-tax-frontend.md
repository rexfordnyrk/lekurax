# M3 (Frontend) — Pricing & Tax (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide UI to set product prices and to display backend quote totals (used later by POS).

**Architecture:** Frontend calls backend quote endpoint and renders subtotal/tax/total without reimplementing tax math.

**Tech Stack:** React (`frontend/web-ui`)

---

## Task 1: Product pricing UI

**Files:**
- Modify: `frontend/web-ui/src/pages/ProductsPage.jsx`

- [ ] **Step 1: Add price editor**

Add a “Set Price” action per product that calls:
- `PUT /api/v1/products/${productId}/price`

Body:

```js
{ currency: "USD", unit_price_cents: Number(cents) }
```

- [ ] **Step 2: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/ProductsPage.jsx
git commit -m "feat(web-ui): add product price editor"
```

---

## Task 2: Quote demo page

**Files:**
- Create: `frontend/web-ui/src/pages/PricingQuotePage.jsx`
- Modify: `frontend/web-ui/src/App.jsx`

- [ ] **Step 1: Implement quote page**

Page:
- select product IDs and quantities
- call `POST /api/v1/pricing/quote`
- render totals

- [ ] **Step 2: Wire route**

Add:
- `/pricing/quote` → `<PricingQuotePage />`

- [ ] **Step 3: Build + commit**

```bash
cd /home/ignis/GolandProjects/pharmaco/frontend/web-ui
npm run build
git add src/pages/PricingQuotePage.jsx src/App.jsx
git commit -m "feat(web-ui): add backend pricing quote page"
```

