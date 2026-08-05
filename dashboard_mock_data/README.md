# Eventbot dashboard mock-data sheets

These CSV files are spreadsheet-ready exports of the mock/seeded Eventbot database. Import each CSV as a separate sheet in Excel or Google Sheets.

All monetary columns ending in `_inr` are rupees. The database stores money in paise, and the exporter converts it to rupees. All explicit timing columns ending in `_ist` use Asia/Kolkata time.

## Sheets

| File | Purpose | Main relationship key |
|---|---|---|
| `01_clients.csv` | Client contacts and lifetime value | `client_id` |
| `02_venues.csv` | Venue capacity, day rate, contact and notes | `venue_id` |
| `03_events_calendar.csv` | Master calendar with dates, times, revenue, budget and attendance | `event_code` |
| `04_vendor_master.csv` | Vendor directory, category, contacts, rating and reliability | `vendor_id` |
| `05_vendor_pricing.csv` | Vendor SKUs, units, normal/peak price and lead time | `vendor_id` |
| `06_vendor_event_schedule.csv` | Which vendor serves which event, when, where and at what price | `event_code`, `vendor_id` |
| `07_budget_lines.csv` | Detailed planned/actual event budgets by category | `event_code` |
| `08_budget_summary.csv` | Event-level budget, variance, revenue and margin summary | `event_code` |
| `09_teams_members.csv` | Teams, members, skills, utilization and ratings | `team_id`, `member_id` |
| `10_event_team_assignments.csv` | Team roster assigned to each event | `event_code`, `member_id` |
| `11_rfqs.csv` | RFQ master, deadline, ceiling and awarded vendor | `rfq_code` |
| `12_rfq_items.csv` | Items/specifications requested in each RFQ | `rfq_code` |
| `13_rfq_vendor_quotes.csv` | Side-by-side vendor quote and ceiling comparison data | `rfq_code`, `vendor_id` |
| `14_rfq_recipients.csv` | Invited vendors and response status | `rfq_code`, `vendor_id` |
| `15_reputation_reviews.csv` | Scores, NPS, quotes, authors and sources | `event_code` |
| `16_market_intelligence.csv` | Competitor, partner and opportunity signals | `market_id` |
| `17_ticket_pricing.csv` | Ticket tiers, inventory, sales and booked revenue | `event_code`, `tier_id` |
| `18_sponsors.csv` | Event sponsors, tiers, value and status | `event_code` |
| `19_wedding_events.csv` | Wedding-specific event, calendar, budget and attendance view | `event_code` |

## Refreshing the files

From the project root, load `DATABASE_URL` and run:

```bash
mkdir -p dashboard_mock_data
psql "$DATABASE_URL" -f scripts/export_dashboard_csv.sql
```

The export is read-only: it does not modify database records.
