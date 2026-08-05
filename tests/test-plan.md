# Eventbot CRM — Test Plan

Version 1.0 · Owner: Engineering · Environment: local dev (`localhost:3003`) against Neon Postgres.

This plan covers the Eventbot event-management CRM end-to-end. Every case has an ID, a preconditions row, precise steps, an expected result, and an automation status. Cases marked **AUTO** are covered by `scripts/smoke.sh`. Cases marked **MANUAL** must be walked through in the browser.

---

## 1. Environment preconditions

| # | Check | Expected |
|---|-------|----------|
| P-01 | `pnpm --version` | 11.x on Node ≥ 24 |
| P-02 | Neon DB reachable | `psql $DATABASE_URL -c 'SELECT 1'` returns 1 |
| P-03 | Seed present | `SELECT COUNT(*) FROM events` ≥ 15 |
| P-04 | Dev server running | `curl -sSf http://localhost:3003/overview` returns HTTP 200 |
| P-05 | Prisma client fresh | `pnpm db:generate` completed after last schema change |

Ownership: run these before every full suite.

---

## 2. HTTP + routing (AUTO — scripts/smoke.sh, section §HTTP)

| ID | Route | Expected | Notes |
|----|-------|----------|-------|
| H-01 | `GET /` | HTTP 307 → `/overview` | Landing redirect |
| H-02 | `GET /overview` | HTTP 200 · body > 20 KB | CEO dashboard default |
| H-03 | `GET /events` | HTTP 200 | Kanban |
| H-04 | `GET /events?type=concert` | HTTP 200 | Filter works |
| H-05 | `GET /events?type=tedx` | HTTP 200 | Alt filter |
| H-06 | `GET /events/EVT-2026-0109` | HTTP 200 | Diljit Dosanjh event brief |
| H-07 | `GET /events/EVT-INVALID` | HTTP 404 | Prisma `notFound()` path |
| H-08 | `GET /calendar` | HTTP 200 · defaults to current month |
| H-09 | `GET /calendar?y=2026&m=1` | HTTP 200 · Feb 2026 |
| H-10 | `GET /vendors` | HTTP 200 · all 20 vendors |
| H-11 | `GET /vendors?cat=sound_av` | HTTP 200 · only sound_av rows |
| H-12 | `GET /vendors?cat=catering` | HTTP 200 · only catering rows |
| H-13 | `GET /budgets` | HTTP 200 |
| H-14 | `GET /budgets?event=EVT-2026-0110` | HTTP 200 · Global Meet breakdown |
| H-15 | `GET /rfqs` | HTTP 200 |
| H-16 | `GET /rfqs/RFQ-2026-0031` | HTTP 200 · Diljit sound RFQ |
| H-17 | `GET /rfqs/RFQ-INVALID` | HTTP 404 |
| H-18 | `GET /teams` | HTTP 200 |
| H-19 | `GET /reputation` | HTTP 200 |
| H-20 | `GET /market` | HTTP 200 |
| H-21 | `GET /market?signal=competitor` | HTTP 200 · fewer results |

---

## 3. Data integrity — DB↔UI parity (AUTO — §DATA)

Cross-check that what the user sees on screen matches Postgres row-for-row.

