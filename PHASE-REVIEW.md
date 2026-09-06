# Phase A–G Overnight Build — Review

**Branch:** `feature/phase-a-auth-users-rbac`
**Base:** `main`
**Commits:** 30 on top of main
**Date:** 2026-09-06 → 2026-09-07 (overnight run)
**Verified:** `pnpm typecheck` clean · `pnpm test:unit` 28/28 pass · `pnpm lint` 0 errors (2 pre-existing warnings) · 80-cell role×page smoke all clean

---

## TL;DR

Turned the single-user Eventbot dashboard into a real multi-user event-management CRM. Every phase from the design doc shipped:

| Phase | What | Commits |
|---|---|---|
| **A** — Staff RBAC | Auth.js v5, 5 roles, invite/reset flows, page-level guards | 10 |
| **B** — Hybrid visibility | `whereEventVisible`, per-event grants, `/forbidden` page | 5 |
| **C** — Tasks | Per-event tasks, `/tasks` inbox, task drawer on brief | 1 |
| **D** — Comments + notifications | Polymorphic comments + @mentions, notification bell | 1 |
| **E** — Activity + Audit | `logActivity` wrapper, `/settings/audit` page | 1 |
| **F** — Contacts + Proposals | Proposals with public shareable link, view/accept tracking | 1 |
| **G** — Task playbooks | Auto-tasks on status change, 3 starter playbooks seeded | 1 |

The DB has 12 new tables. The app has 5 seeded users covering every role. Auth cutover is complete (`LEGACY_AUTH` gone).

---

## Test credentials

Log in at **http://localhost:3010/login**:

| Role | Email | Password |
|---|---|---|
| **CEO / Owner** | `inaicommunity@gmail.com` | `WyicysvSbgSfTDa0Cb1fAa1!` |
| Sales | `sales@eventbot.local` | `Password2026!` |
| Producer | `producer@eventbot.local` | `Password2026!` |
| Coordinator | `coordinator@eventbot.local` | `Password2026!` |
| Finance | `finance@eventbot.local` | `Password2026!` |

**Rotate the CEO password** via `/settings/profile` immediately.

---

## Flow diagrams

### Auth flow

```
Browser ─► /login (public)
          │  POST /api/auth/callback/credentials
          │     ├─ rate-limit check (10 fails / 15 min → lock)
          │     ├─ bcrypt.compare vs users.password_hash
          │     └─ JWT signed → authjs.session-token cookie set
          ▼
       /overview
          │  every request → middleware checks cookie presence (Node runtime)
          │  server component reads session → getSessionUser()
          ▼
       renders per-role UI
```

### Event visibility

```
For every db.event.find*/count outside src/lib/visibility.ts:
      where: whereEventVisible(user)

whereEventVisible(user):
  ceo         → {} (all)
  sales       → status ∈ (lead|proposed|confirmed) ∪ createdBy=me ∪ grants
  producer    → status ∈ (confirmed|in_production|live|wrap_up) ∪ createdBy=me ∪ grants
  finance     → totalBudget > 0 ∪ grants
  coordinator → status ∈ (in_production|live|wrap_up) ∪ grants

Mutation of event by id → canSeeEvent(me, id) MUST pass first.
```

### Comments + notifications

```
POST /api/comments/actions.postComment
     │  parse @[Name](userId) tokens
     │  transaction {
     │    INSERT comment
     │    INSERT comment_mention rows (dedupe, cap 20)
     │    fan-out INSERT notification rows to each mentioned user (skip self)
     │  }
     ▼
NotificationBell polls GET /api/notifications every 60s
     ▼
     unread count → red badge in top bar
```

### Proposal accept

