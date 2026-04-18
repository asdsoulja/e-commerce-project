#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
TEST_API_PORT="${TEST_API_PORT:-4010}"
BASE_URL="${API_BASE_URL:-http://localhost:${TEST_API_PORT}/api}"
AUTO_START_API="${AUTO_START_API:-1}"
SKIP_DB_SETUP="${SKIP_DB_SETUP:-0}"

API_PORT="$(python3 - "${BASE_URL}" <<'PY'
import sys
from urllib.parse import urlparse

url = urlparse(sys.argv[1])
if not url.scheme or not url.hostname:
    raise SystemExit("Invalid API_BASE_URL. Expected format: http(s)://host[:port]/api")

if url.port is not None:
    print(url.port)
elif url.scheme == "https":
    print(443)
else:
    print(80)
PY
)"

COOKIE_JAR="$(mktemp "${TMPDIR:-/tmp}/estore-curl-cookie.XXXXXX")"
RESPONSE_FILE="$(mktemp "${TMPDIR:-/tmp}/estore-curl-body.XXXXXX")"
API_LOG_FILE="$(mktemp "${TMPDIR:-/tmp}/estore-api-log.XXXXXX")"
API_PID=""
LAST_STATUS=""

cleanup() {
  if [[ -n "${API_PID}" ]] && kill -0 "${API_PID}" >/dev/null 2>&1; then
    kill "${API_PID}" >/dev/null 2>&1 || true
    wait "${API_PID}" 2>/dev/null || true
  fi
  rm -f "${COOKIE_JAR}" "${RESPONSE_FILE}" "${API_LOG_FILE}"
}
trap cleanup EXIT

log() {
  printf '[curl-test] %s\n' "$1"
}

fail() {
  printf '\n[curl-test] FAILED: %s\n' "$1" >&2
  if [[ -s "${RESPONSE_FILE}" ]]; then
    printf '[curl-test] Response body:\n' >&2
    cat "${RESPONSE_FILE}" >&2
    printf '\n' >&2
  fi
  exit 1
}

api_request() {
  local method="$1"
  local path="$2"
  local body="${3-}"
  local url="${BASE_URL}${path}"

  if [[ -n "${body}" ]]; then
    LAST_STATUS="$(curl -sS -o "${RESPONSE_FILE}" -w "%{http_code}" -X "${method}" "${url}" \
      -H "Content-Type: application/json" \
      -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
      --data "${body}")"
  else
    LAST_STATUS="$(curl -sS -o "${RESPONSE_FILE}" -w "%{http_code}" -X "${method}" "${url}" \
      -b "${COOKIE_JAR}" -c "${COOKIE_JAR}")"
  fi
}

assert_status() {
  local expected="$1"
  local context="$2"
  if [[ "${LAST_STATUS}" != "${expected}" ]]; then
    fail "${context}: expected HTTP ${expected}, got ${LAST_STATUS}"
  fi
}

wait_for_api() {
  local attempts=40
  local wait_seconds=1

  for _ in $(seq 1 "${attempts}"); do
    if curl -sS -o /dev/null "${BASE_URL}/health" 2>/dev/null; then
      return 0
    fi
    sleep "${wait_seconds}"
  done

  return 1
}

start_api_if_needed() {
  if curl -sS -o /dev/null "${BASE_URL}/health" 2>/dev/null; then
    log "Using running API at ${BASE_URL}"
    return
  fi

  if [[ "${AUTO_START_API}" != "1" ]]; then
    fail "API is not reachable at ${BASE_URL} and AUTO_START_API=0"
  fi

  log "Starting API because ${BASE_URL}/health is not reachable"
  (
    cd "${API_DIR}"
    PORT="${API_PORT}" npm run dev >"${API_LOG_FILE}" 2>&1
  ) &
  API_PID="$!"

  if ! wait_for_api; then
    printf '[curl-test] API startup log:\n' >&2
    tail -n 120 "${API_LOG_FILE}" >&2 || true
    fail "API did not become healthy"
  fi

  log "API started"
}

if [[ "${SKIP_DB_SETUP}" != "1" ]]; then
  log "Running db:push and db:seed"
  (
    cd "${API_DIR}"
    npm run db:push >/dev/null
    npm run db:seed >/dev/null
  )
fi

start_api_if_needed

log "Checking health"
api_request "GET" "/health"
assert_status "200" "Health check"

log "Fetching catalog and selecting an item"
api_request "GET" "/catalog/items"
assert_status "200" "Catalog listing"
ITEM_ID="$(python3 - "${RESPONSE_FILE}" <<'PY'
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    data = json.load(fh)
items = data.get('items') or []
if not items:
    raise SystemExit('No catalog items found; run db:seed first.')
item_id = items[0].get('id')
if not item_id:
    raise SystemExit('Catalog item has no id.')
print(item_id)
PY
)"

log "Adding one item to guest cart"
ADD_CART_PAYLOAD="$(cat <<JSON
{"itemId":"${ITEM_ID}","quantity":1}
JSON
)"
api_request "POST" "/cart/items" "${ADD_CART_PAYLOAD}"
assert_status "201" "Add item to guest cart"

