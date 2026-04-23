# Lekurax MVP (SaaS) — Architecture & Delivery Design

**Status:** Draft (approved in chat; pending written spec review)  
**Date:** 2026-04-23  
**Primary sources:** `docs/pharmacy_system_architecture.md`, existing `authz` service + `@authzkit/client`, existing `frontend/web-ui` UI kit

---

## Goal

Ship **Lekurax** to production as a **multi-tenant SaaS** with a **single-branch MVP**, while keeping the architecture modular so post‑MVP capabilities can be added incrementally without breaking existing tenants.

---

## Non‑negotiables (Design Constraints)

- **Multi-tenant SaaS day one**: strict tenant isolation everywhere.
- **Branches may be enabled per tenant** (`branches_enabled`).
  - If `branches_enabled=true`:
    - **Tenant admins** may be tenant-wide (no branch assignment required).
    - **Non-admin users must have ≥1 branch assignment**.
    - Users may be assigned **multiple branches**.
- **No token switching to change branches** (same token works across branches).
- **Compatibility**: keep `branch_id` in JWT claims for now so upstream consumers don’t break.

---

## Architecture Overview (Backend)

### High-level components

- **AuthZ/AuthN**: provided by existing `authz` service (RBAC, tenants, branches, audit, MFA, token rotation).
- **Lekurax backend**: domain services for pharmacy modules (inventory, prescription, POS, etc.) following DDD patterns used in this repo.
- **Frontend**: `frontend/web-ui` integrates `@authzkit/client` and implements the same auth workflows as `authz/frontend/.../authzkit-console`, then adds module screens as backend features land.

### Cross-cutting platform capabilities (explicitly tracked)

The architecture document is strong on business modules, but we must treat the following as explicit platform capabilities to avoid “implicit” gaps:

- **Master data governance** (reason codes, tax codes, categories, etc.)
- **Jobs/scheduler** (notifications, expiry checks, report generation, retry policies)
- **Observability** (structured logs, metrics, tracing, error reporting; admin diagnostics)
- **Data retention & privacy automation** (retention classes, purge workflows, legal holds)
- **Config/feature flags contract** (what can be turned off per tenant vs always-on)
- **Ledger/accounting trail** (internal, even if exported to external accounting later)

These are tracked as roadmap items below; MVP implements only the minimum required to ship safely.

---

## Branch Context & Authorization Contract (Critical)

### Why

Many modules (inventory, prescription, POS, reporting) are branch-scoped even in a “single-branch MVP”.
We must support multi-branch **assignment** from day one (so later expansion doesn’t require auth rewrites), while keeping runtime behavior simple for MVP tenants.

### Branch resolution precedence

When `branches_enabled=true`, the backend resolves the “active branch context” using this order:

1. **Path-scoped**: `/api/v1/branches/{branch_id}/...`
2. **Query-scoped**: `?branch_id=<uuid>` (or multi-branch `branch_id=<uuid>&branch_id=<uuid>` / `branch_ids=...` per endpoint contract)
3. **Header-scoped**: `X-Branch-Id: <uuid>`
4. **JWT claim**: `branch_id` (legacy default / last-selected branch)
5. If still missing where required: **400** with a “branch context required” error code

### Semantics of `branch_id` claim (compatibility)

Keep emitting `branch_id` in JWT claims, but treat it as:

- **default / last-selected branch**, *not* the full authorization boundary.
- Authorization is still enforced by:
  - tenant isolation
  - branch existence within tenant
  - membership (user ↔ branch) unless tenant admin override
  - RBAC permission checks (tenant-wide or branch-scoped as defined)

### Frontend bootstrapping (how UI learns branch access)

Immediately after login (or on boot if token already stored), frontend calls a tenant-scoped bootstrap endpoint (existing or extended):

- `GET /users/me` (via `client.users.getMe()`) MUST return enough to render:
  - `branches_enabled`
  - `accessible_branches` (assigned branches or all for tenant-admin)
  - optional `default_branch_id`

The UI then:

- shows a **branch selector** when `branches_enabled=true`
- uses the branch routing scheme per endpoint type (path/query/header)

---

## MVP Scope (What ships first)

### MVP definition

**MVP is the smallest complete, secure, end-to-end slice** of each unit such that:

- endpoints exist and are validated
- permissions exist and are enforced
- audit logging exists for critical actions
- tenant isolation and branch context rules are applied
- there is at least one end-to-end workflow testable via the UI

### MVP modules included (backend + frontend)

Foundation:
- **F0** Platform runtime: config, migrations, health checks
- **F1** Tenancy: tenant model + tenant config (password/MFA policy knobs, branches flag, allowed providers)
- **F2** Auth integration: verification, permission checks, audit baseline
- **F3** Branch context contract: membership, enforcement, compatibility claim semantics

MVP business slice:
- **M1** Organization & Branch management (minimal but complete)
- **M2** Inventory (product master + stock, batch/expiry)
- **M3** Pricing & Tax (base pricing + POS-calculable totals)
- **M4** Customer/Patient (identity + allergies/safety info)
- **M5** Prescription (manual entry + dispense)
- **M6** POS (OTC + prescription-linked sales)

Explicitly post‑MVP (extensions):
- Insurance/claims, advanced procurement, delivery/logistics, mobile portal, advanced analytics/reporting, document mgmt, training/LMS, QA/compliance suite, deep external integrations (FHIR/HL7, PDMP), etc.

