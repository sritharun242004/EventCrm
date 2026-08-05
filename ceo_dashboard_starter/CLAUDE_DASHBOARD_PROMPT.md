# CEO Operations Dashboard — Claude Build Brief

## 1. Objective

Build a polished, responsive operations dashboard for the CEO of an event and human-management agency. The dashboard must help the CEO and operations team plan daily work, block calendars, manage events, compare vendors, control budgets, monitor teams, evaluate RFQs, track reputation, and understand competitors.

The deliverable must run as a simple HTML application on a laptop without requiring a complex backend. It must work well on desktop, tablet, and mobile. Use the supplied empty CSV templates as the data contract. When populated CSV files are supplied later, the dashboard should load and analyze them without changing the interface code.

## 2. Files supplied with this brief

- `eventbot_empty_dashboard_template.xlsx`: one empty workbook with a Contents sheet and 19 header-only data sheets.
- `empty_csv_templates/`: the same 19 tables as individual header-only CSV files.
- `CLAUDE_DASHBOARD_PROMPT.md`: this specification and reusable prompt.

The files intentionally contain no private business data. The CEO can populate them manually or export matching data from another system.

## 3. Required output

Create a self-contained dashboard project with:

```text
dashboard/
  index.html
  styles.css
  app.js
  data/                    # populated CSV files go here
  README.md
```

Prefer plain HTML, modern CSS, and vanilla JavaScript. Small browser-safe libraries may be used only when they materially help:

- Papa Parse for CSV parsing.
- Chart.js or Apache ECharts for charts.
- SheetJS only if direct `.xlsx` import is implemented.

The dashboard must still display a useful empty state when no CSV rows are present. Do not invent live business numbers in empty mode.

## 4. User roles and primary workflow

### CEO view

- Revenue, booked value, projected margin, budget exposure, live events, upcoming events, reputation, pipeline and risk.
- Competitive intelligence and market opportunities.
- High-level team capacity and vendor reliability.

### Operations view

- Today/this week calendar blocks.
- Event production status and deadlines.
- Vendor schedules, RFQ responses and quote comparisons.
- Budget lines, variance and overspend alerts.
- Team assignment and utilization.

Provide a visible CEO/Operations toggle. Switching views must not reload the page.

## 5. Information architecture

The left navigation should contain:

1. Overview
2. Events
3. Calendar
4. Vendors
5. Budgets
6. RFQs
7. Teams
8. Reputation
9. Market Intelligence
10. Weddings

Desktop uses a persistent sidebar. Mobile uses a compact top bar and an accessible slide-out navigation drawer. Preserve the current section when the drawer closes.

## 6. Dashboard modules and infographics

### Overview

- KPI cards: booked revenue, projected revenue, projected margin, total active events, live events, budget at risk, average reputation and team utilization.
- Actual versus projected revenue grouped bar chart.
- Event-type mix donut chart.
- Event pipeline funnel or stage distribution.
- Upcoming event table with date, venue, attendees, budget and status.
- Alerts panel for overspend, pending RFQs, low vendor reliability and overloaded team members.
- Market-signal cards for competitor, partner and opportunity activity.

### Events

- Filterable kanban board: Lead, Proposed, Confirmed, In Production, Live, Wrap-up and Completed.
- Search by event, client, venue, type and status.
- Event detail drawer/page containing dates, timings, venue, attendance, budget, assigned team, vendors, RFQs, tickets, sponsors and reputation.
- Wedding filter and a wedding-specific summary view.

### Calendar

- Month, week and agenda views.
- Daily time blocks using `starts_at_ist` and `ends_at_ist`.
- Event chips colored by operational status.
- Filters for team, venue, vendor and event type.
- Clicking an event opens its full event details.
- On mobile, default to agenda view with large touch targets.

### Vendors and pricing

- Vendor directory with category, city, contacts, rating, reliability and preferred status.
- Vendor-category distribution chart.
- Reliability versus rating scatter plot.
- Rate-card table with base price, peak price, minimum order and lead time.
- Vendor schedule timeline showing which vendor is attached to which event and when.
- Quote history and RFQ response status.

### Budgets

