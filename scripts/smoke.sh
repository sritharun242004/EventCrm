#!/usr/bin/env bash
# Eventbot CRM — full smoke test suite
# Aligned with tests/test-plan.md. Exit code 0 iff every case passes.
# Usage: bash scripts/smoke.sh [BASE_URL]
#
# Sections: PRE (preconditions) · HTTP · DATA · FMT · INT · ACTION · LOG

set -uo pipefail

BASE_URL="${1:-http://localhost:3003}"
DB_URL="${DATABASE_URL:-}"
if [[ -z "$DB_URL" && -f "$(dirname "$0")/../.env.local" ]]; then
  DB_URL=$(grep '^DATABASE_URL' "$(dirname "$0")/../.env.local" | cut -d'=' -f2- | tr -d '"')
fi
if [[ -z "$DB_URL" ]]; then
  echo "ERROR: DATABASE_URL not set. Export it or add to .env.local." >&2
  exit 1
fi
LOG_FILE="${DEV_LOG:-/tmp/eventbot-dev.log}"
LOG_BASELINE="/tmp/eventbot-dev.log.baseline"

# ---- colors ----------------------------------------------------------
if [[ -t 1 ]]; then
  R=$'\033[31m' G=$'\033[32m' Y=$'\033[33m' C=$'\033[36m' B=$'\033[1m' N=$'\033[0m'
else
  R= G= Y= C= B= N=
fi

pass=0; fail=0
declare -a failures

sect() { printf "\n%s%s%s%s%s\n" "$B" "$C" "── $1 ──" "$N" ""; }

_ok()   { printf "  %s✓%s %-6s %s\n"      "$G" "$N" "$1" "$2"; pass=$((pass+1)); }
_bad()  { printf "  %s✗%s %-6s %s\n"      "$R" "$N" "$1" "$2"; fail=$((fail+1)); failures+=("$1 — $2"); }
_okv()  { printf "  %s✓%s %-6s %s %s(%s)%s\n" "$G" "$N" "$1" "$2" "$Y" "$3" "$N"; pass=$((pass+1)); }
_badv() { printf "  %s✗%s %-6s %s %s(got %s, expected %s)%s\n" "$R" "$N" "$1" "$2" "$Y" "$3" "$4" "$N"; fail=$((fail+1)); failures+=("$1 — $2  (got $3, expected $4)"); }

check_eq()      { [[ "$3" == "$4" ]] && _okv "$1" "$2" "$3" || _badv "$1" "$2" "$3" "$4"; }
check_ge()      { [[ "$3" -ge "$4" ]] && _okv "$1" "$2" "≥$4 (got $3)" || _badv "$1" "$2" "$3" "≥$4"; }
check_cmd()     { if eval "$3" >/dev/null 2>&1; then _ok "$1" "$2"; else _bad "$1" "$2"; fi; }
# body-in-var checks: pass by process substitution to avoid quoting hell
check_body_has() {
  # <id> <desc> <body-var-name> <fixed-string>
  local id="$1" desc="$2" body_var="$3" needle="$4"
  local body="${!body_var}"
  if printf '%s' "$body" | grep -qF "$needle"; then _ok "$id" "$desc"; else _bad "$id" "$desc"; fi
}
check_body_has_re() {
  local id="$1" desc="$2" body_var="$3" pattern="$4"
  local body="${!body_var}"
  if printf '%s' "$body" | grep -qE "$pattern"; then _ok "$id" "$desc"; else _bad "$id" "$desc"; fi
}
check_body_missing() {
  local id="$1" desc="$2" body_var="$3" needle="$4"
  local body="${!body_var}"
  if printf '%s' "$body" | grep -qF "$needle"; then _bad "$id" "$desc"; else _ok "$id" "$desc"; fi
}

curl_body() { curl -sSL "$1"; }
sql_int()   { psql "$DB_URL" -tA -c "$1" 2>/dev/null | head -1; }

# =====================================================================
sect "PRE — preconditions"
check_cmd P-01 "pnpm installed"                        "which pnpm"
check_cmd P-02 "Neon reachable"                        "psql '$DB_URL' -tAc 'SELECT 1' | grep -q '^1$'"
seed_events=$(sql_int "SELECT COUNT(*) FROM events")
check_ge  P-03 "≥15 events seeded"                     "$seed_events" 15
check_cmd P-04 "dev server up on $BASE_URL"            "curl -sSf $BASE_URL/overview -o /dev/null"

