#!/bin/bash
# Usage: ./scripts/test-api-v1.sh [BASE_URL] [EMAIL] [PASSWORD]
# Example: ./scripts/test-api-v1.sh https://featureapi-v1-staging.up.railway.app me@email.com mypass

BASE="${1:-https://featureapi-v1-staging.up.railway.app}"
EMAIL="${2:-santitrenchs@gmail.com}"
PASS="${3:-12345678}"

GREEN='\033[0;32m'; RED='\033[0;31m'; GRAY='\033[0;90m'; RESET='\033[0m'; BOLD='\033[1m'
PASS_COUNT=0; FAIL_COUNT=0; SKIP_COUNT=0

pass() { echo -e "${GREEN}✓${RESET} $1"; ((PASS_COUNT++)); }
fail() { echo -e "${RED}✗${RESET} $1"; echo -e "  ${GRAY}→ $2${RESET}"; ((FAIL_COUNT++)); }
skip() { echo -e "${GRAY}– $1${RESET}"; ((SKIP_COUNT++)); }

check() {
  local label="$1"; local expected="$2"; local actual="$3"; local body="$4"
  if [ "$actual" = "$expected" ]; then pass "$label (HTTP $actual)"
  else fail "$label (expected $expected, got $actual)" "$body"; fi
}

req() {
  local method="$1"; local path="$2"; shift 2
  curl -s -w "\n%{http_code}" -X "$method" "$BASE$path" -H "$AUTH" "$@"
}
body() { echo "$1" | head -1; }
code() { echo "$1" | tail -1; }

echo -e "\n${BOLD}Peakadex API v1 — $BASE${RESET}\n"

# ── Auth ──────────────────────────────────────────────────────────────────────
echo -e "${BOLD}── Auth ──${RESET}"

LOGIN=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
check "POST /api/v1/auth/login" 200 "$(code "$LOGIN")" "$(body "$LOGIN")"
TOKEN=$(body "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then echo -e "${RED}  Cannot continue without token.${RESET}\n"; exit 1; fi
AUTH="Authorization: Bearer $TOKEN"

R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrongpass\"}")
check "POST /api/v1/auth/login (wrong pass → 401)" 401 "$(code "$R")" "$(body "$R")"

R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/v1/auth/validate-voucher" \
  -H "Content-Type: application/json" -d '{"code":"INVALID-CODE"}')
check "POST /api/v1/auth/validate-voucher (bad code → 400)" 400 "$(code "$R")" "$(body "$R")"

R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/v1/auth/forgot-password" \
  -H "Content-Type: application/json" -d '{"email":"unknown@example.com"}')
check "POST /api/v1/auth/forgot-password (unknown → 200)" 200 "$(code "$R")" "$(body "$R")"

R=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/v1/auth/reset-password" \
  -H "Content-Type: application/json" -d '{"token":"badtoken","password":"newpass123"}')
check "POST /api/v1/auth/reset-password (bad token → 400)" 400 "$(code "$R")" "$(body "$R")"

R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/me")
check "GET  /api/v1/me (no token → 401)" 401 "$(code "$R")" ""

# ── Me & Settings ─────────────────────────────────────────────────────────────
echo -e "\n${BOLD}── Me & Settings ──${RESET}"

R=$(req GET /api/v1/me)
check "GET  /api/v1/me" 200 "$(code "$R")" "$(body "$R")"

R=$(req GET /api/v1/settings)
check "GET  /api/v1/settings" 200 "$(code "$R")" "$(body "$R")"

R=$(req PATCH /api/v1/settings -H "Content-Type: application/json" -d '{}')
check "PATCH /api/v1/settings (empty body → 200)" 200 "$(code "$R")" "$(body "$R")"

R=$(req POST /api/v1/settings/password -H "Content-Type: application/json" \
  -d '{"currentPassword":"wrongpass","newPassword":"irrelevant1"}')
check "POST /api/v1/settings/password (wrong current → 400)" 400 "$(code "$R")" "$(body "$R")"

