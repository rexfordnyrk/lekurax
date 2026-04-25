# Lekurax — MVP-to-Production Roadmap (Backend + Frontend)

**Date:** 2026-04-25  
**Last updated:** 2026-04-25 (E10 Delivery & Logistics)  
**Spec:** `docs/superpowers/specs/2026-04-23-lekurax-mvp-design.md`

This roadmap tracks **what is implemented vs pending** for both **backend** and **frontend** using the same unit structure for MVP and post‑MVP extensions.

Legend:

- ✅ Done
- ⏳ In progress
- ⬜ Not started

---

## MVP to Production (must ship first)

### Foundation

- **F0 Platform runtime** (backend) — config, migrations, health checks  
  - Plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-backend-foundation.md](./plans/2026-04-23-lekurax-mvp-backend-foundation.md)`
  - Backend: ✅
  - Frontend: n/a
- **F1 Tenancy + tenant config contract** (backend + frontend bootstrap UX)  
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-backend-foundation.md](./plans/2026-04-23-lekurax-mvp-backend-foundation.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-frontend-auth-foundation.md](./plans/2026-04-23-lekurax-mvp-frontend-auth-foundation.md)`
  - Backend: ✅
  - Frontend: ✅
- **F2 AuthN/AuthZ integration contract** (backend middleware + frontend SDK integration)  
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-backend-foundation.md](./plans/2026-04-23-lekurax-mvp-backend-foundation.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-frontend-auth-foundation.md](./plans/2026-04-23-lekurax-mvp-frontend-auth-foundation.md)`
  - Backend: ✅
  - Frontend: ✅
- **F3 Branch context + multi-branch assignment** (authz gap fix + UI selector)  
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-backend-foundation.md](./plans/2026-04-23-lekurax-mvp-backend-foundation.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-frontend-auth-foundation.md](./plans/2026-04-23-lekurax-mvp-frontend-auth-foundation.md)`
  - Backend: ✅
  - Frontend: ✅

### MVP Business Slice

- **M1 Organization & Branch management (minimal complete)**  
CRUD + permissions + audit + branch/user assignment
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m1-org-branch-backend.md](./plans/2026-04-23-lekurax-mvp-m1-org-branch-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m1-org-branch-frontend.md](./plans/2026-04-23-lekurax-mvp-m1-org-branch-frontend.md)`
  - Backend: ✅ (AuthzKit branch APIs + permissions; Lekurax consumes)
  - Frontend: ✅ (`/lekurax/branches` list + create via AuthzKit; `/lekurax/branches/:id/users` assign/unassign; branch selector in layout)
- **M2 Inventory (minimal complete)**  
Product master + stock (batch/expiry) + adjustments + audit
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m2-inventory-backend.md](./plans/2026-04-23-lekurax-mvp-m2-inventory-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m2-inventory-frontend.md](./plans/2026-04-23-lekurax-mvp-m2-inventory-frontend.md)`
  - Backend: ✅
  - Frontend: ✅ (products; stock receive/adjust/on-hand; near-expiry panel)
- **M3 Pricing & Tax (minimal complete)**  
Base pricing + tax rules sufficient for POS totals
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m3-pricing-tax-backend.md](./plans/2026-04-23-lekurax-mvp-m3-pricing-tax-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m3-pricing-tax-frontend.md](./plans/2026-04-23-lekurax-mvp-m3-pricing-tax-frontend.md)`
  - Backend: ✅
  - Frontend: ✅
- **M4 Customer/Patient (minimal complete)**  
Patient identity + allergies
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m4-patient-backend.md](./plans/2026-04-23-lekurax-mvp-m4-patient-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m4-patient-frontend.md](./plans/2026-04-23-lekurax-mvp-m4-patient-frontend.md)`
  - Backend: ✅
  - Frontend: ✅ (list + filter + create; `/lekurax/patients/:id` profile PATCH + allergies)
