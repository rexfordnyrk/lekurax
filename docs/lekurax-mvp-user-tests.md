# Lekurax MVP — manual user acceptance tests

Run these **in order** after Authz, Lekurax API, Postgres (and Redis if your Authz stack requires it), and the web UI dev server are running. Each step marked **Human (UI)** needs you in the browser (or equivalent). Steps marked **Human (API)** need `curl` or an HTTP client with a valid tenant JWT.

Record pass/fail and any error text you see.

---

## 0. Environment and services

**Human (setup)** — not automated in this doc.


| Variable / file                | Purpose                                                                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/web-ui/.env.local`   | Copy from `frontend/web-ui/.env.example`. Set `VITE_AUTHZ_BASE_URL` to your Authz HTTP origin (e.g. `http://127.0.0.1:18080`). Set `VITE_LEKURAX_API_BASE_URL` to Lekurax (e.g. `http://127.0.0.1:18081`). |
| Lekurax `config.yaml` (or env) | DB DSN, `authz.base_url`, JWT issuer/public key aligned with Authz, and `service_api_key` if you test **non–tenant-admin** branch checks (see §10).                                                        |
| Authz                          | Migrated + seeded; tenant admin can sign in. Lekurax permissions are granted to `tenant-admin` via Authz migrations/seeder.                                                                                |
| Postgres                       | Databases `authz` and `lekurax` migrated (`lekurax-migrate`, Authz migrate).                                                                                                                               |


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

1. If you can create an Rx line for a product the patient is **allergic** to, confirm the API/UI blocks or warns as designed (capture actual behavior).

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


| Area           | Route                                        | Human (UI) |
| -------------- | -------------------------------------------- | ---------- |
| Auth           | sign-in                                      | §1         |
| Branches       | `/lekurax/branches`                          | §2         |
| Branch members | `/lekurax/branches/:branchId/users`          | §2         |
| Products       | `/lekurax/products`                          | §3         |
| Tax            | `/lekurax/tax-rules`                         | §4         |
| Stock          | `/lekurax/stock`                             | §5         |
| Patients       | `/lekurax/patients`, `/lekurax/patients/:id` | §6         |
| Rx             | `/lekurax/prescriptions`                     | §7         |
| POS            | `/lekurax/pos`                               | §8         |
| Sales          | `/lekurax/sales`                             | §9         |


---

## 13. E1 — Insurance providers, plans, coverages, and claims (manual adjudication)

### 13.1 Insurance providers (admin)

**Human (API)** — requires perms:

- `claims.providers.view` (list)
- `claims.providers.manage` (create)

1. List providers:
  - `GET /api/v1/insurance/providers`
  - **Expected**: `200` with `{ "items": [] }` (or non-empty if already created).
2. Create provider:
  - `POST /api/v1/insurance/providers` with JSON: `{ "name": "Acme Insurance", "payer_id": "ACME-001" }`
  - **Expected**: `201` and returned provider row (uuid `id`, correct `tenant_id`, `name`).
3. List again:
  - **Expected**: `items` includes the new provider.

### 13.2 Insurance plans (admin)

**Human (API)** — requires perms:

- `claims.plans.view` (list)
- `claims.plans.manage` (create)

1. Create a plan under the provider you created above:
  - `POST /api/v1/insurance/providers/{providerId}/plans` with JSON: `{ "name": "Acme Silver" }`
  - **Expected**: `201` with returned plan row (`provider_id` = providerId).
2. List plans:
  - `GET /api/v1/insurance/plans`
  - **Expected**: `200` with `{ "items": [...] }` including the plan.

### 13.3 Patient coverages

**Human (UI)** (preferred): after the E1 UI work lands, use the patient detail page coverage section.

**Human (API)** — requires perms:

- `claims.coverage.view` (list)
- `claims.coverage.manage` (create)

Pre-req: create a patient via the existing UI (§6) and note its `{patientId}`.

1. List coverages:
  - `GET /api/v1/patients/{patientId}/coverages`
  - **Expected**: `200` with `{ "items": [] }` initially.
2. Add coverage:
  - `POST /api/v1/patients/{patientId}/coverages` with JSON:
    - `{ "plan_id": "{planId}", "member_id": "MEM-123", "is_primary": true }`
  - **Expected**: `201` and returned coverage row.