if [[ -f "$LOG_FILE" ]]; then wc -l "$LOG_FILE" | awk '{print $1}' > "$LOG_BASELINE"; else echo 0 > "$LOG_BASELINE"; fi

# =====================================================================
sect "HTTP — routing"
ROUTE_IDS=(
  H-01 H-02 H-03 H-04 H-05 H-06 H-07 H-08 H-09 H-10
  H-11 H-12 H-13 H-14 H-15 H-16 H-17 H-18 H-19 H-20 H-21
)
ROUTE_EXPECTED=(
  307 200 200 200 200 200 404 200 200 200
  200 200 200 200 200 200 404 200 200 200 200
)
ROUTE_PATHS=(
  "/"
  "/overview"
  "/events"
  "/events?type=concert"
  "/events?type=tedx"
  "/events/EVT-2026-0109"
  "/events/EVT-INVALID-XYZ"
  "/calendar"
  "/calendar?y=2026&m=1"
  "/vendors"
  "/vendors?cat=sound_av"
  "/vendors?cat=catering"
  "/budgets"
  "/budgets?event=EVT-2026-0110"
  "/rfqs"
  "/rfqs/RFQ-2026-0031"
  "/rfqs/RFQ-INVALID-XYZ"
  "/teams"
  "/reputation"
  "/market"
  "/market?signal=competitor"
)
i=0
while [ $i -lt ${#ROUTE_IDS[@]} ]; do
  id="${ROUTE_IDS[$i]}"; expected="${ROUTE_EXPECTED[$i]}"; route="${ROUTE_PATHS[$i]}"
  actual=$(curl -sSL -o /dev/null -w "%{http_code}" --max-redirs 0 "$BASE_URL$route" 2>/dev/null)
  check_eq "$id" "$route" "$actual" "$expected"
  i=$((i+1))
done

# =====================================================================
sect "DATA — DB↔UI parity"

db_events=$(sql_int "SELECT COUNT(*) FROM events")
db_vendors=$(sql_int "SELECT COUNT(*) FROM vendors")
db_teams=$(sql_int "SELECT COUNT(*) FROM teams")
db_rfqs=$(sql_int "SELECT COUNT(*) FROM rfqs")

overview_body=$(curl_body "$BASE_URL/overview")

# Extract sidebar count badges (works regardless of surrounding whitespace)
_sidebar_count() {
  # $1 = label (Events / Vendors / Teams / RFQs)
  printf '%s' "$overview_body" \
    | grep -oE "${1}</span><span class=\"count\">[0-9]+" \
    | head -1 \
    | grep -oE '[0-9]+$'
}
sidebar_events=$(_sidebar_count Events)
sidebar_vendors=$(_sidebar_count Vendors)
sidebar_teams=$(_sidebar_count Teams)
sidebar_rfqs=$(_sidebar_count RFQs)

check_eq D-01 "sidebar Events badge = DB"    "${sidebar_events:-0}"   "$db_events"
check_eq D-02 "sidebar Vendors badge = DB"   "${sidebar_vendors:-0}"  "$db_vendors"
check_eq D-03 "sidebar Teams badge = DB"     "${sidebar_teams:-0}"    "$db_teams"
check_eq D-04 "sidebar RFQs badge = DB"      "${sidebar_rfqs:-0}"     "$db_rfqs"

# D-05: KPI "N events" note. Use sed to extract the count between "· " and " events",
# avoiding accidental match of "25" inside "FY25".
kpi_events_note=$(printf '%s' "$overview_body" \
  | grep -oE 'vs FY25 · [0-9]+ events' | head -1 \
  | sed -E 's/.*· ([0-9]+) events.*/\1/')
check_eq D-05 "overview KPI 'N events' note = DB" "${kpi_events_note:-0}" "$db_events"

# D-06: Vendors rail "All" count
vendors_body=$(curl_body "$BASE_URL/vendors")
rail_all=$(printf '%s' "$vendors_body" \
  | grep -oE 'All</span><span class="n">[0-9]+' \
  | head -1 | grep -oE '[0-9]+$')
check_eq D-06 "vendors rail 'All' = DB total" "${rail_all:-0}" "$db_vendors"

# D-07: Vendor table row count when filtered to sound_av.
# Count rows by looking for tbody <tr> occurrences within the vendors table.
db_sound_av=$(sql_int "SELECT COUNT(*) FROM vendors WHERE category='sound_av'")
sound_body=$(curl_body "$BASE_URL/vendors?cat=sound_av")
# Each vendor row starts with <tr>...<td><div class="stack"><b>NAME
ui_sound_rows=$(printf '%s' "$sound_body" \
  | grep -oE '<div class="stack"><b>[^<]+' | wc -l | tr -d ' ')
check_eq D-07 "vendor sound_av rows"          "$ui_sound_rows" "$db_sound_av"

# D-08: Kanban Completed cards. My Pill renders "pill completed dot" (kind first).
events_body=$(curl_body "$BASE_URL/events")
db_completed=$(sql_int "SELECT COUNT(*) FROM events WHERE status='completed'")
ui_completed_pills=$(printf '%s' "$events_body" \
  | grep -oE 'pill completed dot">Completed' | wc -l | tr -d ' ')
check_eq D-08 "kanban completed cards"        "$ui_completed_pills" "$db_completed"

# D-09: RFQ compare grid columns
db_rfq1_quotes=$(sql_int "SELECT COUNT(*) FROM rfq_quotes WHERE rfq_id=1")
rfq1_body=$(curl_body "$BASE_URL/rfqs/RFQ-2026-0031")
ui_qh_cols=$(printf '%s' "$rfq1_body" \
  | grep -oE 'class="qh"' | wc -l | tr -d ' ')
ui_vendor_cols=$((ui_qh_cols - 1))  # first .qh is the "Metric" label
check_eq D-09 "RFQ 1 vendor columns"          "$ui_vendor_cols" "$db_rfq1_quotes"

# D-10: Budget breakdown line count == DB. Use -o + wc -l (not grep -c which counts LINES).
db_bud9=$(sql_int "SELECT COUNT(*) FROM budget_lines WHERE event_id=9")
ev9_body=$(curl_body "$BASE_URL/events/EVT-2026-0109")
ui_bud9=$(printf '%s' "$ev9_body" \
  | grep -oE 'class="bud-row"' | wc -l | tr -d ' ')
ui_bud9_lines=$((ui_bud9 - 1))   # subtract the "Total" summary bud-row
check_eq D-10 "EVT-2026-0109 budget lines"    "$ui_bud9_lines"      "$db_bud9"

# =====================================================================
sect "FMT — currency + numbers"
check_body_has     F-01 "overview has ₹ symbol"                overview_body "₹"
check_body_has_re  F-02 "overview uses Cr or L short form"     overview_body "₹[0-9.]+ (Cr|L)"
check_body_has     F-03 "% glyph present"                      overview_body "%"
reputation_body=$(curl_body "$BASE_URL/reputation")
check_body_has     F-05 "reputation stars present"             reputation_body "stars"

# =====================================================================
sect "INT — interactivity + attributes"

# I-01: KPI tiles are anchors with class "kpi clickable" AND an href attribute.
kpi_anchors=$(printf '%s' "$overview_body" \
  | grep -oE '<a class="kpi clickable"[^>]*href="[^#"][^"]*"' \
  | wc -l | tr -d ' ')
check_ge  I-01 "≥4 KPI tiles are clickable anchors"   "$kpi_anchors" 4

# I-03: kanban cards link to /events/EVT-...
kanban_links=$(printf '%s' "$events_body" \
  | grep -oE 'class="k-card[^"]*"[^>]*href="/events/EVT-' | wc -l | tr -d ' ')
check_ge  I-03 "kanban cards link to /events/..."     "$kanban_links" 10

# I-04: filter chips route with type=
events_type_chips=$(printf '%s' "$events_body" \
  | grep -oE 'class="chip[^"]*" href="/events\?type=' | wc -l | tr -d ' ')
check_ge  I-04 "events filter chips have type="       "$events_type_chips" 3

# I-05: market chips route with signal=
market_body=$(curl_body "$BASE_URL/market")
mk_chips=$(printf '%s' "$market_body" \
  | grep -oE 'class="chip[^"]*" href="/market\?signal=' | wc -l | tr -d ' ')
check_ge  I-05 "market signal chips"                  "$mk_chips" 3

# I-06: calendar cells clickable
cal_body=$(curl_body "$BASE_URL/calendar")
cal_clickable=$(printf '%s' "$cal_body" \
  | grep -oE 'class="cal-cell clickable' | wc -l | tr -d ' ')
check_ge  I-06 "calendar cells clickable"             "$cal_clickable" 20

# I-07: calendar dialog markup
check_body_has     I-07  "calendar dialog markup present"      cal_body "createEventTitle"
check_body_has     I-07b "calendar dialog End time field"      cal_body "End time"
check_body_has     I-07c "calendar dialog Expected attendees"  cal_body "Expected attendees"

# I-08: RFQ compare grid class present
check_body_has     I-08 "RFQ detail has .quote-grid"           rfq1_body "quote-grid"

# I-09: LinkRow uses <tr class="clickable" tabindex="0">
lrows=$(printf '%s' "$overview_body" \
  | grep -oE '<tr class="clickable" tabindex="0"' | wc -l | tr -d ' ')
check_ge  I-09 "LinkRow rows in overview"             "$lrows" 3

# =====================================================================
sect "ACTION — server-action round trip"
test_code="TEST-CI-$(date +%s)"
psql "$DB_URL" -c "INSERT INTO events (code, name, type, status, starts_on, ends_on, starts_at, ends_at, expected_attendees, highlight) VALUES ('$test_code', 'Automated test event', 'corporate', 'proposed', CURRENT_DATE + 3, CURRENT_DATE + 3, (CURRENT_DATE + 3)::timestamp + interval '14 hours', (CURRENT_DATE + 3)::timestamp + interval '16 hours', 50, 'auto-test');" >/dev/null 2>&1

cal_after=$(curl_body "$BASE_URL/calendar")
check_body_has A-01 "test event appears on calendar"   cal_after "Automated test event"
events_after=$(curl_body "$BASE_URL/events")
check_body_has A-02 "test event appears in events kanban" events_after "$test_code"

new_kpi_events=$(curl_body "$BASE_URL/overview" \
  | grep -oE 'vs FY25 · [0-9]+ events' | head -1 \
  | sed -E 's/.*· ([0-9]+) events.*/\1/')
expected_kpi=$((db_events + 1))
check_eq  A-03 "overview KPI updates to +1 event"     "${new_kpi_events:-0}" "$expected_kpi"

psql "$DB_URL" -c "DELETE FROM events WHERE code='$test_code';" >/dev/null 2>&1
cal_final=$(curl_body "$BASE_URL/calendar")
check_body_missing A-04 "test event removed from calendar" cal_final "Automated test event"

# =====================================================================
sect "LOG — dev-server log clean"
baseline_len=$(cat "$LOG_BASELINE")
current_len=$(wc -l < "$LOG_FILE")
new_lines=$((current_len - baseline_len))
if [[ "$new_lines" -lt 0 ]]; then new_lines="$current_len"; fi
new_log=$(tail -n "$new_lines" "$LOG_FILE" 2>/dev/null || true)

log_errors=$(printf '%s' "$new_log" \
  | grep -iE "^\s*⨯|error|warn" \
  | grep -viE "SECURITY WARNING|SSL modes|libpq|In the next major version" \
  | grep -viE "GET .*(404|307)" \
  | head -50)

if [[ -z "$log_errors" ]]; then
  _ok L-01 "no unexpected errors/warnings in dev log during this run"
else
  _bad L-01 "dev log has unexpected lines:"
  echo "$log_errors" | head -20 | sed 's/^/       │ /'
fi

# =====================================================================
sect "SUMMARY"
total=$((pass + fail))
if [[ "$fail" -eq 0 ]]; then
  printf "  %s%s✓ %d / %d passed — all green.%s\n" "$B" "$G" "$pass" "$total" "$N"
  exit 0
else
  printf "  %s%s✗ %d / %d passed, %d failed.%s\n" "$B" "$R" "$pass" "$total" "$fail" "$N"
  printf "\n  Failures:\n"
  for f in "${failures[@]}"; do
    printf "    · %s\n" "$f"
  done
  exit 1
fi