- **M5 Prescription (minimal complete)**  
Manual entry + dispense + stock decrement + audit (+ hooks for clinical checks)
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m5-prescription-backend.md](./plans/2026-04-23-lekurax-mvp-m5-prescription-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m5-prescription-frontend.md](./plans/2026-04-23-lekurax-mvp-m5-prescription-frontend.md)`
  - Backend: ✅
  - Frontend: ✅
- **M6 POS (minimal complete)**  
OTC + prescription-linked checkout + receipt record + audit
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m6-pos-backend.md](./plans/2026-04-23-lekurax-mvp-m6-pos-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-mvp-m6-pos-frontend.md](./plans/2026-04-23-lekurax-mvp-m6-pos-frontend.md)`
  - Backend: ✅
  - Frontend: ✅ (quote + checkout + success feedback; sales history page)

---

## Post‑MVP — platform & developer experience (completed)

Ship-hardening and **local reproducibility** work done **after** the MVP slice (F0–F3, M1–M6) landed. These items are **not** new business modules; they align Lekurax with Authz-style config and day‑to‑day engineering workflows.

- **DX-1 Configuration template**  
  - `config.example.yaml` at repo root: copy → `config.yaml`; documents `http`, `db`, `authz` (JWT), `security`, and `LEKURAX_*` env overrides.  
  - `.gitignore` continues to exclude committed secrets (`/config.yaml`).
- **DX-2 Database DSN composition (Authz-style)**  
  - `db` block supports either raw `db.dsn` **or** individual `host`, `port`, `user`, `password`, `name`, `sslmode`; loader composes a Postgres URL with **URL-encoded** credentials (mirrors Authz `database.*` pattern).  
  - `internal/config/db.go` + tests; `cmd/lekurax-migrate` and `lekurax-api` both use resolved `cfg.DB.DSN`.
- **DX-3 JWT parity with Authz (RS256 + HS256)**  
  - `authz.jwt_algorithm` (`RS256` default, `HS256` optional) and `authz.hs256_signing_key` (≥32 chars when HS256); `authz.rs256_public_key_pem` when RS256.  
  - `internal/auth` verifier options + tests; `cmd/lekurax-api` wires from config.
- **DX-4 Makefile & Goose CLI**  
  - Root `Makefile`: `build`, `**run`** (`go run` API), `**dev**` (Air), `test`, `**migrate-up` / `migrate-down` / `migrate-status**` (Authz-style migration ergonomics).  
  - `cmd/lekurax-migrate` accepts `up` (default), `down`, `status`.  
  - `.gitignore`: `/bin/` for `make build` outputs.
- **DX-5 Air hot reload for `lekurax-api`**  
  - `.air.toml`: rebuild on `go` / `yaml` changes; `**exclude_dir**` includes `frontend/`, `**authz/**` (submodule), `**node_modules/**`, `**migrations/**`, `**tmp/**`, `.vite`, `bin`, IDE dirs — avoids noisy reloads from UI or SQL-only edits; `**exclude_regex**` skips `*_test.go` churn.  
  - `**make dev**` → `air -c .air.toml`.
- **DX-6 Documentation**  
  - Root `README.md`: product context, Authz relationship, DB/JWT tables, Makefile / Air / migrate / web UI / smoke script.  
  - `docs/lekurax-mvp-user-tests.md`: manual UAT checklist for the MVP UI and branch flows.

---

## Post‑MVP Extensions (additive, same spec format)

Each extension below is tracked as a unit with backend+frontend deliverables. These can be shipped incrementally after MVP is stable in production.

- **E1 Insurance & Claims (Module 9)**  
Eligibility, claim submission, rejection handling, reconciliation.
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e1-insurance-claims-backend.md](./plans/2026-04-23-lekurax-e1-insurance-claims-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e1-insurance-claims-frontend.md](./plans/2026-04-23-lekurax-e1-insurance-claims-frontend.md)`
  - Backend: ✅
  - Frontend: ✅
- **E2 Procurement advanced workflows (Module 4)**  
Requisitions, RFQ, contracts, approvals (beyond MVP inventory purchasing basics).
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e2-procurement-backend.md](./plans/2026-04-23-lekurax-e2-procurement-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e2-procurement-frontend.md](./plans/2026-04-23-lekurax-e2-procurement-frontend.md)`
  - Backend: ✅
  - Frontend: ✅