3. List again:
  - **Expected**: `items` includes the row you created.

### 13.4 Claims lifecycle (manual adjudication)

**Human (API)** — requires branch membership + branch context + perms:

- `claims.create` (create draft from sale)
- `claims.list` / `claims.view`
- `claims.submit`
- `claims.adjudicate`
- `claims.mark_paid`

Pre-req:

- Select a branch (§2) and complete a sale (§8). Capture:
  - `{branchId}` (UUID)
  - `{saleId}` (UUID) from the Sales history API (`GET /api/v1/branches/{branchId}/sales`) or DB.
- Ensure your branch context matches the path param:
  - If you set `X-Branch-Id`, it must equal `{branchId}` used in the URL.

1. Create claim draft from sale:
  - `POST /api/v1/branches/{branchId}/claims` with JSON: `{ "sale_id": "{saleId}", "plan_id": "{planId}" }`
  - **Expected**: `201` with claim row, `status = "draft"`.
2. Submit:
  - `POST /api/v1/branches/{branchId}/claims/{claimId}/submit`
  - **Expected**: `200` with updated claim, `status = "submitted"`, `submitted_at` set.
3. Adjudicate (approve):
  - `POST /api/v1/branches/{branchId}/claims/{claimId}/adjudicate` with JSON: `{ "status": "approved", "approved_amount_cents": 12345 }`
  - **Expected**: `200`, `status = "approved"`, `adjudicated_at` set, `approved_amount_cents` set.
4. Mark paid:
  - `POST /api/v1/branches/{branchId}/claims/{claimId}/mark-paid`
  - **Expected**: `200`, `status = "paid"`, `paid_at` set.

**Human (API)** — rejection path
5. Create another draft and submit it, then reject:

- `POST .../adjudicate` with JSON: `{ "status": "rejected", "rejection_reason": "Missing prior auth" }`
- **Expected**: `200`, `status = "rejected"`, `rejection_reason` set.

1. Attempt to mark-paid a rejected claim:
  - **Expected**: `409 INVALID_STATE`.

---

## 14. E2 — Procurement: suppliers and requisitions

### 14.1 Suppliers

**Human (UI)** — `/lekurax/suppliers`

1. Open the page; confirm it loads a **Directory** table with a total count badge.
2. Create a supplier with just a name; confirm it appears in the table after creation.
3. Create another supplier with email + phone; confirm the email renders as a clickable `mailto:` link.
4. Use the **Search suppliers** input; confirm filtering works by name/email/phone/ID.

### 14.2 Requisitions list

**Human (UI)** — `/lekurax/requisitions` (branch selected)

1. Open the page; confirm you can see:
  - a **New requisition** CTA
  - a Status filter dropdown (Draft/Submitted/Approved/Rejected)
  - a table with status badges, created time, and an **Open** action.
2. Click **New requisition**; confirm you are taken to a detail screen (create flow).

### 14.3 Requisition detail workflow

**Human (UI)** — `/lekurax/requisitions/:id` (branch selected)

1. **Create**: open `/lekurax/requisitions/new` and click **Create requisition**.
  - **Expected**: you land on `/lekurax/requisitions/{id}` (UUID) and see a draft status.
2. **Add line**: add a line item with an existing product and quantity.
  - **Expected**: it appears in the Line items table and the badge count increments.
3. **Submit**:
  - **Expected**: status becomes `submitted`, and the UI indicates it is no longer editable.
4. **Approve**:
  - **Expected**: status becomes `approved`.
5. **Reject path** (separate requisition):
  - create + add a line + submit, then click **Reject**.
  - **Expected**: status becomes `rejected`.

---

## 15. E1 — Insurance UI (providers, plans, coverages, claims)

### 15.1 Providers + plans admin

**Human (UI)** — `/lekurax/insurance/providers` and `/lekurax/insurance/plans`

1. Open **Insurance / Providers**; confirm you can create a provider and see it in the table.
2. Open **Insurance / Plans**; select a provider and create a plan; confirm it appears in the list.

### 15.2 Patient coverages

**Human (UI)** — `/lekurax/patients/:id`

1. Open a patient detail page.
2. In **Insurance coverage**, select a plan, set member ID, mark as Primary if desired, and submit.
3. Confirm the **Coverages** table updates with the new row and the count badge increments.

