#!/usr/bin/env bash
# Post-deployment smoke test for the Nginx -> Nuxt/FastAPI topology.
#
# Usage:
#   BASE_URL=https://blog.example.com CURL_INSECURE=1 docker/smoke.sh
#   BASE_URL=https://blog.example.com CURL_INSECURE=1 \
#     SMOKE_ADMIN_USERNAME=... SMOKE_ADMIN_PASSWORD=... docker/smoke.sh
#
# The anonymous checks always run. The administrator checks run only when
# SMOKE_ADMIN_USERNAME and SMOKE_ADMIN_PASSWORD are provided.
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1}"
CURL_OPTS=(--max-time 15)
if [[ "${CURL_INSECURE:-0}" == "1" ]]; then
  CURL_OPTS+=(-k)
fi
if [[ -n "${CURL_RESOLVE:-}" ]]; then
  CURL_OPTS+=(--resolve "$CURL_RESOLVE")
fi

BODY_FILE="$(mktemp)"
COOKIE_JAR="$(mktemp)"
HEADER_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE" "$COOKIE_JAR" "$HEADER_FILE"' EXIT

failures=0

status_of() {
  curl -sS -o "$BODY_FILE" -w '%{http_code}' "${CURL_OPTS[@]}" "$@" || echo "000"
}

check_status() {
  local name="$1" expected="$2"
  shift 2
  local code
  code="$(status_of "$@")"
  if [[ "$code" == "$expected" ]]; then
    echo "PASS $name ($code)"
  else
    echo "FAIL $name (expected $expected, got $code)"
    failures=$((failures + 1))
  fi
}

check_body() {
  local name="$1" pattern="$2"
  shift 2
  local code
  code="$(status_of "$@")"
  if [[ "$code" == "200" ]] && grep -q "$pattern" "$BODY_FILE"; then
    echo "PASS $name"
  else
    echo "FAIL $name (status $code, pattern '$pattern' not found)"
    failures=$((failures + 1))
  fi
}

csrf_token() {
  status_of -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL/api/v1/auth/csrf" >/dev/null
  sed -n 's/.*"token":"\([^"]*\)".*/\1/p' "$BODY_FILE"
}

echo "Smoke testing $BASE_URL"

check_status "nginx health endpoint" 200 "$BASE_URL/healthz"
check_status "backend liveness" 200 "$BASE_URL/api/v1/health/live"
check_status "backend readiness" 200 "$BASE_URL/api/v1/health/ready"
check_body "homepage server rendering" "<html" "$BASE_URL/"
check_status "unknown upload is not served" 404 "$BASE_URL/uploads/does-not-exist.png"
check_status "untrusted Host is rejected" 400 -H "Host: attacker.example.com" \
  "$BASE_URL/api/v1/health/live"
check_status "unauthenticated admin API is rejected" 401 "$BASE_URL/api/v1/admin/dashboard"

security_headers="$(curl -sS -D - -o /dev/null "${CURL_OPTS[@]}" "$BASE_URL/" | tr -d '\r')"
for header in "x-content-type-options: nosniff" "referrer-policy: strict-origin-when-cross-origin"; do
  if grep -qi "^$header" <<<"$security_headers"; then
    echo "PASS response header '$header'"
  else
    echo "FAIL response header '$header' missing"
    failures=$((failures + 1))
  fi
done

if [[ "${BASE_URL%%:*}" == "https" ]]; then
  if grep -qi "^strict-transport-security:" <<<"$security_headers"; then
    echo "PASS HTTPS HSTS header"
  else
    echo "FAIL HTTPS HSTS header missing"
    failures=$((failures + 1))
  fi
fi

if [[ -n "${SMOKE_ADMIN_USERNAME:-}" && -n "${SMOKE_ADMIN_PASSWORD:-}" ]]; then
  echo "Running administrator checks as $SMOKE_ADMIN_USERNAME"

  check_status "login without CSRF header is rejected" 403 \
    -X POST -H "Content-Type: application/json" \
    -d "{\"username\":\"$SMOKE_ADMIN_USERNAME\",\"password\":\"$SMOKE_ADMIN_PASSWORD\"}" \
    "$BASE_URL/api/v1/auth/login"

  CSRF_TOKEN="$(csrf_token)"
  if [[ -z "$CSRF_TOKEN" ]]; then
    echo "FAIL could not read CSRF token"
    failures=$((failures + 1))
  else
    login_code="$(curl -sS -o "$BODY_FILE" -D "$HEADER_FILE" -w '%{http_code}' "${CURL_OPTS[@]}" \
      -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
      -X POST -H "Content-Type: application/json" -H "X-CSRF-Token: $CSRF_TOKEN" \
      -d "{\"username\":\"$SMOKE_ADMIN_USERNAME\",\"password\":\"$SMOKE_ADMIN_PASSWORD\"}" \
      "$BASE_URL/api/v1/auth/login")"
    if [[ "$login_code" == "200" ]]; then
      echo "PASS administrator login (200)"
    else
      echo "FAIL administrator login (expected 200, got $login_code)"
      failures=$((failures + 1))
    fi
    for flag in HttpOnly Secure; do
      if grep -qi "$flag" "$HEADER_FILE"; then
        echo "PASS session cookie has $flag"
      else
        echo "FAIL session cookie is missing $flag"
        failures=$((failures + 1))
      fi
    done

    check_status "current administrator session" 200 \
      -b "$COOKIE_JAR" "$BASE_URL/api/v1/auth/me"
    check_status "admin dashboard" 200 \
      -b "$COOKIE_JAR" "$BASE_URL/api/v1/admin/dashboard"
    CSRF_TOKEN="$(csrf_token)"
    check_status "logout" 200 \
      -b "$COOKIE_JAR" -X POST -H "X-CSRF-Token: $CSRF_TOKEN" \
      "$BASE_URL/api/v1/auth/logout"
  fi
fi

if [[ "$failures" -gt 0 ]]; then
  echo "Smoke test failed with $failures problem(s)"
  exit 1
fi
echo "Smoke test passed"
