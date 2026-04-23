# Lekurax / Pharmaco — Superpowers Roadmap

**Source of truth for product modules:** `docs/pharmacy_system_architecture.md`  
**Planning convention:** Implementation plans live under `docs/superpowers/plans/` and follow the writing-plans header (agentic checkbox steps).

---

## Track overview

| Track | Architecture § | Theme                         | Codebase today                         |
| ----- | -------------- | ----------------------------- | -------------------------------------- |
| 1     | §1             | User management & security    | `authz/` (Gin, GORM, RBAC, tenants)    |
| 2     | §2             | Organization & branches       | Partial in `authz` (`Branch` model)   |
| 3     | §3             | Inventory management          | Not implemented in `lekurax` root app |
| **4** | **§4**         | **Supplier & procurement**    | **Not implemented — plans ready**      |
| **5** | **§5**         | **Product catalog & pricing** | **Not implemented — plans ready**      |
| 6     | §6             | Customer & patient management | Not implemented                        |
| 7+    | §7+            | Prescriptions, POS, …         | Not implemented                        |

---

## Track 4 — Supplier & procurement (§4)

**Master plan:** `docs/superpowers/plans/2026-04-23-track-4-supplier-procurement-all-modules.md`  
**Companion sources (Tasks 2–3 paste-ready):** `docs/superpowers/plans/2026-04-23-track-4-procurement-tasks-2-6-sources.md`

| Module (architecture feature block)     | Status      | Plan section        |
| --------------------------------------- | ----------- | ------------------- |
| Advanced supplier management            | Plan ready  | Track 4 — Task 1    |
| Purchase requisition system             | Plan ready  | Track 4 — Task 2    |
| RFQ management                          | Plan ready  | Track 4 — Task 3    |
| Contract management                     | Plan ready  | Track 4 — Task 4    |
| Vendor performance analytics            | Plan ready  | Track 4 — Task 5    |
| Payment processing integration (AP)     | Plan ready  | Track 4 — Task 6    |

---

## Track 5 — Product catalog & pricing (§5)

**Master plan:** `docs/superpowers/plans/2026-04-23-track-5-product-catalog-pricing-all-modules.md`

| Module (architecture feature block) | Status     | Plan section     |
| ----------------------------------- | ---------- | ---------------- |
| Product information management      | Plan ready | Track 5 — Task 1 |
| Pricing strategies                  | Plan ready | Track 5 — Task 2 |
| Markup & margin management          | Plan ready | Track 5 — Task 3 |
| Discount & promotion management     | Plan ready | Track 5 — Task 4 |
| Tax configuration                   | Plan ready | Track 5 — Task 5 |
| Price list management               | Plan ready | Track 5 — Task 6 |

---

## Dependencies (read before execution)

- **Track 4** depends on **Track 2** (tenant, branch) and **Track 3** (product/SKU identifiers for PO lines). The Track 4 plan includes minimal **stub** product/branch foreign keys so vertical slices run before full inventory exists.
- **Track 5** depends on **Track 3** product master; the Track 5 plan uses a minimal `catalog_product` aggregate introduced in Task 1.

---

## Changelog

| Date       | Change                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| 2026-04-23 | Initial roadmap; Track 4 & 5 marked plan-ready with linked plan files. |
| 2026-04-23 | Linked Track 4 companion paste sources (`2026-04-23-track-4-procurement-tasks-2-6-sources.md`). |