| ID | Assertion | Query | UI check |
|----|-----------|-------|----------|
| D-01 | Sidebar "Events" badge = event count | `SELECT COUNT(*) FROM events` | Grep `nav-count-events` value |
| D-02 | Sidebar "Vendors" badge = vendor count | `SELECT COUNT(*) FROM vendors` | Same |
| D-03 | Sidebar "Teams" badge = team count | `SELECT COUNT(*) FROM teams` | Same |
| D-04 | Sidebar "RFQs" badge = rfq count | `SELECT COUNT(*) FROM rfqs` | Same |
| D-05 | Overview KPI "events" note = DB count | `SELECT COUNT(*) FROM events` | Grep "15 events" |
| D-06 | Vendors listing all == vendor category counts | `SELECT category, COUNT(*) FROM vendors GROUP BY category` | Rail-list badges |
| D-07 | Sound_av filter row count == DB `WHERE category='sound_av'` | `SELECT COUNT(*) FROM vendors WHERE category='sound_av'` | Grep vendor rows |
| D-08 | Events pipeline shows all statuses distributed correctly | `SELECT status, COUNT(*) FROM events GROUP BY status` | Grep column counts |
| D-09 | RFQ compare grid has one column per invited vendor | `SELECT COUNT(*) FROM rfq_quotes WHERE rfq_id=1` | Grep quote-grid columns |
| D-10 | Event brief has budget lines equal to DB | `SELECT COUNT(*) FROM budget_lines WHERE event_id=9` | Grep bud-row count |
| D-11 | Calendar event chips match `starts_at` days in month | `SELECT COUNT(*) FROM events WHERE starts_at BETWEEN ...` | Grep cal-evt count |

---

## 4. Currency + number formatting (AUTO — §FMT)

| ID | Assertion | Where |
|----|-----------|-------|
| F-01 | Overview shows `₹` symbol | `/overview` |
| F-02 | Overview uses Cr or L short form for large values | `/overview` |
| F-03 | Percentages use `%` glyph, not `pct` | Any page |
| F-04 | Every KPI is right-aligned + tabular-nums | Visual (manual) |
| F-05 | Star ratings show 4 or 5 characters | `/reputation` |

---

## 5. Interactivity + attributes (AUTO — §INT)

| ID | Assertion |
|----|-----------|
| I-01 | Every KPI tile on overview is an `<a class="kpi clickable">` |
| I-02 | Overview KPI hrefs are non-`#` |
| I-03 | Every kanban card is a `<a>` linking to `/events/...` |
| I-04 | Filter chips on events are `<a>` with `type=` query param |
| I-05 | Filter chips on market are `<a>` with `signal=` query param |
| I-06 | Calendar cells have `clickable` class on non-oob days |
| I-07 | Calendar dialog markup exists in page HTML (title + End time + Expected attendees) |
| I-08 | RFQ compare grid uses `.quote-grid` |
| I-09 | Every table row that links wraps children in `<tr class="clickable" tabindex="0">` |

---

## 6. Server actions (AUTO — §ACTION)

| ID | Steps | Expected |
|----|-------|----------|
| A-01 | Insert event via SQL round-trip (`code='TEST-CI-01'`), reload `/calendar`, grep for title | New event visible without any cache flush |
| A-02 | Reload `/events`, grep for `TEST-CI-01` | New event appears in kanban proposed column |
| A-03 | Reload `/overview`, count events increased | Overview KPI 'events' count matches DB |
| A-04 | Cleanup: DELETE the row | Row gone, next `/calendar` load doesn't show it |
| A-05 | createEvent action rejects blank name | Server action returns `{ok:false, error:'Event name is required'}` (manual browser test) |
| A-06 | createEvent action rejects endTime ≤ startTime | Server action returns `{ok:false, error:'End time must be after start time'}` |

---

## 7. Regression — bugs previously fixed

| ID | Bug | Guard |
|----|-----|-------|
| R-01 | React key warning `bar-undefined` in DualBar | Grep dev log — no warning after full suite |
| R-02 | Donut SVG hydration mismatch (float precision) | Grep dev log — no `Text content did not match` |
| R-03 | `type "public.VendorCategory" does not exist` when filtering | `/vendors?cat=sound_av` returns HTTP 200 |
| R-04 | Redirect after createEvent throws PrismaClientKnownRequestError | Server action wraps in try/catch and returns typed error |

---

## 8. Log discipline (AUTO — §LOG)

After running §HTTP + §DATA + §ACTION in sequence, `tail -400 /tmp/eventbot-dev.log` should not contain:
- `Error:` lines that are not intentional 404s
- `Missing key` React warnings
- `hydration` warnings
- Any `[ERR_` markers

