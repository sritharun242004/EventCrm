# Create My Executive Dashboard From My Data

## Attach these files

1. `MY_EXECUTIVE_DASHBOARD_STARTER.html` — the complete responsive dashboard.
2. My Excel (`.xlsx`/`.xls`) or CSV data files.

## Task

Customize the attached HTML using my data. Do not rebuild the application from scratch and do not create separate CSS or JavaScript files.

First, briefly report the sheets/files detected, what each table appears to contain, the column mapping, supported dashboard sections, and insights that cannot be calculated. Then continue immediately; do not wait for confirmation unless a file is unreadable.

Map fields by meaning rather than exact names. Examples: client/customer/account/company; event/project/job; revenue/sales/contract value; budget/planned cost/estimate; actual/spent/expense; owner/manager/lead/assignee; supplier/partner/vendor. Handle different date formats, currencies, percentages, blank cells, differently named sheets, and joins based on stable IDs or reliable names.

Replace all demonstration records and KPIs with calculations from my data. Preserve the Eventbot design, responsive layout, CEO/Manager views, navigation, filters, tables, charts, and interactions. Show only supported modules and use my organisation's terminology. If useful data has no existing module, add one concise decision-ready section.

Never invent events, clients, revenue, costs, ratings, dates, or operational facts. Missing data must display as `Not available` or cause the metric to be hidden—never convert missing information to zero. Add a small **Data Coverage** panel listing available insights, unavailable insights, and fields needed to unlock them. Do not add external APIs, analytics, or trackers.

Return one complete, self-contained file named `my_executive_dashboard.html`. It must open directly and work offline in Chrome, Safari, and Edge; be responsive on laptop, tablet, and mobile; contain all HTML, CSS, JavaScript, and transformed data; use no CDNs or API keys; and contain no placeholder or unfinished code. Show the data import date.

## Delivery priority and free-plan limits

Create and save the complete `my_executive_dashboard.html` artifact **before** spending tool calls on optional polishing or extensive testing. The downloadable HTML is the primary deliverable. Test navigation, role switching, filters, charts, tables, mobile layout, and empty states after the file exists, using the remaining tool allowance.

Work economically: modify the supplied starter instead of recreating its structure, avoid unnecessary intermediate files, and do not repeatedly re-read or rewrite completed sections. Provide the finished HTML as a downloadable artifact, not as multiple code snippets.

If you approach or reach a per-turn tool-use limit:

1. Preserve all completed work and files from the current conversation.
2. Do not restart, redesign, re-read, or recreate the dashboard.
3. Package and deliver the current complete HTML before optional testing.
4. Clearly state only the checks that still remain.
5. When the user clicks **Continue** or sends `continue`, resume from the existing files and finish only verification and packaging.

Treat this as the user's automatic continuation instruction:

> Continue from the existing work. Do not restart, redesign, re-read, or recreate any files. Finish only the remaining verification and packaging. Immediately deliver the completed self-contained `my_executive_dashboard.html` as a downloadable file. If testing would consume the remaining tool allowance, prioritize delivering the HTML first and briefly list any checks that remain.

If another limit is imminent, follow this emergency instruction without waiting:

> Stop all optional testing and immediately package the current completed implementation as `my_executive_dashboard.html` for download.