- **E3 Reporting & Analytics (Module 11)**  
Dashboards + exports; phased report library.
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e3-reporting-analytics-backend.md](./plans/2026-04-23-lekurax-e3-reporting-analytics-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e3-reporting-analytics-frontend.md](./plans/2026-04-23-lekurax-e3-reporting-analytics-frontend.md)`
  - Backend: ✅
  - Frontend: ✅
- **E4 Notifications & Communications (Module 13)**  
Template library, retries, preferences, in-app + SMS/email beyond MVP operational alerts.
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e4-notifications-backend.md](./plans/2026-04-23-lekurax-e4-notifications-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e4-notifications-frontend.md](./plans/2026-04-23-lekurax-e4-notifications-frontend.md)`
  - Backend: ✅
  - Frontend: ✅
- **E5 Document Management (Module 16)**  
Secure storage, versioning, access control, OCR (if needed).
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e5-documents-backend.md](./plans/2026-04-23-lekurax-e5-documents-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e5-documents-frontend.md](./plans/2026-04-23-lekurax-e5-documents-frontend.md)`
  - Backend: ✅
  - Frontend: ✅
- **E6 Training & Knowledge (Module 17)**  
LMS + competency tracking.
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e6-training-backend.md](./plans/2026-04-23-lekurax-e6-training-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e6-training-frontend.md](./plans/2026-04-23-lekurax-e6-training-frontend.md)`
  - Backend: ✅
  - Frontend: ✅
- **E7 Quality Assurance & Compliance (Module 18)**  
Incident/error reporting, CAPA, audits, risk registry.
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e7-quality-compliance-backend.md](./plans/2026-04-23-lekurax-e7-quality-compliance-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e7-quality-compliance-frontend.md](./plans/2026-04-23-lekurax-e7-quality-compliance-frontend.md)`
  - Backend: ✅
  - Frontend: ✅
- **E8 Integrations & Interop (Module 12)**  
FHIR/HL7, PDMP/PMP, drug DBs, accounting export, payment gateways.
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e8-integrations-backend.md](./plans/2026-04-23-lekurax-e8-integrations-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e8-integrations-frontend.md](./plans/2026-04-23-lekurax-e8-integrations-frontend.md)`
  - Backend: ✅
  - Frontend: ✅
- **E9 Mobile & Online Services (Module 14)**  
Patient portal, refills, booking.
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e9-portal-backend.md](./plans/2026-04-23-lekurax-e9-portal-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e9-portal-frontend.md](./plans/2026-04-23-lekurax-e9-portal-frontend.md)`
  - Backend: ✅
  - Frontend: ✅ (web portal; mobile app tracked separately)
- **E10 Delivery & Logistics (Module 15)**  
Courier mgmt, routing, tracking, cold chain.
  - Backend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e10-delivery-backend.md](./plans/2026-04-23-lekurax-e10-delivery-backend.md)`  
  - Frontend plan: `[docs/superpowers/plans/2026-04-23-lekurax-e10-delivery-frontend.md](./plans/2026-04-23-lekurax-e10-delivery-frontend.md)`
  - Backend: ✅
  - Frontend: ✅

---

## Notes

- **DX-1 through DX-6** (above) are tracked only in this roadmap for visibility; they do not use separate plan files under `docs/superpowers/plans/`.
- MVP units are implemented **backend-first**, then frontend in the **same order**, to maintain tangible end-to-end progress.
- For every unit we will create:
  - a **backend plan** section/file
  - a **frontend plan** section/file (only for the parts that need UI changes)
  - verification steps (tests + UAT checklist)