- Total planned, actual, variance, utilization and projected margin.
- Planned versus actual bars by category and event.
- Budget-utilization progress bars.
- Variance waterfall or ranked variance table.
- Overspend alerts at 90% and critical alerts at 100%.
- Event selector and date/type filters.

### RFQs

- RFQ stage/status cards.
- Response-rate KPI.
- Side-by-side quote comparison table.
- Lowest and highest quote highlighting.
- Ceiling headroom chart.
- Vendor reliability, lead time, validity and preferred status shown beside price.
- Pending recipient reminders and deadline timeline.

### Teams

- Average utilization and capacity KPIs.
- Utilization bars by team and person.
- Skills matrix.
- Event assignment table.
- Overload alert when utilization is above 90%.
- Unassigned-event and unassigned-team-member alerts.

### Reputation

- Composite rating, average NPS and review volume.
- Rating trend over time.
- Reviews grouped by source.
- Event reputation ranking.
- Recent review cards with author, source, date and quote.

### Market intelligence and competitive analysis

- Competitor, partner and opportunity filters.
- Market calendar/timeline.
- Competitor event size versus estimated ticket price scatter plot.
- City and event-type distribution.
- Upcoming competitive events and scheduling conflicts.
- Opportunity cards with notes and suggested follow-up status.

### Weddings

- Wedding calendar and upcoming milestones.
- Venue, attendance, revenue, planned budget and spend.
- Budget/category breakdown suitable for decor, catering, lighting, security and production.
- Assigned team and vendor readiness.

## 7. Design system

The visual style should feel like an executive production console: calm, editorial, trustworthy and information-dense without looking crowded.

### Color tokens

```css
:root {
  --brand: #ba0013;
  --ink: #131b2e;
  --ink-secondary: #515f74;
  --surface: #ffffff;
  --canvas: #f6f7f9;
  --container: #f1f5f9;
  --border: #d9dee7;
  --success: #0f766e;
  --warning: #b45309;
  --info: #1e40af;
  --critical: #ba0013;
}
```

Use brand red sparingly for identity, primary actions and critical states. Never use brand red as the only signal; pair color with text or an icon. Support light and dark themes using CSS custom properties.

### Typography

- Display headings and large KPI values: **Fraunces**, fallback `Georgia, serif`.
- Interface text, labels and body copy: **IBM Plex Sans**, fallback `Inter, system-ui, sans-serif`.
- IDs, times, currency and tabular metrics: **IBM Plex Mono**, fallback `ui-monospace, SFMono-Regular, monospace`.
- Use tabular numerals for every financial value, percentage, date and time.

If external font access is unavailable, use the fallback stack and keep the dashboard fully functional.

### Layout and components

- 8px base spacing grid.
- Corners: 2px for fields/tables, 4–6px for cards; avoid exaggerated rounded cards.
- Prefer hairline borders and subtle background changes over heavy shadows.
- Desktop content width should fluidly fill the screen.
- Minimum interactive target: 44×44px on mobile.
- Tables must scroll horizontally on narrow screens and retain the first identifying column when practical.
- Charts must include labels/tooltips and a text summary for accessibility.
- Empty states must explain which CSV file and columns are required.

## 8. Responsive behavior

Use mobile-first CSS with meaningful breakpoints, approximately:

- Small mobile: below 480px.
- Mobile/tablet: below 768px.
- Compact laptop: 768–1199px.
- Large desktop: 1200px and above.

Required adaptations:

- Four-column KPI rows collapse to two columns and then one.
- Sidebar becomes a drawer below 768px.
- Calendar changes from month grid to agenda-first on mobile.
- Dense comparison tables become horizontally scrollable cards/tables.
- Charts preserve readable labels and never overflow the viewport.
- Dialogs become near-full-screen bottom sheets on mobile.
- Navigation, dialogs, filters and tables must be keyboard accessible.

## 9. CSV data rules