---

## Unit Spec Template (Used for MVP and Post‑MVP)

Each unit below uses the same format so MVP vs extension work is comparable and trackable.

### Unit fields

- **Unit ID**
- **Type**: Foundation | MVP | Extension
- **User value**
- **Backend scope (minimal complete slice)**
- **Frontend scope (minimal complete slice)**
- **Permissions** (names + intent)
- **Audit events** (key actions)
- **Data model** (entities, key constraints)
- **APIs** (routes; branch scoping pattern)
- **Dependencies** (must be done first)
- **Verification** (how we know it works)

---

## Unit Specs (MVP)

### F1 — Tenancy & tenant config

- **Type**: Foundation
- **Backend scope**:
  - Tenant config includes: `branches_enabled`, MFA policy, password policy, allowed providers
  - Admin endpoints for tenant config (platform-side may exist already in `authz`; Lekurax consumes)
- **Frontend scope**:
  - Tenant discovery / tenant selection UX (domain/slug or manual ID) aligned with auth flows
- **Dependencies**: F0
- **Verification**: tenant config drives login options (OTP, social), branch selector visibility

### F3 — Branch context + multi-branch assignment (authz gap fix)

- **Type**: Foundation
- **Backend scope**:
  - user ↔ branches many-to-many assignment APIs
  - “list my branches” API returned in `getMe`
  - enforcement:
    - non-admin must have branch when branches enabled
    - branch resolution precedence implemented
    - `branch_id` claim becomes legacy default only
- **Frontend scope**:
  - branch selector UI; persists last selection (local storage) and sends branch context per endpoint contract
- **Dependencies**: F1, Auth service availability
- **Verification**:
  - user assigned to 2 branches can switch UI branch without re-auth; same token works

### M1 — Organization & Branch (minimal complete)

- **Type**: MVP
- **Backend scope**:
  - Branch CRUD
  - Assign/unassign users to branches
  - Seed baseline roles & permissions for tenant admin vs branch staff
- **Frontend scope**:
  - Branch management screens (admin only) + user-to-branch assignment UI
- **Dependencies**: F1, F3
- **Verification**: admin can create branch and assign staff; staff can only operate in assigned branches

### M2 — Inventory (minimal complete)

- **Type**: MVP
- **Backend scope**:
  - Product master CRUD (rx/otc flag, identifiers, storage category)
  - Stock entries per branch, with batch + expiry
  - Adjustments with reason codes + audit
- **Frontend scope**:
  - Product list/detail + stock view + adjust stock workflow
- **Dependencies**: M1
- **Verification**: add product → receive stock → adjust stock → audit log visible (where applicable)

### M3 — Pricing & tax (minimal complete)

- **Type**: MVP
- **Backend scope**:
  - Base pricing for products
  - Tax configuration sufficient to compute POS totals
- **Frontend scope**:
  - Product pricing UI + POS totals display
- **Dependencies**: M2
- **Verification**: POS totals match backend calculation; tax rules applied

### M4 — Customer/Patient (minimal complete)

- **Type**: MVP
- **Backend scope**:
  - Patient identity CRUD
  - Allergies capture + retrieval
- **Frontend scope**:
  - Patient search/create/edit + allergy capture
- **Dependencies**: F2/F3, M1
- **Verification**: patient created; allergies shown during prescription entry

### M5 — Prescription (minimal complete)

- **Type**: MVP
- **Backend scope**:
  - Manual prescription entry
  - Dispense workflow with stock decrement and audit
  - Hook points for clinical checks (even if only stubbed initially)
- **Frontend scope**:
  - Prescription entry UI + dispense UI
- **Dependencies**: M2, M4
- **Verification**: dispensing reduces inventory batch quantity, records audit trail

### M6 — POS (minimal complete)

- **Type**: MVP
- **Backend scope**:
  - OTC sales
  - Prescription-linked sale checkout
  - Receipt/invoice record + audit
- **Frontend scope**:
  - Cart + checkout UI; link to prescription
- **Dependencies**: M3, M5
- **Verification**: end-to-end: create rx → dispense → checkout; inventory and sales records consistent

---

## Post‑MVP Units (Extensions)

Post‑MVP units are tracked in the roadmap with the same template and will each have:

- a plan section/file (backend first)
- a matching frontend plan section/file (in the same order)

Examples (non-exhaustive):

- **E1** Insurance & claims (Module 9)
- **E2** Notifications & communications (Module 13) (beyond MVP operational alerts)
- **E3** Reporting & analytics dashboards (Module 11)
- **E4** Document management (Module 16)
- **E5** Delivery & logistics (Module 15)
- **E6** Integrations (Module 12) (FHIR/HL7, PDMP, etc.)

---

## Verification Strategy (MVP)

- **Backend**:
  - unit tests for domain services
  - request-level tests for auth/branch enforcement
  - integration tests for 1–2 end-to-end flows (inventory → rx → pos)
- **Frontend**:
  - smoke tests for auth flows (password, OTP, MFA if enabled)
  - manual UAT checklist per unit (tracked in plan)

---

## Open Decisions (Locked for MVP)

- Multi-tenant SaaS: **Yes**
- Single-branch MVP: **Yes**
- Branch assignments: **many-to-many**
- No token switching: **Yes**
- Tenant admins can be tenant-wide when branches enabled: **Yes**
- Keep `branch_id` claim for compatibility: **Yes (legacy default semantics)**

