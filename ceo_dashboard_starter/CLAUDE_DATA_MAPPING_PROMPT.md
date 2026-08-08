# Customize the Minimal CXO Dashboard With My Data

## Attach

1. `MY_EXECUTIVE_DASHBOARD_STARTER.html`
2. My Excel (`.xlsx`/`.xls`) or CSV files

## Outcome

Customize the supplied single-page HTML with my organisation's data. Do **not** rebuild it, add pages, create separate files, or expand its scope. Return one offline file named `my_executive_dashboard.html`.

## Only show these executive insights

1. Year-to-date actual revenue
2. Full-year projected revenue
3. Total amount yet to collect / outstanding receivables
4. Quarterly actual versus projected revenue
5. Total events/projects: completed, in progress and upcoming
6. A short upcoming-project table: project, status, date, budget and collection percentage
7. Team count, people count and overall utilization when available
8. Four small market-review numbers: opportunities, competitor events, partner signals and estimated pipeline

Do not add vendor directories, detailed calendars, RFQ workspaces, reputation pages, long tables, operational forms, complex navigation, or extra analytics. This is a minimal CXO snapshot, not an operational application.

## Flexible data mapping

Inspect my sheets/files and map columns by meaning rather than exact spelling:

- project/event/job/engagement → project
- actual/revenue/sales/received → actual revenue
- projected/forecast/pipeline → projected revenue
- outstanding/receivable/balance/due → amount yet to collect
- budget/estimate/planned value → project budget
- completed/done/closed → completed
- confirmed/production/active → in progress
- proposed/upcoming/planned → upcoming
- owner/team/assignee/manager → team information
- competitor/opportunity/partner/market → market signals

Handle Indian and international currency formats, percentages, blank cells and different date formats. Join sheets only when reliable IDs or names exist.

## Data integrity

Never invent a value. Missing information must display as `Not available` or be omitted. Do not turn a blank field into zero. Calculate totals from the source records and retain the source-data date. Remove all demonstration values when real data is supplied.

Only modify the `DATA` object already embedded near the bottom of the HTML unless a label genuinely needs to match the organisation's terminology. Preserve the existing responsive design and chart code.

## Delivery priority for free-plan limits

Create and save `my_executive_dashboard.html` before optional testing. Avoid unnecessary tool calls, intermediate files and repeated analysis. Test only navigation-free rendering, values, charts and mobile layout after the file exists.

If a tool-use limit is reached, preserve the current files and follow this instruction when the user clicks **Continue**:

> Continue from the existing work. Do not restart, redesign, re-read or recreate files. Immediately package the current completed dashboard as one downloadable `my_executive_dashboard.html`. Skip optional testing if necessary and briefly list any checks that remain.

If another limit is imminent:

> Stop all optional work and deliver the current `my_executive_dashboard.html` immediately.