R=$(req POST /api/v1/settings/password -H "Content-Type: application/json" \
  -d '{"currentPassword":"short","newPassword":"x"}')
check "POST /api/v1/settings/password (too short → 400)" 400 "$(code "$R")" "$(body "$R")"

# ── Ascents ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}── Ascents ──${RESET}"

R=$(req GET /api/v1/ascents)
check "GET  /api/v1/ascents" 200 "$(code "$R")" "$(body "$R")"

ASCENT_ID=$(body "$R" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$ASCENT_ID" ]; then
  R=$(req GET "/api/v1/ascents/$ASCENT_ID")
  check "GET  /api/v1/ascents/[id]" 200 "$(code "$R")" "$(body "$R")"

  R=$(req PATCH "/api/v1/ascents/$ASCENT_ID" -H "Content-Type: application/json" -d '{}')
  check "PATCH /api/v1/ascents/[id] (empty → 200)" 200 "$(code "$R")" "$(body "$R")"

  R=$(req GET "/api/v1/ascents/00000000-0000-0000-0000-000000000000")
  check "GET  /api/v1/ascents/[bad-id] → 404" 404 "$(code "$R")" "$(body "$R")"
else
  skip "GET/PATCH /api/v1/ascents/[id] — no ascents in account"
fi

R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/ascents")
check "GET  /api/v1/ascents (no token → 401)" 401 "$(code "$R")" ""

R=$(req POST /api/v1/ascents -H "Content-Type: application/json" -d '{"date":"2026-01-01"}')
check "POST /api/v1/ascents (missing peakId → 400)" 400 "$(code "$R")" "$(body "$R")"

# ── Photos ────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}── Photos ──${RESET}"

R=$(req DELETE "/api/v1/photos/00000000-0000-0000-0000-000000000000")
check "DELETE /api/v1/photos/[bad-id] → 404" 404 "$(code "$R")" "$(body "$R")"

R=$(req GET "/api/v1/photos/00000000-0000-0000-0000-000000000000/persons")
check "GET  /api/v1/photos/[bad-id]/persons → 404" 404 "$(code "$R")" "$(body "$R")"

R=$(req POST "/api/v1/photos/00000000-0000-0000-0000-000000000000/persons" \
  -H "Content-Type: application/json" -d '{"userId":"00000000-0000-0000-0000-000000000000"}')
check "POST /api/v1/photos/[bad-id]/persons → 404" 404 "$(code "$R")" "$(body "$R")"

R=$(req POST "/api/v1/photos/00000000-0000-0000-0000-000000000000/persons" \
  -H "Content-Type: application/json" -d '{"userId":"not-a-uuid"}')
check "POST /api/v1/photos/[bad-id]/persons (bad userId → 400)" 400 "$(code "$R")" "$(body "$R")"

# ── Peaks ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}── Peaks ──${RESET}"

R=$(req GET "/api/v1/peaks?q=Everest")
check "GET  /api/v1/peaks?q=Everest" 200 "$(code "$R")" "$(body "$R")"

R=$(req GET "/api/v1/peaks?q=Mont")
check "GET  /api/v1/peaks?q=Mont" 200 "$(code "$R")" "$(body "$R")"

R=$(req GET "/api/v1/peaks?north=43&south=42&east=3&west=0")
check "GET  /api/v1/peaks (viewport bounds)" 200 "$(code "$R")" "$(body "$R")"

PEAK_ID=$(body "$(req GET '/api/v1/peaks?north=43&south=42&east=3&west=0')" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$PEAK_ID" ]; then
  R=$(req GET "/api/v1/peaks/$PEAK_ID")
  check "GET  /api/v1/peaks/[id]" 200 "$(code "$R")" "$(body "$R")"
else
  skip "GET  /api/v1/peaks/[id] — no peaks in viewport"
fi

R=$(req GET "/api/v1/peaks/00000000-0000-0000-0000-000000000000")
check "GET  /api/v1/peaks/[bad-id] → 404" 404 "$(code "$R")" "$(body "$R")"

# ── Home & Feed ───────────────────────────────────────────────────────────────
echo -e "\n${BOLD}── Home & Feed ──${RESET}"

R=$(req GET /api/v1/home)
check "GET  /api/v1/home" 200 "$(code "$R")" "$(body "$R")"

R=$(req GET /api/v1/feed)
check "GET  /api/v1/feed" 200 "$(code "$R")" "$(body "$R")"

R=$(req GET "/api/v1/feed?cursor=2026-01-01")
check "GET  /api/v1/feed?cursor=..." 200 "$(code "$R")" "$(body "$R")"

R=$(req POST /api/v1/feed/seen -H "Content-Type: application/json" -d '{"ascentIds":[]}')
check "POST /api/v1/feed/seen (empty → 200)" 200 "$(code "$R")" "$(body "$R")"

# ── Persons (tagging candidates) ─────────────────────────────────────────────
echo -e "\n${BOLD}── Persons ──${RESET}"

R=$(req GET /api/v1/persons)
check "GET  /api/v1/persons" 200 "$(code "$R")" "$(body "$R")"

# ── Friends ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}── Friends ──${RESET}"

R=$(req GET /api/v1/friends)
check "GET  /api/v1/friends" 200 "$(code "$R")" "$(body "$R")"

MY_ID=$(body "$(req GET /api/v1/me)" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$MY_ID" ]; then
  R=$(req POST /api/v1/friends -H "Content-Type: application/json" \
    -d "{\"addresseeId\":\"$MY_ID\"}")
  check "POST /api/v1/friends (self → 400)" 400 "$(code "$R")" "$(body "$R")"
fi

R=$(req PATCH "/api/v1/friends/00000000-0000-0000-0000-000000000000" \
  -H "Content-Type: application/json" -d '{"action":"ACCEPTED"}')
check "PATCH /api/v1/friends/[bad-id] → 400" 400 "$(code "$R")" "$(body "$R")"

# ── Users ─────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}── Users ──${RESET}"

R=$(req GET "/api/v1/users/search?q=san")
check "GET  /api/v1/users/search?q=san" 200 "$(code "$R")" "$(body "$R")"

R=$(req GET "/api/v1/users/search?q=")
check "GET  /api/v1/users/search?q= (empty)" 200 "$(code "$R")" "$(body "$R")"

# ── Invitations ───────────────────────────────────────────────────────────────
echo -e "\n${BOLD}── Invitations ──${RESET}"

R=$(req GET /api/v1/invitations)
check "GET  /api/v1/invitations" 200 "$(code "$R")" "$(body "$R")"

R=$(req POST /api/v1/invitations -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}")
check "POST /api/v1/invitations (self → 400)" 400 "$(code "$R")" "$(body "$R")"

R=$(req POST /api/v1/invitations -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}')
check "POST /api/v1/invitations (invalid email → 400)" 400 "$(code "$R")" "$(body "$R")"

# ── Config ────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}── Config ──${RESET}"

R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/config")
check "GET  /api/v1/config (no auth needed → 200)" 200 "$(code "$R")" "$(body "$R")"

RARITIES_COUNT=$(body "$R" | grep -o '"id":"[^"]*"' | wc -l | tr -d ' ')
LEVELS_COUNT=$(body "$R" | grep -o '"idx":[0-9]' | wc -l | tr -d ' ')
if [ "$RARITIES_COUNT" -gt 0 ] && [ "$LEVELS_COUNT" -gt 0 ]; then
  pass "GET  /api/v1/config returns $RARITIES_COUNT rarities and $LEVELS_COUNT levels"
else
  fail "GET  /api/v1/config missing data" "rarities=$RARITIES_COUNT levels=$LEVELS_COUNT"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
TOTAL=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
echo -e "\n${BOLD}Results: ${GREEN}$PASS_COUNT passed${RESET} · ${RED}$FAIL_COUNT failed${RESET} · ${GRAY}$SKIP_COUNT skipped${RESET} · $TOTAL total\n"

[ "$FAIL_COUNT" -eq 0 ]
