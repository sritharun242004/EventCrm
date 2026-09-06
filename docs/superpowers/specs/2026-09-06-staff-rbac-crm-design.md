# Eventbot — Staff RBAC + Standard CRM (Phase 1)

**Status:** approved for implementation
**Date:** 2026-09-06
**Owner:** eventbot core
**Scope:** Internal staff authentication with 5 roles, hybrid event visibility, plus Tasks, Notifications, Activity Feed, and Comments/@mentions on Events and RFQs. Vendor portal, Client portal, and public Ticketing are explicitly deferred.

---

## 1. Goal & non-goals

**Goal.** Turn Eventbot from a single-user internal dashboard into a real multi-user event-management CRM for one event agency. Every logged-in person is an employee. Roles determine what they can do; per-event grants let anyone be pulled onto any event.

**Non-goals in this phase.**
- Vendors logging in (separate Vendor Portal phase).
- Clients logging in (separate Client Portal phase).
- Public ticket buyers (separate consumer app).
- SSO / SAML / MFA (revisit after Phase 1 stabilises).
- Multi-tenant / multi-agency (`orgId` reserved on the JWT, no DB table yet).
- Custom / configurable roles or per-permission rows in DB (roles stay as a Prisma enum + code-level `can()` switch).
- Email logging, file attachments, saved reports (Phase 3 candidates).

---

## 2. Roles

Five fixed internal roles, stored as a Prisma enum:

| Role | UI label | Intent |
|---|---|---|
| `ceo` | Owner | Full control, financial approvals, user management |
| `sales` | Sales | Client pipeline, proposals, lead → confirmed |
| `producer` | Producer | Event delivery, vendors, RFQs, budgets, team |
| `coordinator` | Coordinator | On-event tasks, day-of execution |
| `finance` | Finance | Budgets, invoices, spend, approvals |

Role names in the DB are lowercase snake; the UI shows the title-case label.

---

## 3. Visibility model (hybrid)

Every event query goes through **`whereEventVisible(user)`** in `src/lib/authz.ts`. No `prisma.event.findMany(...)` outside that helper. Enforced by an ESLint rule and code review.

Default visibility per role:
- **CEO** — all events, always.
- **Sales** — events in `status IN ('lead','proposed','confirmed')` **OR** in `event_user_access`.
- **Producer** — events in `status IN ('confirmed','in_production','live','wrap_up')` **OR** in `event_user_access`.
- **Finance** — events with `total_budget_cents > 0` **OR** in `event_user_access`.
- **Coordinator** — events in `status IN ('in_production','live','wrap_up')` **OR** in `event_user_access`.

`event_user_access` is a simple grant table (`event_id`, `user_id`, `granted_by_user_id`, `granted_at`) written by CEO/Producer via a per-event "Grant access" drawer.

Nothing in this system is a hard "deny" list — a role's default set is a *union* with explicit grants.

---

## 4. Permission matrix

Enforced in `lib/authz.ts` as a single `can(user, action, resource?)` switch. Actions are dotted strings (`event.create`, `rfq.award`, `budget.approve`, `user.invite`).

| Action | CEO | Sales | Producer | Coordinator | Finance |
|---|:-:|:-:|:-:|:-:|:-:|
| `event.view` (via `whereEventVisible`) | all | role default + grants | role default + grants | role default + grants | role default + grants |
| `event.create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `event.edit_brief` | ✅ | ✅ if `status IN ('lead','proposed')` | ✅ | ❌ | ❌ |
| `event.move_status` (`lead→proposed→confirmed`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| `event.move_status` (`confirmed→…→completed`) | ✅ | ❌ | ✅ | ❌ | ❌ |
| `event.grant_access` | ✅ | ❌ | ✅ (own events) | ❌ | ❌ |
| `budget.line.create` / `budget.line.edit` | ✅ | ❌ | ✅ | ❌ | ✅ |
| `budget.approve` (line > ₹10L **or** `actual > 1.20 * planned`) | ✅ | ❌ | ❌ | ❌ | ✅ |
| `vendor.create` / `vendor.edit` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `rfq.create` / `rfq.send` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `rfq.award` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `task.create` / `task.edit` / `task.assign` | ✅ | ✅ (visible events) | ✅ (visible events) | ✅ (visible events) | ✅ (visible events) |
| `comment.post` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user.invite` / `user.deactivate` / `user.change_role` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `audit.view` (all) | ✅ | ❌ | ❌ | ❌ | ❌ |
| `audit.view` (finance only) | — | ❌ | ❌ | ❌ | ✅ |

