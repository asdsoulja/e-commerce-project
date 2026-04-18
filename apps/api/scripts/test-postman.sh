#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
COLLECTION_FILE="${API_DIR}/tests/postman/eecs-estore-api.postman_collection.json"
ENV_FILE="${API_DIR}/tests/postman/local.postman_environment.json"
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

API_LOG_FILE="$(mktemp "${TMPDIR:-/tmp}/estore-postman-api-log.XXXXXX")"
API_PID=""

cleanup() {
  if [[ -n "${API_PID}" ]] && kill -0 "${API_PID}" >/dev/null 2>&1; then
    kill "${API_PID}" >/dev/null 2>&1 || true
    wait "${API_PID}" 2>/dev/null || true
  fi
  rm -f "${API_LOG_FILE}"
}
trap cleanup EXIT

log() {
  printf '[postman-test] %s\n' "$1"
}

fail() {
  printf '\n[postman-test] FAILED: %s\n' "$1" >&2
  if [[ -s "${API_LOG_FILE}" ]]; then
    printf '[postman-test] API startup log:\n' >&2
    tail -n 120 "${API_LOG_FILE}" >&2 || true
  fi
  exit 1
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

log "Running Newman collection"
newman run "${COLLECTION_FILE}" \
  -e "${ENV_FILE}" \
  --env-var "baseUrl=${BASE_URL}" \
  --reporters cli

log "Postman/Newman tests passed"