### 15.3 Claims queue + claim detail actions

**Human (UI)** — `/lekurax/claims` and `/lekurax/claims/:id` (branch selected)

Pre-req: have at least one claim created via API step §13.4 (or wire a UI claim-create flow later).

1. Open **Insurance / Claims**; confirm the list loads and supports searching/filtering by status.
2. Open a claim; on **draft** claims, click **Submit** and confirm status updates.
3. On **submitted** claims, adjudicate:
  - approve with amount (cents), or reject with reason
  - confirm status updates.
4. On **approved** claims, click **Mark paid**; confirm status updates to `paid`.

---

## 16. E3 — Reporting & Analytics dashboards

### 16.1 Sales report (branch-scoped)

**Human (UI)** — `/lekurax/reports/sales` (branch selected)

1. Open **Lekurax → Sales report**.
2. Confirm the page shows a compact filter bar with **From** and **To** date inputs and quick ranges (**7d**, **30d**).
3. Set a date range (e.g. last 7 days) and click **Refresh**.
4. Confirm KPI cards render values for:
  - sale count
  - subtotal (cents)
  - tax (cents)
  - total (cents)
  - average total (cents)
5. Change the date range quickly a few times; confirm you do **not** see flickering “HTTP 4xx/5xx” errors from cancelled requests.

### 16.2 Inventory near-expiry report

**Human (UI)** — `/lekurax/reports/inventory` (branch selected)

1. Open **Lekurax → Inventory report**.
2. Confirm a **Days** filter is present (default 30) and a **Refresh** button.
3. Click **Refresh** and confirm the page renders:
  - a summary (items count, total quantity)
  - a table with product name, batch number, expires on, quantity on hand, days until expiry
4. If you have a batch expiring soon (within the window) with `quantity_on_hand > 0`, confirm it appears sorted by expiry ascending.

### 16.3 Prescription volume report

**Human (UI)** — `/lekurax/reports/prescriptions` (branch selected)

1. Open **Lekurax → Prescriptions report**.
2. Confirm the page shows a compact filter bar with **From** and **To** date inputs and quick ranges (**7d**, **30d**) plus **Refresh**.
3. Click **Refresh** and confirm you see:
  - total prescriptions count
  - a breakdown by status (table or bars) with status labels and counts
4. Change date range quickly; confirm aborted loads do **not** surface as errors.

---

## 17. E4 — In-app notifications inbox

### 17.1 Notifications list + filters

**Human (UI)** — `/lekurax/notifications`

1. Open **Lekurax → Notifications**.
2. Confirm you see filter tabs/buttons for **All**, **Unread**, **Read**.
3. Switch to **Unread**; confirm only unread notifications are shown (or “No notifications found.” if none exist).
4. Switch to **Read**; confirm only read notifications are shown (or empty state).

### 17.2 Mark as read interactions

**Human (UI)** — `/lekurax/notifications`

1. On an unread row, click **Mark as read**.
2. Confirm the row updates to **read** status without a full page reload.
3. Click **Mark all visible as read** (when there are unread rows visible).
4. While mark-all is running, confirm filters/refresh controls are disabled and no errors appear from cancelled requests.

---

## 18. E5 — Documents upload and retrieval

### 18.1 Upload a document

**Human (UI)** — `/lekurax/documents`

1. Open **Lekurax → Documents**.
2. In **Upload document**, choose a file (e.g. `.png` or `.pdf`) and select a **Kind** (e.g. `license`).
3. If a branch is selected in the header, confirm the upload targets that branch (branch field locked or defaulted).
4. Click **Upload** and confirm you see a success state and the document appears in the list.

### 18.2 List + open content

**Human (UI)** — `/lekurax/documents`

1. Use the Kind filter (if present) and click **Refresh**; confirm the table updates.
2. Click **Open** on a document row; confirm it opens in a new tab (or prompts download) without a 401/403.
3. Optional: upload a second doc and confirm newest-first ordering.

---

## 19. E6 — Training & Knowledge (courses)

### 19.1 Courses list + create

**Human (UI)** — `/lekurax/training/courses`

1. Open **Lekurax → Training** (Courses).
2. Confirm the courses table loads (or shows an empty state with no errors).
3. Create a new course (title + optional description; toggle mandatory if available) and confirm it appears in the list.