Known benign lines (ignore):
- `SECURITY WARNING: The SSL modes 'prefer', 'require'…` (pg driver deprecation notice)

---

## 9. Manual UI audit (MANUAL — walk through in browser)

For each item, tick if visually correct.

### Overview
- [ ] All 4 KPI tiles animate in (fade-up) on first load
- [ ] Hover a KPI tile → lifts 2 px, border darkens
- [ ] Click "Booked Revenue" tile → navigates to `/events`
- [ ] Sparkline in Booked Revenue tile → hovering a point shows a black tooltip with `Month: ₹value`
- [ ] Revenue chart: hovering any month → both bars for that month brighten, others dim, tooltip shows Actual + Projected + Variance
- [ ] Donut: hovering any segment → segment thickens, center label swaps to segment name + count + %
- [ ] LIVE FinPeak card has a soft red "breathing" outline animation
- [ ] Toggling CEO ↔ Manager in top bar swaps the KPI strip without a page reload

### Events (pipeline)
- [ ] Filter chip "All" is dark; clicking "Concerts" navigates to `/events?type=concert`, that chip becomes dark
- [ ] Kanban card hover lifts 2 px + shows outline strong border
- [ ] Card meter (budget) is red for spent > 90%
- [ ] Click any card → routes to `/events/[code]` full brief

### Calendar
- [ ] Prev / Next / Today buttons rotate months correctly
- [ ] Click "+ New event" → dialog opens
- [ ] Click any date cell (non-greyed) → dialog opens with that date pre-filled
- [ ] Dialog form has all fields: Title, Type, Expected attendees, Date, Start time, End time, Venue, Client, Notes
- [ ] Venue and Client selects are populated from Neon (6 venues, 8 clients)
- [ ] Fill the form + Submit → toast "Event EVT-YYYY-NNNN created", dialog closes, new event chip appears on the correct date
- [ ] Blank title → toast "Event name is required" (red)
- [ ] End time ≤ Start time → toast "End time must be after start time" (red)

### Vendors
- [ ] Category rail: clicking "Sound & AV" filters the table to only sound_av rows and highlights that rail item
- [ ] Reliability meter color: ≥ 95% green, 90-94% neutral, < 90% amber
- [ ] "Preferred" badge only on preferred vendors

### Budgets
- [ ] Selector at top switches between events with budgets
- [ ] Category bars fill left-to-right; red once > 90% used
- [ ] "1,000-person capacity template" totals to ~₹65-70k / head

### RFQs
- [ ] Cards colored on left edge by status (green awarded, amber comparing, blue collecting, grey sent/draft)
- [ ] Clicking any card → detail page with compare-grid
- [ ] RFQ detail: lowest bid is green, highest is red
- [ ] Recommendation card at the bottom mentions the winning vendor + spread

### Teams
- [ ] All 5 teams show with a member roster
- [ ] Utilization bar red for > 90% (Nikhil Bansal 92%, Vikram Sethi 90%)

### Reputation
- [ ] Star row above reviews (5 stars in warning color)
- [ ] Each review has a red left border on the quote

### Market
- [ ] Signal chips filter the cards
- [ ] Cards show "competitor" as red pill, "partner" as blue, "opportunity" as green

### Global
- [ ] Toggle theme (sun icon top-right) → all colors invert; the primary red stays vibrant
- [ ] Nav item hover shows a red tint background
- [ ] "1 Issue" indicator in bottom-left corner **should not** appear (Next dev overlay)

---

## 10. Running the automated suite

```bash
cd "/Users/tharunkumarl/Full Stack/codashboard"
bash scripts/smoke.sh
```

Exit code 0 = all green. Anything else prints the failure section and a red summary line.

---

## 11. Coverage targets

- Every route we ship must have at least one **H-** case.
- Every filter must have at least one **D-** case comparing UI count to DB count.
- Every server action must have at least one **A-** case (positive + negative).
- Every fixed bug must have a **R-** case guarding it.

Adding a route without a test is a review blocker.