```
CEO/Sales/Producer  ▶  /events/[code]  ▶  ProposalDrawer  ▶  createProposal
                                                                   │ status=draft, publicToken=32B hex
                                                                   ▼
Public URL /p/[token] (no auth, middleware whitelisted)
     │  GET → if status=sent and no first_viewed_at → status=viewed
     │  POST acceptProposal → status=accepted + acceptedAt
     │                      → transactionally bump event lead|proposed → confirmed
     │                      → runPlaybooksForStatus fires event_confirmed playbooks
     ▼
     Producer/Coordinator sees new tasks appear in /tasks
     Assignees get task_assigned notifications
```

### Task playbook trigger

```
updateEventStatus(id, next):
   │  canSeeEvent + role gate
   │  UPDATE events SET status=next
   │  logActivity(event.move_status)
   │  runPlaybooksForStatus:
   │     trigger = confirmed → event_confirmed
   │              in_production → event_in_production
   │     select active playbooks matching (trigger, eventType null or =)
   │     for each not already run (event_playbook_runs UNIQUE):
   │        transaction {
   │          INSERT event_playbook_runs (guards idempotency)
   │          for each item: INSERT task + INSERT notification if assignee
   │        }
   │        logActivity(playbook.run)
```

---

## Permission matrix (verified in `src/lib/authz.test.ts` — 22 test cases)

| Action | CEO | Sales | Producer | Coord | Finance |
|---|:-:|:-:|:-:|:-:|:-:|
| event.create | ✅ | ✅ | ✅ | ❌ | ❌ |
| event.edit_brief | ✅ | ✅ if status ∈ lead/proposed | ✅ | ❌ | ❌ |
| event.move_status.lead_to_confirmed | ✅ | ✅ | ❌ | ❌ | ❌ |
| event.move_status.confirmed_to_completed | ✅ | ❌ | ✅ | ❌ | ❌ |
| event.grant_access | ✅ | ❌ | ✅ | ❌ | ❌ |
| budget.line.create/edit | ✅ | ❌ | ✅ | ❌ | ✅ |
| budget.approve | ✅ | ❌ | ❌ | ❌ | ✅ |
| vendor.create/edit | ✅ | ❌ | ✅ | ❌ | ❌ |
| rfq.create/send/award | ✅ | ❌ | ✅ | ❌ | ❌ |
| task.create/edit/assign | ✅ | ✅ | ✅ | ✅ | ✅ |
| comment.post | ✅ | ✅ | ✅ | ✅ | ✅ |
| contact.create/edit, proposal.create/send | ✅ | ✅ | ✅ | ❌ | ❌ |
| user.invite/deactivate/change_role | ✅ | ❌ | ❌ | ❌ | ❌ |
| audit.view.all | ✅ | ❌ | ❌ | ❌ | ❌ |
| audit.view.finance | ✅ | ❌ | ❌ | ❌ | ✅ |
| playbook.manage | ✅ | ❌ | ❌ | ❌ | ❌ |
| view.settings.users / audit / playbooks | ✅ / ✅+finance / ✅ |

---

## Files added

### Libraries
- `src/lib/authz.ts` — role enum, `Action` union (~35 actions), `can()` switch, `requireRole()`
- `src/lib/session.ts` — `getSessionUser()` returning typed SessionUser
- `src/lib/rate-limit.ts` — in-memory login limiter (TODO: Upstash for prod)
- `src/lib/visibility.ts` — pure `whereEventVisible()` (unit-testable, no side-effects)
- `src/lib/visibility-server.ts` — `canSeeEvent()` (uses db; server-only barrier)
- `src/lib/guard.ts` — `guardPage(action)` — page-level auth+role gate
- `src/lib/comments.ts` — `extractMentions()`, `assertCanCommentOn()`, `notify()`, `linkForEntity()`
- `src/lib/activity.ts` — `logActivity()` + `FINANCE_ACTIONS` allowlist
- `src/lib/playbooks.ts` — `runPlaybooksForStatus()` (idempotent trigger)