Every deny returns HTTP 403 from route handlers / server actions with a stable JSON error `{ error: "forbidden", action, actor }` for observability.

---

## 5. Auth stack

**Chosen:** Auth.js v5 (`next-auth@5`) with `@auth/prisma-adapter`, `bcrypt`, and `resend`. Runs on the default Node runtime (Fluid Compute when deployed to Vercel).

**Sessions:** JWT strategy. Idle TTL 12h; absolute TTL 30 days. Token payload: `{ sub: userId, email, name, role }`. Rotated on every login. No DB Session table (we skip it deliberately — the JWT is enough and avoids a per-request DB hit).

**Providers:**
- **Credentials** — daily login: email + password (bcrypt cost 12).
- **Email** (Resend) — one physical provider used for two purposes:
  - Invite acceptance (first-time password set).
  - Password reset.
  Both flows write a row in `VerificationToken` with a 24h expiry.

**Middleware:** `src/middleware.ts` guards `/(dashboard)/*`, `/settings/*`, and `/api/(protected)/*`. Unauthenticated → `/login?returnTo=<original>`.

**Authorization helpers** (`src/lib/authz.ts`):
- `requireUser()` — throws 401.
- `requireRole(...allowed: UserRole[])` — throws 403.
- `can(user, action, resource?)` — pure function, returns boolean; used both in server actions and in UI.
- `whereEventVisible(user)` — returns a `Prisma.EventWhereInput` combining role defaults + `event_user_access`.

**Rate-limiting:** login endpoint — 10 failed attempts per email per 15 min → 15-min lock. Backing store: Redis if `REDIS_URL` is set, in-memory Map otherwise (dev only; flagged as TODO for prod).

**Password rules:** min 12 chars, at least one number and one symbol, checked client + server. No composition-only rule; no rotation.

**No SSO / MFA in this phase.**

---

## 6. Data model additions

All new tables. Existing tables get additive columns only. Every FK has a matching index.

### 6.1 Enums

```prisma
enum UserRole {
  ceo
  sales
  producer
  coordinator
  finance
  @@map("user_role")
}
enum TaskStatus     { open in_progress blocked done cancelled  @@map("task_status") }
enum TaskPriority   { low normal high urgent                   @@map("task_priority") }
enum CommentEntity  { event rfq task                           @@map("comment_entity") }
enum NotificationKind {
  task_assigned  task_due_soon  mentioned  comment_reply
  event_assigned  budget_breach  quote_received  rfq_closing
  @@map("notification_kind")
}
```

### 6.2 New tables

**`users`** — one row per human who can log in.

```prisma
model User {
  id              Int       @id @default(autoincrement())
  email           String    @unique
  name            String
  passwordHash    String?   @map("password_hash")            // null until invite accepted
  role            UserRole
  active          Boolean   @default(true)
  invitedByUserId Int?      @map("invited_by_user_id")
  invitedAt       DateTime? @map("invited_at") @db.Timestamptz(6)
  acceptedAt      DateTime? @map("accepted_at") @db.Timestamptz(6)
  lastLoginAt     DateTime? @map("last_login_at") @db.Timestamptz(6)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  @@index([role], name: "users_role_idx")
  @@map("users")
}
```