### 19.2 Assign + complete

**Human (UI)** — `/lekurax/training/courses/:id`

1. Open a course detail page from the list.
2. Use the admin Assign action to assign the course to a user (enter a `user_id` UUID); confirm success feedback.
3. Click **Mark complete** (or equivalent) and confirm completion succeeds without a full page reload.

---

## 20. E7 — Incidents and CAPA

### 20.1 Incident list + create

**Human (UI)** — `/lekurax/incidents` (branch selected)

1. Select a branch in the header.
2. Open **Lekurax → Incidents & CAPA**.
3. Confirm the incidents table loads (or shows empty state) without errors.
4. Create an incident (kind, severity, description). Confirm it appears in the list with status `open`.

### 20.2 Incident detail + CAPA create

**Human (UI)** — `/lekurax/incidents/:id` (branch selected)

1. Open an incident detail page from the list.
2. Create a CAPA action (action text + optional due date + optional owner user id if UI allows).
3. Confirm success feedback and that the CAPA action appears in the page list (if displayed).

---

## 21. E8 — Webhook integrations (outbound)

### 21.1 Configure webhook + events

**Human (UI)** — `/lekurax/integrations/webhooks`

1. Open **Lekurax → Integrations → Webhooks**.
2. Create a webhook with a valid URL (e.g. `http://127.0.0.1:9999/webhook`) and keep it **Enabled**.
3. Subscribe it to at least one event key (e.g. `sale.created`) and save.
4. Confirm the webhook appears in the list with the subscribed events shown.

### 21.2 Verify signature header on delivery (manual receiver)

**Human (setup + API/UI)** — requires a local webhook receiver.

1. Run a simple local receiver that prints headers and body (any tool is fine).
2. Trigger a supported event:
  - **sale.created**: complete a sale in POS
  - **rx.dispensed**: dispense a prescription
  - **claim.submitted**: submit a claim
3. Confirm the receiver gets a POST JSON payload with fields:
  - `event_key`, `occurred_at`, `tenant_id`, `data`
4. Confirm the request includes header `X-Lekurax-Signature: sha256=...` and that the signature verifies as HMAC-SHA256 of the raw request body using the webhook secret.

---

## 22. E9 — Patient portal: prescriptions + refill requests

### 22.1 Portal access (pre-req: patient link)

**Human (setup)** — requires a portal user linked to a patient.

- Ensure a row exists in `portal_patient_links` for your tenant:
  - `user_id` = Authz user UUID you sign in with for the portal
  - `patient_id` = existing patient UUID in Lekurax

### 22.2 View prescriptions

**Human (UI)** — `/portal/prescriptions`

1. Open `/portal` and navigate to **Prescriptions**.
2. Confirm the prescriptions list loads (or shows a clear empty state) without a 401/403.

### 22.3 Request a refill

**Human (UI)** — `/portal/prescriptions`

1. Click **Request refill** on a prescription.
2. Confirm success feedback (and that the button disables while submitting).
3. Repeat on another prescription; confirm you can request multiple refills.

---

## 23. E10 — Couriers and deliveries

### 23.1 Couriers directory

**Human (UI)** — `/lekurax/couriers`

1. Open **Lekurax → Couriers**.
2. Create a courier (name + optional phone) and confirm it appears in the list.
3. Use the search input; confirm filtering works by name/phone.

### 23.2 Deliveries board (branch-scoped)

**Human (UI)** — `/lekurax/deliveries` (branch selected)

1. Select a branch in the header.
2. Open **Lekurax → Deliveries**.
3. Create a delivery using an existing sale ID and a delivery address; confirm it appears under status `created`.
4. Assign a courier using the dropdown; confirm status becomes `assigned`.
5. Change status to `picked_up`, then `delivered`; confirm each update succeeds and the card moves columns.

---

## Notes for the tester

- **403 / permission errors:** compare JWT roles with Authz seeder permissions (`lekurax.`* names in `authz/internal/application/seeder.go` and migration `0022_lekurax_permissions.sql`).
- **CORS:** if the browser blocks Lekurax calls, configure Lekurax (or a dev proxy) to allow your UI origin.
- **IDs in POS:** “Linked prescription ID” expects the prescription UUID string from the prescriptions list or API, not a human display number.