### Server actions
- `src/app/login/actions.ts` (rewrite for Auth.js signIn)
- `src/app/(dashboard)/settings/profile/actions.ts` (name + password)
- `src/app/(dashboard)/settings/users/actions.ts` (invite / deactivate / reactivate / change_role)
- `src/app/accept-invite/[token]/actions.ts`
- `src/app/reset-password/actions.ts`
- `src/app/(dashboard)/tasks/actions.ts` (CRUD + assignee)
- `src/app/(dashboard)/events/[code]/access-actions.ts` (grant/revoke)
- `src/app/(dashboard)/events/[code]/proposal-actions.ts` (create/send/supersede)
- `src/app/api/comments/actions.ts` (post/delete/mark-notifs-read)
- `src/app/p/[token]/actions.ts` (public accept)

### Route handlers
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/notifications/route.ts`

### Pages
- `/login`, `/accept-invite/[token]`, `/reset-password`, `/reset-password/[token]`
- `/p/[token]` (public)
- `/settings/profile`, `/settings/users`, `/settings/audit`, `/settings/playbooks`
- `/tasks` (My + All visible toggle)
- `/(dashboard)/forbidden`

### Components
- `src/components/shell/NotificationBell.tsx`
- `src/components/comments/CommentThread.tsx`
- `src/app/(dashboard)/settings/users/{InviteDrawer,RoleSelect}.tsx`
- `src/app/(dashboard)/events/[code]/{AccessDrawer,TaskDrawer,ProposalDrawer}.tsx`

### Migrations (all applied)
1. `20260906_add_users_rbac` — user_role enum + users + accounts + verification_tokens + FK cols
2. `20260906_add_event_user_access` — Phase B grant table
3. `20260906_phase_c_tasks` — task_status + task_priority + tasks + task_checklist_items
4. `20260906_phase_d_comments_notifs` — comment_entity + notification_kind + comments + comment_mentions + notifications
5. `20260906_phase_e_activity` — activity_log
6. `20260906_phase_f_contacts_proposals` — proposal_status + contacts + events.primary_contact_id + proposals
7. `20260906_phase_g_playbooks` — playbook_trigger + task_playbooks + task_playbook_items + event_playbook_runs

### Seed scripts
- `prisma/seed/seed-ceo.ts` — one-off CEO from env
- `prisma/seed/seed-demo-users.ts` — 4 demo users, shared password `Password2026!`
- `prisma/seed/seed-playbooks.ts` — 3 starter playbooks (concert / wedding / conference)

---

## Design choices worth flagging

1. **Middleware is a cheap cookie-presence check, not an `auth()` call.** Reason: `auth()` pulls Prisma + bcrypt into the edge runtime bundle, which the edge runtime can't run. Real auth happens per-page via `getSessionUser()` on the Node runtime. Middleware only bounces unauthenticated hits back to `/login`.
2. **Visibility filter is split into two files.** `visibility.ts` is a pure function (unit-testable under node:test). `visibility-server.ts` has the DB-touching helpers (`canSeeEvent`) with `import "server-only"` to keep them out of client bundles.
3. **`onChange` submits in select components are wrapped in tiny client components** (`RoleSelect`, `AccessDrawer`, `TaskDrawer`, `ProposalDrawer`) because React 19 forbids event handlers crossing the RSC boundary.
4. **`unstable_cache` was removed from the sidebar-counts + runsheet queries** in the dashboard layout. Reason: those queries are now user-scoped (different roles see different totals), so shared cache would leak wrong numbers.
5. **Comment entity model is polymorphic** (`entity_type` enum + `entity_id`) with a CHECK constraint enforcing `entity_id > 0`. One thread pattern serves events, RFQs, and tasks.
6. **Notification bell polls every 60s.** No SSE/WebSockets; if unread count staleness ever becomes a real complaint we can upgrade later. Route handler at `/api/notifications` is whitelisted in middleware but auth-checks inside.
7. **Public proposal viewer records a side-effect on GET** (flipping `sent` → `viewed`, setting `firstViewedAt`). Deliberate — the schema has `firstViewedAt` explicitly for that read event.
8. **Playbook trigger is idempotent** via `event_playbook_runs.UNIQUE(event_id, playbook_id)`. Kanban-drag an event back and forth through confirmed and the playbook fires exactly once.
9. **`updateEventStatus` uses a coarse role-per-transition gate.** `event.move_status.lead_to_confirmed` (early transitions) → CEO/Sales; `event.move_status.confirmed_to_completed` (delivery arrows) → CEO/Producer. Not per-arrow refined; simpler for Phase A/B.
10. **Rate limit is in-memory** (`src/lib/rate-limit.ts`). Fine for dev + single-instance staging. Flagged with a TODO — swap to Upstash Redis before you open the CRM to more than a handful of concurrent staff.

---

## Known limits and gotchas

- **Sales invite drawer has no "reset invite" button** — if an invite email is lost, the CEO can only delete + re-invite. Small follow-up.
- **Proposal body is plain-preview** — the schema stores markdown but the public viewer renders it as `whitespace-pre-wrap`. Add a real markdown renderer (`react-markdown` or similar) as a follow-up.
- **Contacts have no UI yet.** The `contacts` table + `events.primary_contact_id` FK are shipped. A "People" tab on Client detail is a small follow-up.
- **Playbook manager is read-only.** Create/edit/pause UI is a follow-up; edit `prisma/seed/seed-playbooks.ts` and re-run to iterate.
- **Resend key is optional in dev.** Without `RESEND_API_KEY`, invite + reset emails print to the server log. Set the key + `EMAIL_FROM` in `.env.local` for real send.
- **Middleware convention is deprecated in Next 16.** `src/middleware.ts` still works but Next wants `proxy.ts`. Rename in a small follow-up.
- **`unstable_cache` warning may surface in dev** — layered ISR was removed from the (dashboard) layout intentionally (per note #4 above). If it ever comes back, key by user id.
- **The 5-role smoke test** ran 80 combinations and every one returned 200 with correct redirect target. That's the automated verification. There's no full-flow Playwright suite yet — just the one CEO login smoke shipped in Phase A.

---

## Rollback

Every migration is additive-only — no data drops. To rollback:
1. `git checkout main` and revert the Auth.js code (drops `next-auth` back to unused).
2. Old env-auth won't come back — I deleted the LEGACY_AUTH path in Phase B. If you need it, cherry-pick `6eaf22d` before Phase B.
3. The DB tables can be dropped in reverse order — or just leave them, they cost nothing empty.

---

## Follow-on backlog (Phase H+)

The spec was covered end-to-end. Natural next steps (all deferred by design):

- **Vendor portal** — vendors log in to see RFQs sent to them, submit quotes.
- **Client portal** — client contact logs in to see their event's status, approve budgets.
- **File attachments** — Vercel Blob wiring; add to events + proposals + tasks.
- **Guest list / RSVP** — for private events (weddings, corporate parties).
- **Payment schedule + invoicing** — deposit / interim / final.
- **Email log** — track outbound comms per event.
- **Public ticketing** — separate consumer app for concerts/festivals.
- **Playbook editor UI** — full CRUD in `/settings/playbooks`.
- **Contacts tab on Client detail.**
- **Real markdown rendering in the public proposal viewer.**
- **SSO / SAML / MFA.**
- **Real rate limiter on Upstash Redis** (before opening to real prod traffic).

---

## How I'd merge this

```bash
git checkout main
git merge --no-ff feature/phase-a-auth-users-rbac
git push origin main
```

Every migration is already applied to the DB in `.env.local`, so the merge is code-only. In another environment, run:

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260906_add_users_rbac/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/20260906_add_event_user_access/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/20260906_phase_c_tasks/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/20260906_phase_d_comments_notifs/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/20260906_phase_e_activity/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/20260906_phase_f_contacts_proposals/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/20260906_phase_g_playbooks/migration.sql
pnpm db:seed:ceo
pnpm db:seed:demo-users
pnpm db:seed:playbooks
```

---

*End of review.*
