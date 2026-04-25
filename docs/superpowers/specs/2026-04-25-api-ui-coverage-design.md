# Lekurax API ↔ UI Coverage Mapping (Design)

**Date:** 2026-04-25  
**Status:** Approved (pending written-spec review)  
**Scope:** Lekurax backend + AuthzKit backend APIs consumed by Lekurax + Lekurax web UI (`frontend/web-ui`)  

## Goal

Produce a single markdown document that lets a reader quickly answer, for every **architecture module feature/subfeature**:

- **Which API endpoint(s)** implement it (Lekurax and/or AuthzKit)
- **Which frontend page(s)** surface it
- Whether the UI **actually calls** the endpoint(s) (not just that a route exists)
- What is **missing** (API absent, UI absent, UI present but does not call API)

This document is meant to be used as an operational “coverage map” for shipped functionality.

## Inputs (sources of truth)

- **Architecture**: `docs/pharmacy_system_architecture.md` (modules 1–19, features & subfeatures)
- **Roadmap**: `docs/superpowers/ROADMAP.md` (implemented units; used as a hint, not a source of truth)
- **Lekurax backend routes**:
  - Inline: `internal/httpserver/api.go` (direct Gin route declarations)
  - Module routers wired in: `internal/server/server.go` (calls `Register*Routes`)
  - Route definitions in: `internal/**/http/*.go`
- **AuthzKit backend routes** (API only; ignore Authz frontend):
  - Routers: `authz/internal/delivery/http/router/router.go` (mounts `/v1`)
  - Handlers: `authz/internal/delivery/http/handler/*.go` (register concrete routes)
- **Lekurax UI routes + calls**:
  - Route registry: `frontend/web-ui/src/App.jsx`
  - HTTP client(s): `frontend/web-ui/src/api/lekuraxApi.js` (`lekuraxFetch`)
  - Authz client: `frontend/web-ui/src/auth/authzkitClient.js` (`authzkit` SDK)
  - Additional helpers: `frontend/web-ui/src/lekurax/branchApi.js` etc.

## Non-goals

- Do not document Authz frontend UI routes/pages.
- Do not implement new endpoints or UI as part of this work.
- Do not attempt to infer runtime behavior beyond static evidence in code.

## Output document

### File name and location

- **Mapping doc path** (to be generated after this design is committed):
  - `docs/superpowers/api-ui-coverage.md`

### Structure

- One section per architecture module (Module 1 … Module 19).
- Under each module, include a table mapping features/subfeatures to:
  - backend endpoints (Lekurax and/or AuthzKit)
  - frontend pages
  - UI coverage status
  - evidence links (file paths)

### Table schema (columns)

| Feature / Subfeature | Lekurax endpoint(s) | AuthzKit endpoint(s) | Frontend page route(s) | UI calls endpoint? | Evidence (frontend file) | Notes |
|---|---|---|---|---|---|---|

#### Column semantics

- **Feature / Subfeature**: Exact text taken from `docs/pharmacy_system_architecture.md`. Items are grouped under their parent feature (e.g. “Branch/Location Management”).
- **Lekurax endpoint(s)**: One or more HTTP method+path entries under `/api/v1/...`. Use path params as declared (e.g. `:branch_id`).
- **AuthzKit endpoint(s)**: One or more HTTP method+path entries under `/v1/...` that Lekurax UI calls via the `authzkit` client.
- **Frontend page route(s)**: One or more routes from `frontend/web-ui/src/App.jsx` (e.g. `/lekurax/branches/:branchId/users`).
- **UI calls endpoint?**:
  - `YES`: at least one referenced frontend file contains a concrete API call that matches one of the endpoint(s) in this row.
  - `PARTIAL`: UI calls some endpoints for the row but not all, or supports only read paths but not write paths (or vice versa).
  - `NO`: UI page exists but no call is found for the required endpoint(s).
  - `none`: no UI route exists for the subfeature.
- **Evidence (frontend file)**: Concrete file(s) where the call is found (e.g. `frontend/web-ui/src/lekurax/ProductsPage.jsx`).
- **Notes**: free-form; used to clarify shared endpoints, tabs on same page, “API exists but UI missing”, etc.

## Evidence rules (static, code-based)

### What counts as “UI calls endpoint”

To mark `YES`/`PARTIAL`, we must find one of:

- A `lekuraxFetch("/api/v1/...")` call with a static string matching the endpoint path.
- A `lekuraxFetch(branchApiPath(branchId, "..."))` / computed path that clearly resolves to the endpoint (the computed suffix must match an endpoint under `/api/v1/branches/:branch_id/...`).
- An `authzkit.*` call that maps to a specific AuthzKit REST endpoint (e.g. branch CRUD, branch-user assignment, auth flows). Where the SDK obscures the final path, evidence must include:
  - the SDK method call site in UI, and
  - the SDK implementation that constructs the REST request path.

### What does not count

- A route existing in `App.jsx` without any calling code.
- Placeholder pages with only mock data.
- A network call to a different endpoint that only “seems related”.

## Mapping rules for missing/merged items

- If one endpoint covers multiple subfeatures, list it on every relevant row (repeatable).
- If multiple endpoints are needed for one subfeature (e.g. list + create + submit), list all.
- If **API exists but UI is missing**, set frontend route(s) to `none` and `UI calls endpoint?` to `NO` with a note.
- If **UI exists but API is missing**, set endpoints to `none` and mark as `NO` with a note.
- If an architecture item is out-of-scope for current implementation, still include it with `none` to make the gap explicit.

## Verification checklist (for the mapping doc)

- Every endpoint listed appears in code route registration (Lekurax or AuthzKit).
- Every “YES/PARTIAL” UI mark has at least one evidence file path.
- No references to frontend outside `frontend/web-ui`.
- No Authz frontend references.

