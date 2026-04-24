# Lekurax MVP — manual user acceptance tests

Run these **in order** after Authz, Lekurax API, Postgres (and Redis if your Authz stack requires it), and the web UI dev server are running. Each step marked **Human (UI)** needs you in the browser (or equivalent). Steps marked **Human (API)** need `curl` or an HTTP client with a valid tenant JWT.

Record pass/fail and any error text you see.

---

## 0. Environment and services

**Human (setup)** — not automated in this doc.

| Variable / file | Purpose |
|-----------------|--------|
| `frontend/web-ui/.env.local` | Copy from `frontend/web-ui/.env.example`. Set `VITE_AUTHZ_BASE_URL` to your Authz HTTP origin (e.g. `http://127.0.0.1:18080`). Set `VITE_LEKURAX_API_BASE_URL` to Lekurax (e.g. `http://127.0.0.1:18081`). |
| Lekurax `config.yaml` (or env) | DB DSN, `authz.base_url`, JWT issuer/public key aligned with Authz, and `service_api_key` if you test **non–tenant-admin** branch checks (see §10). |
| Authz | Migrated + seeded; tenant admin can sign in. Lekurax permissions are granted to `tenant-admin` via Authz migrations/seeder. |
| Postgres | Databases `authz` and `lekurax` migrated (`lekurax-migrate`, Authz migrate). |

**Optional — Human (script)** — end-to-end API smoke without the UI:

```bash
./scripts/dev-smoke-lekurax.sh
```

Uses default localhost ports unless overridden. Read the script header for RSA key paths and prerequisites.

---

## 1. Sign-in and session

**Human (UI)**

1. Open the web app (e.g. `npm run dev` in `frontend/web-ui`).
2. Sign in with a user that has **tenant-admin** (or equivalent Lekurax permissions) on your test tenant.
3. Confirm you reach the dashboard (or home) without an infinite redirect loop.
4. Refresh the page once; confirm you remain signed in (token refresh path, if configured).

**Human (UI)** — sign-out (if available) and sign-in again.

---

## 2. Branch context (header) and Authz branch admin

Lekurax inventory, prescriptions, POS, and sales are **branch-scoped**. The UI sends `X-Branch-Id` from the branch picker.

**Human (UI)**

1. Open **Lekurax → Branches** (`/lekurax/branches`). Confirm the list loads via AuthzKit (or a clear error if permissions are missing).
2. **Create branch**: use **New branch** (name + type, default `store`); confirm success and the new row appears after refresh if needed.
3. Click **Members** on a branch → `/lekurax/branches/{branchId}/users`. Assign and unassign a test user; confirm no error (requires `branches.users.assign` / `branches.users.unassign` and `users.list` as applicable).
4. Use the **header branch selector** to choose a branch (pick one you created or an existing branch).
5. Navigate to **Lekurax → Stock** without a branch selected: confirm the warning to select a branch.
6. Select a branch, reload **Stock**: tables/forms should load instead of the warning.

---

## 3. Products and pricing

**Human (UI)** — `/lekurax/products`

1. Create a product (name, SKU as required by the form).
2. Confirm it appears in the list.
3. Set a **price** for that product (cents); confirm success feedback.
4. Edit product fields if the UI exposes them; confirm list updates after refresh if needed.

---

## 4. Tax rules

**Human (UI)** — `/lekurax/tax-rules`

1. Add a simple tax rule (rate the UI expects, e.g. percentage fields as labeled).
2. Confirm it appears in the list.

---

## 5. Stock — receive and adjust

**Human (UI)** — `/lekurax/stock` (branch selected)

1. **Receive**: choose the product from §3, batch number, quantity ≥ 1, optional expiry; submit. Confirm the row appears in **On hand** with correct quantity.
2. **Receive** a second batch for the same product (different batch number) if you want to test batch-specific behavior.
3. **Adjust — Auto batch**: choose product, leave batch as “Auto”, enter a small **positive** delta and a reason code; submit. Confirm quantity increases on the expected batch (FIFO by expiry on the server).
4. **Adjust — specific batch**: pick a batch from the dropdown, apply a **negative** delta (e.g. −1) within on-hand quantity; confirm quantity decreases and no error.
5. **Adjust — error path**: attempt delta that would drive quantity below zero; confirm the UI shows an error (e.g. `NEGATIVE_STOCK` in the message after the HTTP status).
6. **Near expiry (UI)**: on the same page, use the **Near expiry** card (adjust **Days** if you like, then **Refresh**). Confirm the table matches batches due to expire within the window (or “No batches” when none apply).