**`accounts`**, **`verification_tokens`** — Auth.js standard shapes (see [Auth.js Prisma adapter docs](https://authjs.dev/getting-started/adapters/prisma) — copy verbatim).

**`event_user_access`** — per-event grant (the hybrid override).

```prisma
model EventUserAccess {
  id              Int      @id @default(autoincrement())
  eventId         Int      @map("event_id")
  userId          Int      @map("user_id")
  grantedByUserId Int      @map("granted_by_user_id")
  grantedAt       DateTime @default(now()) @map("granted_at") @db.Timestamptz(6)
  @@unique([eventId, userId])
  @@index([userId], name: "event_access_user_idx")
  @@map("event_user_access")
}
```

**`tasks`** — per-event work items.

```prisma
model Task {
  id               Int          @id @default(autoincrement())
  eventId          Int          @map("event_id")
  title            String
  description      String?
  status           TaskStatus   @default(open)
  priority         TaskPriority @default(normal)
  assigneeUserId   Int?         @map("assignee_user_id")
  createdByUserId  Int          @map("created_by_user_id")
  dueOn            DateTime?    @map("due_on") @db.Date
  completedAt      DateTime?    @map("completed_at") @db.Timestamptz(6)
  createdAt        DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  @@index([eventId, status], name: "tasks_event_status_idx")
  @@index([assigneeUserId, status], name: "tasks_assignee_status_idx")
  @@map("tasks")
}
model TaskChecklistItem {
  id       Int    @id @default(autoincrement())
  taskId   Int    @map("task_id")
  label    String
  done     Boolean @default(false)
  order    Int    @default(0)
  @@map("task_checklist_items")
}
```

**`comments`** + **`comment_mentions`** — polymorphic (`entity_type` + `entity_id`). Postgres CHECK constraint enforces `entity_type IN ('event','rfq','task')` and `entity_id > 0`. Body is markdown with `@[Name](userId)` mention tokens; on save the server extracts mentions, writes `comment_mentions` rows, and fans out `mentioned` notifications.

```prisma
model Comment {
  id            Int           @id @default(autoincrement())
  entityType    CommentEntity @map("entity_type")
  entityId      Int           @map("entity_id")
  authorUserId  Int           @map("author_user_id")
  body          String
  createdAt     DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  editedAt      DateTime?     @map("edited_at") @db.Timestamptz(6)
  @@index([entityType, entityId, createdAt], name: "comments_entity_idx")
  @@map("comments")
}
model CommentMention {
  id              Int @id @default(autoincrement())
  commentId       Int @map("comment_id")
  mentionedUserId Int @map("mentioned_user_id")
  @@unique([commentId, mentionedUserId])
  @@map("comment_mentions")
}
```

**`notifications`** — per-user inbox. Bell shows unread count; polling every 60s from the client.

```prisma
model Notification {
  id        Int              @id @default(autoincrement())
  userId    Int              @map("user_id")
  kind      NotificationKind
  title     String
  body      String?
  linkUrl   String           @map("link_url")
  readAt    DateTime?        @map("read_at") @db.Timestamptz(6)
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  @@index([userId, readAt], name: "notif_user_unread_idx")
  @@map("notifications")
}
```

**`activity_log`** — audit trail. Written by a `logActivity(actor, action, entity, diff?)` helper wrapped around every mutating server action. Read via `/settings/audit` (CEO — all) or a filtered view (Finance — actions matching `budget.*`, `rfq.award`, `event.move_status`).

```prisma
model ActivityLog {
  id          Int      @id @default(autoincrement())
  actorUserId Int?     @map("actor_user_id")
  action      String
  entityType  String   @map("entity_type")
  entityId    Int      @map("entity_id")
  diff        Json?
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  @@index([entityType, entityId, createdAt], name: "activity_entity_idx")
  @@index([actorUserId, createdAt], name: "activity_actor_idx")
  @@map("activity_log")
}
```

Migration file: `prisma/migrations/20260906_add_users_rbac/migration.sql`.

### 6.3 Touches to existing tables

1. `team_members.user_id INT NULL UNIQUE` — optional 1:1 link.
2. `events.created_by_user_id INT NULL` — audit + Sales visibility helper.
3. `rfqs.created_by_user_id INT NULL` — additive; the old `created_by` **string** column is kept for one release, then dropped in a follow-up migration.
4. All three of the above are backfilled to the seeded CEO user in the same migration.

---

## 7. Navigation & UI changes

**Sidebar** (single list, filtered by `can(user, "view.<page>")`):

```
Overview               all roles (KPIs filtered by scope)
Events                 all
Calendar               all
Tasks (My + Team)      all
RFQs                   CEO, Producer
Vendors                CEO, Producer
Budgets                CEO, Producer, Finance
Teams                  CEO, Producer
Reputation             CEO, Sales
Market Intel           CEO, Sales
────────────
Notifications (bell)   all
Settings › Profile     all
Settings › Users       CEO
Settings › Audit log   CEO (all), Finance (finance actions only)
```

The current top-bar "CEO / Manager lens" toggle is **removed**. Role now comes from the session and is shown as a badge next to the avatar. Overview KPIs adapt to the role automatically.

Every list page shows a small **"Seeing N of M events · role default"** chip. Click → drawer explains the rule and offers "request access" for the events the user can't see.

**No new pages** beyond:
- `/login`, `/accept-invite`, `/reset-password`
- `/settings/profile`, `/settings/users`, `/settings/audit`
- `/tasks` (My + Team filter)

Everything else stays where it is, with role-gated CTAs.

---

## 8. Migration & cutover plan

1. **Migration file** — `prisma/migrations/20260906_add_users_rbac/migration.sql`. Additive only; safe to run against Neon prod. Backfills:
   - Insert one CEO user from `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` env (bcrypt hashed at migration time — password read once at deploy, never stored plain).
   - `UPDATE events SET created_by_user_id = <ceo.id>`.
   - `UPDATE rfqs SET created_by_user_id = <ceo.id>`.
2. **Ship Auth.js in the same PR** as the migration. Legacy env-auth (`AUTH_EMAIL`/`AUTH_PASSWORD`) is kept behind a `LEGACY_AUTH=on` flag for one release. Anyone with the legacy creds still gets in — but they're logged in as the seeded CEO.
3. **CEO logs in, invites everyone else** via `/settings/users`.
4. **Flip `LEGACY_AUTH=off`** in Vercel env → redeploy. Rip out the legacy code in the next PR.
5. **Drop `rfqs.created_by` (string)** in a follow-up migration once no code reads it.

**Rollback.** Migration is additive → set `LEGACY_AUTH=on` and revert code. Data is preserved. `SEED_ADMIN_PASSWORD` should be rotated after step 3.

---

## 9. Implementation phases

Each phase is independently shippable and independently useful.

- **Phase A — Auth + Users + RBAC skeleton.** Migration, Auth.js wiring, middleware, `authz.ts`, `/login`, `/accept-invite`, `/settings/users`, `/settings/profile`. Every existing page gets its `requireRole` / `can` guard and its sidebar `view.*` gate. Legacy env-auth still on. Ship.
- **Phase B — Event visibility (hybrid).** `whereEventVisible`, `event_user_access`, per-event "Grant access" drawer, "Seeing N of M" chip. Legacy env-auth off.
- **Phase C — Tasks.** Tables, `/tasks` (My + Team + per-event), task drawer on the event brief, task assignment notification.
- **Phase D — Comments + @mentions + Notifications.** Comment thread component on Events + RFQs + Tasks. @mention picker. Notification bell with unread badge, polling every 60s (SSE later if needed).
- **Phase E — Activity Feed + Audit Log.** `logActivity()` wrapper on all mutating server actions. Per-event activity tab. `/settings/audit` for CEO.

Each phase is one PR with its own tests and a "verify" checklist in the PR description.

---

## 10. Testing & verification

- **Unit (`node:test`, Node 24 built-in — no new dev dep).** `lib/authz.ts` — one test per row of the permission matrix (§4). Any change to the matrix requires a matching test change. Runner: `node --test src/lib/*.test.ts` wired into a new `pnpm test:unit` script.
- **Integration (Playwright).** One end-to-end flow per role: log in, hit `/overview` and `/events/[code]`, attempt one allowed and one forbidden action, assert redirect / 403.
- **DB smoke (`pnpm test:smoke`).** Extended with: CEO exists; CEO can list all events; `whereEventVisible(ceo)` returns count > 0.
- **Manual verify (PR checklist).** Invite user → accept → login → post comment with @mention → recipient sees notification → assign task → assignee sees notification → mark task done → activity feed shows entry → CEO audit log shows entry.

---

## 11. Deliberate omissions & follow-ups

- **No fine-grained permissions in DB.** Adding a `Permission` / `RolePermission` table for 5 fixed roles is over-engineering; changing a `can()` switch is cheaper than a data migration.
- **No SSE/WebSockets for notifications.** Bell polls once a minute. Upgrade if unread notifications feel stale in practice.
- **No file attachments, no email logging, no saved reports.** Phase 3 candidates.
- **No multi-tenant.** `orgId` reserved on the JWT for later. No table.
- **Rate limit is in-memory when Redis isn't configured** — acceptable in dev, must flip on Upstash (or equivalent) before opening the CRM to more than a handful of concurrent staff.

---

## 12. Open questions (post-implementation, not blockers)

- Should Sales be able to see Producer's in-delivery events read-only (i.e., role defaults union rather than partition)? Current design says no; revisit after Phase B usage data.
- Should `budget.approve` threshold be per-event configurable? Currently a code constant (₹10L or >120% of planned).
- Should invite tokens allow role change at accept-time? Currently no — role is fixed at invite time.

---

*End of design.*
