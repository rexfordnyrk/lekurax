#!/usr/bin/env bash
# Local smoke: Postgres + Redis + Authz (RS256) + Lekurax API + curl checks.
#
# Defaults match authz test helper and seed defaults:
#   Postgres: postgres://postgres:postgres@127.0.0.1:5432/{authz,lekurax}
#   Platform seed (migrate seed): admin@example.com / authenticateMe
#   Platform tenant id: resolve from DB (slug "platform") or login response.
#
# Prerequisites:
#   - Postgres and Redis reachable on localhost
#   - RSA keypair at /tmp/pharmaco-keys/private.pem and public.pem (openssl genrsa)
#   - authz DB migrated + seeded (RS256):
#       cd authz && AUTH_DATABASE_DSN=... AUTH_REDIS_ADDRESS=... AUTH_JWT_ALGORITHM=RS256 \
#         AUTH_JWT_PRIVATE_KEY_PATH=... AUTH_JWT_PUBLIC_KEY_PATH=... AUTH_JWT_ISSUER=authzKit \
#         AUTH_MFA_ENCRYPTION_KEY=... go run ./cmd/migrate/main.go up seed
#   - lekurax DB migrated:
#       cd repo root && LEKURAX_DB_DSN=... LEKURAX_AUTHZ_BASE_URL=http://127.0.0.1:18080 \
#         LEKURAX_AUTHZ_SERVICE_API_KEY=dummy go run ./cmd/lekurax-migrate

set -euo pipefail

AUTHZ_PORT="${AUTHZ_PORT:-18080}"
LEKURAX_PORT="${LEKURAX_PORT:-18081}"
PG_DSN_AUTHZ="${PG_DSN_AUTHZ:-postgres://postgres:postgres@127.0.0.1:5432/authz?sslmode=disable}"
PG_DSN_LEKURAX="${PG_DSN_LEKURAX:-postgres://postgres:postgres@127.0.0.1:5432/lekurax?sslmode=disable}"
KEY_DIR="${KEY_DIR:-/tmp/pharmaco-keys}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== health (authz) =="
curl -fsS "http://127.0.0.1:${AUTHZ_PORT}/health/live" | jq .

PLATFORM_TENANT_ID="$(psql "$PG_DSN_AUTHZ" -tAc "select id from tenants where slug='platform' limit 1" | tr -d '[:space:]')"
echo "platform_tenant_id=$PLATFORM_TENANT_ID"

echo "== login platform admin (seed defaults) =="
PLATFORM_TOKEN="$(curl -fsS "http://127.0.0.1:${AUTHZ_PORT}/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"admin@example.com\",\"password\":\"authenticateMe\",\"tenant_id\":\"${PLATFORM_TENANT_ID}\"}" \
  | jq -r '.data.access_token')"

SLUG="leksmoke$(date +%s)"
echo "== provision tenant slug=$SLUG =="
TENANT_JSON="$(curl -fsS "http://127.0.0.1:${AUTHZ_PORT}/v1/admin/tenants" \
  -H "Authorization: Bearer ${PLATFORM_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "{\"tenant_name\":\"Smoke Tenant\",\"slug\":\"${SLUG}\",\"admin_email\":\"smoke@example.com\",\"admin_password\":\"Testpass1!\",\"admin_first_name\":\"Smoke\",\"admin_last_name\":\"User\",\"config\":{\"branches_enabled\":true}}")"

TENANT_ID="$(echo "$TENANT_JSON" | jq -r '.data.tenant.id')"
ADMIN_ID="$(echo "$TENANT_JSON" | jq -r '.data.admin.id')"
echo "tenant_id=$TENANT_ID admin_id=$ADMIN_ID"

echo "== activate tenant admin (provisioned users may be pending email) =="
psql "$PG_DSN_AUTHZ" -c "UPDATE users SET status = 'active', email_verified = true WHERE id = '${ADMIN_ID}';" >/dev/null

TENANT_TOKEN="$(curl -fsS "http://127.0.0.1:${AUTHZ_PORT}/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"smoke@example.com\",\"password\":\"Testpass1!\",\"tenant_id\":\"${TENANT_ID}\"}" \
  | jq -r '.data.access_token')"

echo "== create branch =="
BRANCH_JSON="$(curl -fsS "http://127.0.0.1:${AUTHZ_PORT}/v1/branches" \
  -H "Authorization: Bearer ${TENANT_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Main","code":"MAIN"}')"
BRANCH_ID="$(echo "$BRANCH_JSON" | jq -r '.data.id')"
echo "branch_id=$BRANCH_ID"

echo "== write lekurax config (uses public key from ${KEY_DIR}) =="
SMOKE_CFG="/tmp/lekurax-smoke-runtime.yaml"
cat >"$SMOKE_CFG" <<EOF
http:
  addr: ":${LEKURAX_PORT}"
db:
  dsn: "${PG_DSN_LEKURAX}"
authz:
  base_url: "http://127.0.0.1:${AUTHZ_PORT}"
  service_api_key: "sak_ten_smoke_dummy"
  jwt_issuer: "authzKit"
  rs256_public_key_pem: |
$(sed 's/^/    /' "${KEY_DIR}/public.pem")
EOF

echo "== lekurax health (expects API already running with this config) =="
curl -fsS "http://127.0.0.1:${LEKURAX_PORT}/health/ready" | jq .

echo "== lekurax product + stock =="
PROD="$(curl -fsS "http://127.0.0.1:${LEKURAX_PORT}/api/v1/products" \
  -H "Authorization: Bearer ${TENANT_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Med","is_prescription":false,"is_controlled":false}' | jq -r '.id')"
curl -fsS -X PUT "http://127.0.0.1:${LEKURAX_PORT}/api/v1/products/${PROD}/price" \
  -H "Authorization: Bearer ${TENANT_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"currency":"USD","unit_price_cents":100}' >/dev/null

curl -fsS "http://127.0.0.1:${LEKURAX_PORT}/api/v1/branches/${BRANCH_ID}/stock/receive" \
  -H "Authorization: Bearer ${TENANT_TOKEN}" \
  -H "X-Branch-Id: ${BRANCH_ID}" \
  -H 'Content-Type: application/json' \
  -d "{\"product_id\":\"${PROD}\",\"batch_no\":\"S1\",\"quantity\":10}" | jq .

echo "OK smoke complete."