**Human (API)** — optional

- Same as the near-expiry UI but via `curl`: `GET /api/v1/branches/{branch_id}/stock/near-expiry?days=30` with `Authorization: Bearer <tenant_jwt>` and `X-Branch-Id: {branch_id}` when required by your deployment.

---

## 6. Patients and allergies

**Human (UI)** — `/lekurax/patients` and `/lekurax/patients/:id`

1. Create a patient with required fields on the list page.
2. Use **Filter list** to narrow by name or ID; confirm the row remains visible when it should.
3. Click **Open** on a patient → detail (`/lekurax/patients/{id}`).
4. Edit **Profile** (name / DOB), **Save changes**; reload and confirm values persisted.
5. Under **Add allergy**, submit an allergen (optional reaction); confirm it appears in the **Allergies** table.

---

## 7. Prescriptions workflow

**Human (UI)** — `/lekurax/prescriptions` (branch selected)

1. Create a prescription for a patient from §6.
2. Add at least one line item (product from §3, quantity, directions as the form requires).
3. **Submit** the prescription (state should move toward submitted / awaiting fulfillment per UI labels).
4. **Dispense** when the UI allows; confirm success or a clear business error (e.g. stock, validation).

**Human (UI)** — edge case

5. If you can create an Rx line for a product the patient is **allergic** to, confirm the API/UI blocks or warns as designed (capture actual behavior).

---

## 8. POS — quote and sale

**Human (UI)** — `/lekurax/pos` (branch selected)

1. Add cart lines with products that have prices; use **Quote totals** and confirm subtotal/tax/total appear and look consistent with §4.
2. **Complete sale** without a linked prescription; confirm no hard error and a **green success** message appears; cart resets.
3. Optional: paste a **prescription ID** (UUID string from §7 after dispense or from list) into “Linked prescription”; complete sale; confirm success.

---

## 9. Sales history

**Human (UI)** — `/lekurax/sales`

1. After at least one sale from §8, open **Sales history**; confirm the sale row appears with time, total, status.
2. Click **Lines** on a row; confirm line items load (product id, quantity, line total).

---

## 10. Non–tenant-admin user and branch membership

Automated smoke often uses **tenant-admin**, which may bypass strict branch membership checks in Lekurax middleware. Production-like checks need a **normal** tenant user assigned to a branch in Authz and a valid **Lekurax → Authz service API key** so `UserHasBranch` can succeed.

**Human (setup + UI)**

1. Create a tenant user **without** tenant-admin (or strip roles) but with Lekurax permissions you expect for that persona (may require Authz role edits / new migration in your fork).
2. Assign the user to a branch via Authz (API or admin UI).
3. Configure Lekurax `service_api_key` to match Authz’s expectation (`X-Service-Key` from Lekurax to Authz).
4. Sign in as that user, select the assigned branch, call a branch-scoped page (e.g. Stock list).

**Expected:** `200` and data when the user is in the branch; `403` or clear error when branch is wrong or user is not a member.

---

## 11. Audit and observability (optional)

**Human (API)** or **DB**

- If you rely on Lekurax audit rows, perform an action (receive stock, sale) and verify a row appears in the audit table (schema in `migrations/0001_init.sql` / `0002` as applicable).

---

## 12. Regression checklist (quick)

| Area | Route | Human (UI) |
|------|-------|------------|
| Auth | sign-in | §1 |
| Branches | `/lekurax/branches` | §2 |
| Branch members | `/lekurax/branches/:branchId/users` | §2 |
| Products | `/lekurax/products` | §3 |
| Tax | `/lekurax/tax-rules` | §4 |
| Stock | `/lekurax/stock` | §5 |
| Patients | `/lekurax/patients`, `/lekurax/patients/:id` | §6 |
| Rx | `/lekurax/prescriptions` | §7 |
| POS | `/lekurax/pos` | §8 |
| Sales | `/lekurax/sales` | §9 |

---

## Notes for the tester

- **403 / permission errors:** compare JWT roles with Authz seeder permissions (`lekurax.*` names in `authz/internal/application/seeder.go` and migration `0022_lekurax_permissions.sql`).
- **CORS:** if the browser blocks Lekurax calls, configure Lekurax (or a dev proxy) to allow your UI origin.
- **IDs in POS:** “Linked prescription ID” expects the prescription UUID string from the prescriptions list or API, not a human display number.
