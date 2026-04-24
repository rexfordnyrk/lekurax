# Lekurax

Lekurax is a **multi-tenant pharmacy operations API** (inventory, pricing, patients, prescriptions, point of sale) built in Go. It does **not** implement authentication itself: it trusts **JWT access tokens issued by [AuthzKit](https://github.com/rexfordnyrk/authzkit)** (the `authz/` submodule in this repo), verifies signatures locally, and calls Authz over HTTP for branch membership and RBAC-aligned permission names.

Typical deployment: **AuthzKit** (identity, tenants, branches, roles) + **Lekurax API** (this service) + **web-ui** (React shell under `frontend/web-ui` with `/lekurax/*` screens).

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Go** | Version in `go.mod` (currently 1.25.x). |
| **PostgreSQL** | Separate database for Lekurax domain tables (e.g. `lekurax`). |
| **AuthzKit** | Running somewhere reachable; same JWT settings as configured below. |
| **Node.js** | Only if you build or develop `frontend/web-ui`. |

---

## Repository layout

| Path | Purpose |
|------|---------|
| `cmd/lekurax-api` | HTTP API entrypoint (Gin). |
| `cmd/lekurax-migrate` | Goose CLI: `up`, `down`, `status`. |
| `.air.toml` | Air hot-reload config for `make dev`. |
| `migrations/` | SQL migrations for the Lekurax database. |
| `internal/httpserver` | REST handlers and route registration. |
| `internal/auth` | JWT verification (**RS256** or **HS256**). |
| `internal/authzkit` | Authz HTTP client (service key + membership). |
| `authz/` | Git submodule → AuthzKit source (optional for local dev). |
| `frontend/web-ui` | React app; set `VITE_*` URLs to Authz + Lekurax. |
| `config.example.yaml` | **Copy to `config.yaml`** and edit (not committed). |

---

## 1. Clone and submodule

```bash
git clone <your-fork-or-origin-url> lekurax
cd lekurax
git submodule update --init --recursive
```

---

## 2. Configuration (`config.yaml`)

Copy the template and edit values:

```bash
cp config.example.yaml config.yaml
```

### Database

Same pattern as AuthzKit: either set **`db.dsn`** to a full Postgres URL, or set **`db.user`** and **`db.name`** plus optional **`db.host`** (default `localhost`), **`db.port`** (default `5432`), **`db.password`**, and **`db.sslmode`** (default `disable`). When `dsn` is empty, Lekurax **builds** the URL with proper encoding (so special characters in passwords are safe).

Environment examples: `LEKURAX_DB_USER`, `LEKURAX_DB_PASSWORD`, `LEKURAX_DB_NAME`, `LEKURAX_DB_HOST`, `LEKURAX_DB_PORT`, `LEKURAX_DB_SSLMODE`, or `LEKURAX_DB_DSN` for a raw override.

### Authz connection

Set:

- `authz.base_url` — Authz HTTP origin **without** `/v1` (the client appends `/v1/...`).
- `authz.service_api_key` — A valid Authz **service API key** for server-to-server calls (`X-Service-Key`).
- `authz.jwt_issuer` — Must match Authz’s `jwt.issuer` (e.g. `authzKit`).

### JWT algorithm (must match Authz)

Lekurax validates **the same algorithm** Authz uses to sign access tokens.

| Authz `jwt.algorithm` | Lekurax `authz.jwt_algorithm` | Lekurax key field |
|----------------------|------------------------------|-------------------|
| `RS256` | `RS256` (default) | `authz.rs256_public_key_pem` — PEM public key matching Authz’s signing keypair |
| `HS256` | `HS256` | `authz.hs256_signing_key` — **same secret** as Authz `jwt.signing_key` (minimum **32 characters**, same rule as Authz) |

Leave the unused key field empty for your chosen mode.

**Environment overrides:** any key can be set with prefix `LEKURAX_` and underscores, e.g. `LEKURAX_DB_DSN`, `LEKURAX_AUTHZ_HS256_SIGNING_KEY`.

---

## 3. Database migrations

From the repo root (with `config.yaml` or env vars loaded the same way as the API):

```bash
make migrate-up        # apply all pending migrations
make migrate-status    # show Goose status
make migrate-down      # roll back the last migration
```

Equivalent:

```bash
go run ./cmd/lekurax-migrate up
```

`migrate` needs a resolvable database (`db.dsn` or `db.user` + `db.name` + optional fields) and the Authz-related keys required by `internal/config` validation (you can use placeholder `authz.base_url` / `service_api_key` if you only run migrations and have those satisfied).

---

## 4. Run the API

```bash
make run
# or: go run ./cmd/lekurax-api
# or after: make build && ./bin/lekurax-api
```

**Hot reload (Air):** install [Air](https://github.com/air-verse/air) (`go install github.com/air-verse/air@latest`), then from the repo root:

```bash
make dev
```

This uses `.air.toml`: rebuilds on `*.go` / `*.yaml` under the tree, and **ignores** `frontend/`, `authz/`, `node_modules/`, `migrations/`, `tmp/`, Vite output, and test-only Go files (`*_test.go`).

Defaults: `http.addr` `:8081`, health at `GET /health/ready`.

---

## 5. Web UI (optional)

```bash
cd frontend/web-ui
cp .env.example .env.local
# Set VITE_AUTHZ_BASE_URL and VITE_LEKURAX_API_BASE_URL
npm install
npm run dev
```

Sign in through Authz; use a user with Lekurax permissions (see Authz seeder / migrations for `lekurax.*` permission names).

---

## 6. Local smoke (API + Authz + Postgres)

If Authz and Postgres are already running with RS256 keys and a seeded tenant, you can exercise the API with:

```bash
./scripts/dev-smoke-lekurax.sh
```

Read the script header for variables and key paths.

---

## Makefile targets

| Target | Description |
|--------|-------------|
| `make run` | Run `lekurax-api` once with `go run` (no reload). |
| `make dev` | Run API under **Air** hot reload (see `.air.toml`). |
| `make build` | Build `bin/lekurax-api` and `bin/lekurax-migrate`. |
| `make test` | Run `go test ./...`. |
| `make migrate-up` | Apply Goose migrations. |
| `make migrate-down` | Roll back one migration. |
| `make migrate-status` | Show migration status. |

---

## Security notes

- **Never commit `config.yaml`** (it is gitignored). Share `config.example.yaml` only.
- For **HS256**, protect the signing key like any production secret; prefer **RS256** for multi-service setups when possible.

---

## License

See repository root license file if present; otherwise follow your organization’s default policy.
