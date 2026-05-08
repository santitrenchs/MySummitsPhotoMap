#!/bin/bash
# Usage: ./scripts/test-api-v1.sh [BASE_URL] [EMAIL] [PASSWORD]
# Example: ./scripts/test-api-v1.sh https://featureapi-v1-staging.up.railway.app me@email.com mypass

BASE="${1:-https://featureapi-v1-staging.up.railway.app}"
EMAIL="${2:-santitrenchs@gmail.com}"
PASS="${3:-12345678}"

GREEN='\033[0;32m'; RED='\033[0;31m'; RESET='\033[0m'; BOLD='\033[1m'

pass() { echo -e "${GREEN}✓${RESET} $1"; }
fail() { echo -e "${RED}✗${RESET} $1"; echo "  → $2"; }

check() {
  local label="$1"; local expected="$2"; local actual="$3"; local body="$4"
  if [ "$actual" = "$expected" ]; then
    pass "$label (HTTP $actual)"
  else
    fail "$label (expected $expected, got $actual)" "$body"
  fi
}

echo -e "\n${BOLD}Peakadex API v1 — $BASE${RESET}\n"

# ── 1. Login ──────────────────────────────────────────────────────────────────
echo "── Auth ──"
LOGIN=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
CODE=$(echo "$LOGIN" | tail -1)
BODY=$(echo "$LOGIN" | head -1)
check "POST /api/v1/auth/login" 200 "$CODE" "$BODY"
TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then echo -e "${RED}  Cannot continue without token.${RESET}\n"; exit 1; fi
AUTH="Authorization: Bearer $TOKEN"

# ── 2. Me ─────────────────────────────────────────────────────────────────────
R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/me" -H "$AUTH")
check "GET  /api/v1/me" 200 "$(echo "$R" | tail -1)" "$(echo "$R" | head -1)"

# ── 3. Ascents ────────────────────────────────────────────────────────────────
echo "\n── Ascents ──"
R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/ascents" -H "$AUTH")
check "GET  /api/v1/ascents" 200 "$(echo "$R" | tail -1)" "$(echo "$R" | head -1)"

# Grab first ascent id for detail test
ASCENT_ID=$(echo "$R" | head -1 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$ASCENT_ID" ]; then
  R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/ascents/$ASCENT_ID" -H "$AUTH")
  check "GET  /api/v1/ascents/$ASCENT_ID" 200 "$(echo "$R" | tail -1)" "$(echo "$R" | head -1)"
else
  echo -e "  ${BOLD}(skip)${RESET} GET /api/v1/ascents/[id] — no ascents found"
fi

# Unauthorized check
R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/ascents")
check "GET  /api/v1/ascents (no token → 401)" 401 "$(echo "$R" | tail -1)" ""

# ── 4. Peaks ──────────────────────────────────────────────────────────────────
echo "\n── Peaks ──"
R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/peaks?q=Everest" -H "$AUTH")
check "GET  /api/v1/peaks?q=Everest" 200 "$(echo "$R" | tail -1)" "$(echo "$R" | head -1)"

# ── 5. Home ───────────────────────────────────────────────────────────────────
echo "\n── Home ──"
R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/home" -H "$AUTH")
check "GET  /api/v1/home" 200 "$(echo "$R" | tail -1)" "$(echo "$R" | head -1)"

# ── 6. Feed ───────────────────────────────────────────────────────────────────
echo "\n── Feed ──"
R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/feed" -H "$AUTH")
check "GET  /api/v1/feed" 200 "$(echo "$R" | tail -1)" "$(echo "$R" | head -1)"

# ── 7. Friends ────────────────────────────────────────────────────────────────
echo "\n── Friends ──"
R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/friends" -H "$AUTH")
check "GET  /api/v1/friends" 200 "$(echo "$R" | tail -1)" "$(echo "$R" | head -1)"

# ── 8. Settings ───────────────────────────────────────────────────────────────
echo "\n── Settings ──"
R=$(curl -s -w "\n%{http_code}" "$BASE/api/v1/settings" -H "$AUTH")
check "GET  /api/v1/settings" 200 "$(echo "$R" | tail -1)" "$(echo "$R" | head -1)"

echo ""