log "Registering a customer account with default shipping/billing/payment"
RANDOM_SUFFIX="$(date +%s)-${RANDOM}"
CUSTOMER_EMAIL="curl.qa.${RANDOM_SUFFIX}@example.local"
REGISTER_PAYLOAD="$(cat <<JSON
{
  "firstName": "Curl",
  "lastName": "Tester",
  "email": "${CUSTOMER_EMAIL}",
  "password": "Customer123!",
  "phone": "4165551000",
  "shippingAddress": {
    "street": "101 Curl Street",
    "province": "Ontario",
    "country": "Canada",
    "zip": "M1M1M1",
    "phone": "4165551000"
  },
  "billingAddress": {
    "street": "101 Curl Street",
    "province": "Ontario",
    "country": "Canada",
    "zip": "M1M1M1",
    "phone": "4165551000"
  },
  "creditCard": {
    "cardHolder": "Curl Tester",
    "cardNumber": "4111 1111 1111 1111",
    "expiryMonth": "12",
    "expiryYear": "2030",
    "cvv": "123"
  }
}
JSON
)"
api_request "POST" "/identity/register" "${REGISTER_PAYLOAD}"
assert_status "201" "Customer registration"

log "Validating authenticated identity/me"
api_request "GET" "/identity/me"
assert_status "200" "Identity me after registration"
python3 - "${RESPONSE_FILE}" "${CUSTOMER_EMAIL}" <<'PY'
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    data = json.load(fh)
expected_email = sys.argv[2]
actual_email = (((data.get('user') or {}).get('email')) or '').strip().lower()
if actual_email != expected_email.strip().lower():
    raise SystemExit(f'Expected authenticated email {expected_email}, got {actual_email!r}')
PY

log "Verifying guest cart merged after registration"
api_request "GET" "/cart"
assert_status "200" "Merged cart lookup after registration"
python3 - "${RESPONSE_FILE}" "${ITEM_ID}" <<'PY'
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    data = json.load(fh)
target_item_id = sys.argv[2]
items = (((data.get('cart') or {}).get('items')) or [])
matching = [entry for entry in items if entry.get('itemId') == target_item_id]
if not matching:
    raise SystemExit(f'Expected merged cart to include item {target_item_id}.')
if int(matching[0].get('quantity') or 0) < 1:
    raise SystemExit('Merged cart item quantity must be at least 1.')
PY

log "Updating customer profile defaults"
PROFILE_PATCH_PAYLOAD='{"phone":"4165551001","shippingAddress":{"street":"101 Curl Street","province":"Ontario","country":"Canada","zip":"M1M1M1","phone":"4165551001"},"billingAddress":{"street":"101 Curl Street","province":"Ontario","country":"Canada","zip":"M1M1M1","phone":"4165551001"}}'
api_request "PATCH" "/identity/me" "${PROFILE_PATCH_PAYLOAD}"
assert_status "200" "Profile update"

log "Verifying updated profile values"
api_request "GET" "/identity/me"
assert_status "200" "Identity me after profile update"
python3 - "${RESPONSE_FILE}" <<'PY'
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    data = json.load(fh)
phone = (((data.get('user') or {}).get('phone')) or '').strip()
if phone != '4165551001':
    raise SystemExit(f"Expected updated phone '4165551001', got {phone!r}")
PY

log "Running checkout using saved payment profile"
CHECKOUT_PAYLOAD='{"shippingAddress":{"street":"101 Curl Street","province":"Ontario","country":"Canada","zip":"M1M1M1","phone":"4165551001"},"billingAddress":{"street":"101 Curl Street","province":"Ontario","country":"Canada","zip":"M1M1M1","phone":"4165551001"},"creditCard":{"cardHolder":"Curl Tester","expiryMonth":"12","expiryYear":"2030","cvv":"123"},"useSavedPayment":true,"saveAsDefault":true}'
api_request "POST" "/orders/checkout" "${CHECKOUT_PAYLOAD}"
assert_status "200" "Checkout"
python3 - "${RESPONSE_FILE}" <<'PY'
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    data = json.load(fh)
if not isinstance(data.get('approved'), bool):
    raise SystemExit('Checkout response must include boolean "approved" field.')
PY

log "Checking purchase history endpoint"
api_request "GET" "/orders/history"
assert_status "200" "Order history"

log "Verifying customer cannot access admin endpoint"
api_request "GET" "/admin/users"
assert_status "403" "Admin access restriction for customer"

log "Logging in as seeded admin"
ADMIN_LOGIN_PAYLOAD='{"email":"admin@estore.local","password":"Admin123!"}'
api_request "POST" "/identity/login" "${ADMIN_LOGIN_PAYLOAD}"
assert_status "200" "Admin login"

log "Checking admin users endpoint"
api_request "GET" "/admin/users"
assert_status "200" "Admin users listing"
python3 - "${RESPONSE_FILE}" <<'PY'
import json
import sys

with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    data = json.load(fh)
users = data.get('users') or []
if not users:
    raise SystemExit('Expected at least one user in admin users list.')
PY

log "Logging out and validating protected endpoint rejection"
api_request "POST" "/identity/logout"
assert_status "204" "Logout"
api_request "GET" "/identity/me"
assert_status "401" "Auth guard after logout"

log "All curl smoke tests passed"
