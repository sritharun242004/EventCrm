# Eventbot — Event Management CRM

Mini-CRM for a full-service event management company: concerts, conferences, TEDx, weddings, festivals, product launches.
Built for two roles at once — **CEO dashboards** (revenue, projection, reputation) and **Manager dashboards** (calendar,
pipeline, vendors, budget, RFQs).

## Data model

The source of truth is **Postgres on Neon**. `prisma/schema.prisma` mirrors it as the app's ORM layer.

Core entities:
- `events` — every program from lead → completed, with projections, spend, and reputation
- `vendors` + `vendor_offerings` — rate cards for Sound/Stage/Decor/Carpet/Lighting/F&B/Water/Contractors/Security/Ticketing/…
- `budget_lines` — per-event category breakdown, planned vs actual
- `teams` + `team_members` + `event_assignments` — utilization, roles per event
- `ticket_tiers` + `ticket_sales` — ticketing per event
- `sponsors`, `event_reviews`, `market_intel` — commercial + reputation + competitive signals
- **RFQ workflow**: `rfqs` → `rfq_items` → `rfq_recipients` → `rfq_quotes` (draft → sent → collecting → comparing → awarded)

All money is stored in **paise (BigInt)** — never in float rupees.

## Stack

- Next.js 16 + React 19 (aligned with the sibling **Clinicia** app so a shared design system can be reused)
- Prisma 7 with the pg driver adapter (Neon pooler)
- Tailwind 4 (design tokens map to the Clinicia palette — Clinic Red `#ba0013`, Slate `#131b2e`, Inter type stack)
- TypeScript strict

## Local setup

```bash
pnpm install
cp .env.example .env.local     # fill in the Neon connection strings
pnpm db:generate                # generate the Prisma client
pnpm dev
```

To reset the database from SQL (schema + seed):

```bash
psql "$DATABASE_URL" -f ../../scratchpad/schema.sql
psql "$DATABASE_URL" -f ../../scratchpad/seed.sql
psql "$DATABASE_URL" -f ../../scratchpad/rfq_schema.sql
```

## App layout (planned)

```
src/
  app/
    (dashboard)/
      overview/            # CEO + Manager KPIs (role-toggle)
      events/
        page.tsx           # Kanban pipeline
        [code]/page.tsx    # Event brief: budget, vendors, team, tickets, sponsors, timeline
      calendar/
        page.tsx           # Month grid, load-ins, venue blocks
      vendors/
        page.tsx           # Category-filtered directory
        [id]/page.tsx      # Vendor profile + rate card + past events
      budgets/
        page.tsx           # Per-event breakdown + 1,000-person template
      teams/
        page.tsx           # Roster + utilization
      rfqs/
        page.tsx           # RFQ index
        new/page.tsx       # Create RFQ (multi-step)
        [code]/page.tsx    # Compare quotes side-by-side + award
      reputation/page.tsx
      market/page.tsx
  lib/
    db.ts                  # Prisma singleton with pg driver adapter
    money.ts               # Paise arithmetic + INR (Lakhs/Crores) formatters
    dates.ts
  components/
    kpi/tile.tsx
    charts/{sparkline,bars,donut}.tsx
    events/{kanban,brief,drawer}.tsx
    rfq/{create-wizard,compare-table,award-panel}.tsx
```

## Design system

Mirrors **Clinicia** (`/Users/tharunkumarl/Full Stack/clinicia/Clinicia/design.md`):

- Primary `#ba0013` (Clinic Red) — brand + primary CTAs only
- Ink `#131b2e`, Steel `#515f74` for text; Surface `#ffffff`, Container `#f1f5f9`
- Semantic (kept distinct from brand): success `#0f766e`, warning `#b45309`, info `#1e40af`
- Inter type stack, tabular numerals on every metric
- 2 / 4 / 8 px radii, 4 / 8 / 16 / 20 / 24 px spacing tokens

## Reference dashboard

A working single-file preview of the whole product ships as an Artifact — see the conversation.
Every visual pattern here (KPI tiles, kanban card, budget bar, calendar cell, RFQ compare) is portable to
`app/components/`.
