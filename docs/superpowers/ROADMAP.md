# Lekurax — MVP-to-Production Roadmap (Backend + Frontend)

**Date:** 2026-04-23  
**Spec:** `docs/superpowers/specs/2026-04-23-lekurax-mvp-design.md`

This roadmap tracks **what is implemented vs pending** for both **backend** and **frontend** using the same unit structure for MVP and post‑MVP extensions.

Legend:
- ✅ Done
- ⏳ In progress
- ⬜ Not started

---

## MVP to Production (must ship first)

### Foundation

- [ ] **F0 Platform runtime** (backend) — config, migrations, health checks
  - Backend: ⬜
  - Frontend: n/a

- [ ] **F1 Tenancy + tenant config contract** (backend + frontend bootstrap UX)
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **F2 AuthN/AuthZ integration contract** (backend middleware + frontend SDK integration)
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **F3 Branch context + multi-branch assignment** (authz gap fix + UI selector)
  - Backend: ⬜
  - Frontend: ⬜

### MVP Business Slice

- [ ] **M1 Organization & Branch management (minimal complete)**  
  CRUD + permissions + audit + branch/user assignment
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **M2 Inventory (minimal complete)**  
  Product master + stock (batch/expiry) + adjustments + audit
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **M3 Pricing & Tax (minimal complete)**  
  Base pricing + tax rules sufficient for POS totals
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **M4 Customer/Patient (minimal complete)**  
  Patient identity + allergies
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **M5 Prescription (minimal complete)**  
  Manual entry + dispense + stock decrement + audit (+ hooks for clinical checks)
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **M6 POS (minimal complete)**  
  OTC + prescription-linked checkout + receipt record + audit
  - Backend: ⬜
  - Frontend: ⬜

---

## Post‑MVP Extensions (additive, same spec format)

Each extension below is tracked as a unit with backend+frontend deliverables. These can be shipped incrementally after MVP is stable in production.

- [ ] **E1 Insurance & Claims (Module 9)**  
  Eligibility, claim submission, rejection handling, reconciliation.
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **E2 Procurement advanced workflows (Module 4)**  
  Requisitions, RFQ, contracts, approvals (beyond MVP inventory purchasing basics).
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **E3 Reporting & Analytics (Module 11)**  
  Dashboards + exports; phased report library.
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **E4 Notifications & Communications (Module 13)**  
  Template library, retries, preferences, in-app + SMS/email beyond MVP operational alerts.
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **E5 Document Management (Module 16)**  
  Secure storage, versioning, access control, OCR (if needed).
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **E6 Training & Knowledge (Module 17)**  
  LMS + competency tracking.
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **E7 Quality Assurance & Compliance (Module 18)**  
  Incident/error reporting, CAPA, audits, risk registry.
  - Backend: ⬜
  - Frontend: ⬜

- [ ] **E8 Integrations & Interop (Module 12)**  
  FHIR/HL7, PDMP/PMP, drug DBs, accounting export, payment gateways.
  - Backend: ⬜
  - Frontend: ⬜ (only where end-user workflows require)

- [ ] **E9 Mobile & Online Services (Module 14)**  
  Patient portal, refills, booking.
  - Backend: ⬜
  - Frontend: ⬜ (if web portal; mobile app tracked separately)

- [ ] **E10 Delivery & Logistics (Module 15)**  
  Courier mgmt, routing, tracking, cold chain.
  - Backend: ⬜
  - Frontend: ⬜

---

## Notes

- MVP units are implemented **backend-first**, then frontend in the **same order**, to maintain tangible end-to-end progress.
- For every unit we will create:
  - a **backend plan** section/file
  - a **frontend plan** section/file (only for the parts that need UI changes)
  - verification steps (tests + UAT checklist)

