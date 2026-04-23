# Lekurax MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Lekurax as a multi-tenant SaaS with a single-branch MVP, starting with authentication flows and branch-context enforcement, then delivering an end-to-end operational slice (Inventory → Prescription → POS).

**Architecture:** Auth is provided by the existing `authz` service. Lekurax backend is a separate Go API that verifies AuthzKit JWTs and enforces tenant+branch context for every request. Frontend `frontend/web-ui` integrates `@authzkit/client` and provides branch selection and module pages as backend endpoints land.

**Tech Stack:** Go (Gin, GORM, Postgres, Goose, Zap, Viper), React (existing `frontend/web-ui`), AuthzKit (`authz` service + `@authzkit/client`)

---

## Plan File Index (implement in this order)

### Foundation (must be completed before MVP modules)
- `docs/superpowers/plans/2026-04-23-lekurax-mvp-backend-foundation.md`
- `docs/superpowers/plans/2026-04-23-lekurax-mvp-frontend-auth-foundation.md`

### MVP Modules (backend first, then frontend in the same order)
- `docs/superpowers/plans/2026-04-23-lekurax-mvp-m1-org-branch.md`
- `docs/superpowers/plans/2026-04-23-lekurax-mvp-m2-inventory.md`
- `docs/superpowers/plans/2026-04-23-lekurax-mvp-m3-pricing-tax.md`
- `docs/superpowers/plans/2026-04-23-lekurax-mvp-m4-patient.md`
- `docs/superpowers/plans/2026-04-23-lekurax-mvp-m5-prescription.md`
- `docs/superpowers/plans/2026-04-23-lekurax-mvp-m6-pos.md`

### Tracking
- Update statuses in `docs/superpowers/ROADMAP.md` as each unit completes (backend + frontend).

