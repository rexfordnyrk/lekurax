# API ↔ UI Coverage Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate `docs/superpowers/api-ui-coverage.md`, mapping each architecture feature/subfeature to implemented Lekurax/AuthzKit API endpoints and the Lekurax UI pages that actually call them.

**Architecture:** Enumerate backend routes from code (Lekurax `/api/v1`, AuthzKit `/v1`), enumerate UI routes from `frontend/web-ui/src/App.jsx`, then prove UI coverage by tracing concrete frontend API calls (`lekuraxFetch` and `authzkit` SDK usage) back to those endpoints.

**Tech Stack:** Go (Gin) backend route registration, React Router frontend, `lekuraxFetch()` wrapper, AuthzKit JS SDK.

---

## File map (inputs / outputs)

**Inputs**
- `docs/pharmacy_system_architecture.md` (module → features/subfeatures)
- Lekurax API routes:
  - `internal/httpserver/api.go`
  - `internal/server/server.go`
  - `internal/**/http/*.go`
- AuthzKit API routes:
  - `authz/internal/delivery/http/router/router.go`
  - `authz/internal/delivery/http/handler/*.go`
- UI routes + API calls:
  - `frontend/web-ui/src/App.jsx`
  - `frontend/web-ui/src/api/lekuraxApi.js`
  - `frontend/web-ui/src/auth/authzkitClient.js`
  - `frontend/web-ui/src/**` (pages/components that call APIs)

**Outputs**
- Create: `docs/superpowers/api-ui-coverage.md`

---

### Task 1: Inventory implemented backend endpoints (Lekurax + AuthzKit)

**Files:**
- Read: `internal/httpserver/api.go`
- Read: `internal/server/server.go`
- Read: `internal/**/http/*.go`
- Read: `authz/internal/delivery/http/router/router.go`
- Read: `authz/internal/delivery/http/handler/*.go`

- [ ] **Step 1: List all Lekurax endpoints under `/api/v1`**
  - Extract every `v1.<METHOD>("...")` route from `internal/httpserver/api.go`.
  - From `internal/server/server.go`, follow each `Register*Routes(...)` call and extract routes from those registrar files.
  - Normalize into `METHOD /api/v1/...` with path params preserved (e.g. `:branch_id`, `:id`).

- [ ] **Step 2: List all AuthzKit endpoints under `/v1`**
  - Confirm `/v1` group mount in `authz/internal/delivery/http/router/router.go`.
  - For each handler in `authz/internal/delivery/http/handler/*.go`, extract routes registered on the router group (e.g. `/branches`, `/auth/branch/switch`).
  - Normalize into `METHOD /v1/...`.

- [ ] **Step 3: Sanity check endpoint lists**
  - Ensure no duplicates after normalization.
  - Ensure every normalized entry can be pointed back to a specific source file path.

---

### Task 2: Inventory UI routes and prove API call evidence

**Files:**
- Read: `frontend/web-ui/src/App.jsx`
- Read: `frontend/web-ui/src/api/lekuraxApi.js`
- Read: `frontend/web-ui/src/auth/authzkitClient.js`
- Read: `frontend/web-ui/src/**` (only as needed for evidence)

- [ ] **Step 1: Extract UI route list**
  - From `frontend/web-ui/src/App.jsx`, list all routes under `/lekurax/*` and `/portal/*` that correspond to business functionality.
  - Keep the exact path strings (e.g. `/lekurax/requisitions/:id`).

- [ ] **Step 2: Build evidence map for Lekurax API calls**
  - Locate every `lekuraxFetch("...")` call site under `frontend/web-ui/src/`.
  - Also locate computed calls that build `/api/v1/branches/:branch_id/...` using helpers like `branchApiPath(...)`.
  - For each call site, record:
    - frontend file path
    - resolved method (if the call passes `{ method: ... }`, otherwise assume GET)
    - resolved path template (e.g. `GET /api/v1/products`, `POST /api/v1/branches/:branch_id/requisitions/:id/submit`)

- [ ] **Step 3: Build evidence map for AuthzKit API calls**
  - Locate `authzkit.*` call sites in `frontend/web-ui/src/` (e.g. branch list/create, branch-user assignment, branch switch, login).
  - For each SDK call site, map it to an AuthzKit REST endpoint by reading the AuthzKit SDK implementation (in `authz/` or node module source if vendored) if necessary.
  - Record the frontend file path(s) for evidence, and the resolved `METHOD /v1/...`.

---

### Task 3: Write `docs/superpowers/api-ui-coverage.md` (module-by-module)

**Files:**
- Create: `docs/superpowers/api-ui-coverage.md`
- Read: `docs/pharmacy_system_architecture.md`

- [ ] **Step 1: Create doc skeleton**
  - Title, date, scope rules (Lekurax `/api/v1`, AuthzKit `/v1`, UI must call endpoint to count).
  - Add a short legend: `YES`, `PARTIAL`, `NO`, `none`.
  - Create 19 module sections matching the architecture doc headings.

- [ ] **Step 2: Fill module tables**
  - For each architecture subfeature row:
    - Populate **Lekurax endpoint(s)** when the endpoint exists in Task 1 list.
    - Populate **AuthzKit endpoint(s)** when implemented there (esp. organization/branch/user assignment).
    - Populate **Frontend page route(s)** from `App.jsx`.
    - Set **UI calls endpoint?** using evidence maps from Task 2.
    - Add **Evidence (frontend file)** paths for every `YES`/`PARTIAL`.
    - If missing, explicitly write `none` and explain in **Notes**.

- [ ] **Step 3: Coverage QA pass**
  - Spot-check at least one row per implemented roadmap unit (M1–M6, E1–E10) to ensure:
    - endpoints are real (exist in code)
    - UI evidence points to real call sites
  - Confirm there are no references to frontend directories outside `frontend/web-ui`.

---

### Task 4: Commit the mapping doc

**Files:**
- Add: `docs/superpowers/api-ui-coverage.md`

- [ ] **Step 1: Stage**

```bash
git add docs/superpowers/api-ui-coverage.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: map architecture features to API endpoints and UI coverage

Creates an evidence-backed matrix linking each module feature/subfeature to implemented Lekurax/AuthzKit endpoints and the UI pages that actually call them.
EOF
)"
```

---

## Self-review checklist (plan vs spec)

- Spec requires both Lekurax and AuthzKit APIs: covered by Task 1.
- Spec requires UI coverage only when the UI calls endpoints: covered by Task 2 evidence maps + Task 3 rules.
- Spec requires ignoring non-`frontend/web-ui`: enforced in Tasks 2–3.
- No placeholders like “TODO/TBD”: all steps are explicit and file-based.