- Load each CSV by its supplied filename.
- Use `event_code`, `vendor_id`, `member_id`, `rfq_code`, `team_id` and `tier_id` as relationship keys.
- Treat blank cells as unknown, not zero.
- Columns ending in `_inr` are Indian rupees.
- Columns ending in `_pct` are already percentage values such as `88.50`, not fractions.
- Columns ending in `_ist` are India Standard Time display strings.
- Use Indian number formatting: `₹12,34,567`, lakhs and crores for compact KPIs.
- Validate headers and display a friendly error identifying missing columns.
- Escape all imported text before rendering it into HTML.
- Never execute HTML or JavaScript contained in CSV cells.

## 10. Interactions

- Global search across events, vendors, clients, RFQs and teams.
- Filter state reflected in the URL where practical.
- Click KPI cards to open the relevant filtered section.
- Click table rows and calendar blocks to open details.
- Export the currently filtered table to CSV.
- Theme toggle persisted in local storage.
- CEO/Operations view persisted in local storage.
- Provide clear loading, empty, success and error states.
- Do not create buttons that have no behavior. Disable unavailable actions and label them clearly.

## 11. Accessibility and quality

- Semantic HTML landmarks and headings.
- Visible focus states.
- Keyboard-operable menus, dialogs, filters and tables.
- Appropriate ARIA only where native semantics are insufficient.
- WCAG AA color contrast.
- Respect `prefers-reduced-motion`.
- No console errors or broken links.
- Test at 375×812, 768×1024, 1366×768 and 1440×900.

## 12. Suggested build sequence and time plan

1. **Data loading and validation — 1–2 hours:** parse all CSVs, normalize values and build relationships.
2. **Responsive shell and design tokens — 1–2 hours:** navigation, themes, typography and layouts.
3. **Overview, events and calendar — 3–4 hours:** daily operational core.
4. **Vendors, budgets and RFQs — 3–4 hours:** procurement and financial analysis.
5. **Teams, reputation, market and weddings — 2–3 hours:** remaining analysis pages.
6. **Responsive/accessibility testing — 2 hours:** mobile, tablet, laptop and keyboard flows.

Expected first complete prototype: approximately 12–17 focused development hours.

## 13. Copy-ready master prompt for Claude

```text
You are a senior frontend engineer and data-visualization designer. Build a production-quality, responsive CEO operations dashboard using the attached CLAUDE_DASHBOARD_PROMPT.md and the supplied empty CSV templates.

Create a portable HTML/CSS/JavaScript project that runs locally on a laptop. Use the exact CSV filenames and headers as the data contract. The files may initially contain only headers, so implement polished empty states and never fabricate business results. When rows are later added, all KPIs, charts, tables, calendars, filters and comparisons must calculate automatically from the CSV data.

Implement Overview, Events, Calendar, Vendors, Budgets, RFQs, Teams, Reputation, Market Intelligence and Weddings. Include all specified infographics, CEO/Operations role switching, light/dark themes, global search, filters, event detail views and responsive behavior.

Follow the supplied design tokens and typography: Fraunces for display headings, IBM Plex Sans for interface text and IBM Plex Mono for IDs/times/financial values, with offline-safe fallbacks. Use semantic HTML, WCAG AA contrast, visible keyboard focus, reduced-motion support and safe CSV rendering.

Do not leave dead buttons. Every visible control must work, or be disabled with an explicit explanation. Test at 375×812, 768×1024, 1366×768 and 1440×900. Provide a README with exact local-run instructions and explain where the populated CSV files should be placed.

First inspect every supplied CSV header and summarize the relationships. Then present the implementation plan. After that, create the complete project files and verify every route, button, filter, dialog and responsive layout.
```

## 14. Acceptance checklist

- [ ] Loads all supplied CSV tables or shows actionable empty states.
- [ ] All 10 dashboard sections are available.
- [ ] Calendar blocks display dates and IST times correctly.
- [ ] Vendor schedules, rate cards and RFQ comparisons are linked.
- [ ] Budget calculations reconcile planned, actual and variance values.
- [ ] Team utilization and assignments reconcile across sheets.
- [ ] Reputation and market visualizations use only supplied rows.
- [ ] Wedding events have a dedicated filtered view.
- [ ] Mobile, tablet and laptop layouts are usable.
- [ ] Every visible control works or is explicitly disabled.
- [ ] No private data is embedded in source files.
- [ ] No console errors, unsafe CSV rendering or broken navigation.
