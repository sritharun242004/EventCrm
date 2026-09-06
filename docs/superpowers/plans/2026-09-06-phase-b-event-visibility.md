# Phase B — Hybrid event visibility + per-event grants

**Goal:** Enforce the hybrid visibility model from design §3 across every event query. Non-CEO users see only their role-default set unioned with explicit `event_user_access` grants. Adds a per-event "Grant access" drawer, a friendly 403, and flips `LEGACY_AUTH` off.

**Architecture:** New `event_user_access` table (event_id, user_id, granted_by, granted_at). New `src/lib/visibility.ts` exports `whereEventVisible(user): Prisma.EventWhereInput` — the single call every event query MUST use. Two new server actions on the Event brief (`grantAccess`, `revokeAccess`) gated by `can(user, "event.grant_access")`. Friendly `/forbidden` page replaces the FORBIDDEN throw path (any remaining requireRole gets swapped to guardPage). Legacy env-auth path gets deleted along with `LEGACY_AUTH=on`.

**Tech Stack:** same as Phase A — Prisma 7 + Neon + Next 16.

## Global Constraints (from spec §3, §4, §5)

- Every `prisma.event.find*` / `prisma.event.count` OUTSIDE `src/lib/visibility.ts` MUST pass `whereEventVisible(user)` in its `where` clause (AND'd with any other filter). Any exception is a defect.
- Visibility defaults per role:
  - `ceo` → all events (no filter).
  - `sales` → `status ∈ {lead, proposed, confirmed}` ∪ grants ∪ events created by them.
  - `producer` → `status ∈ {confirmed, in_production, live, wrap_up}` ∪ grants ∪ events created by them.
  - `finance` → `total_budget_cents > 0` ∪ grants.
  - `coordinator` → `status ∈ {in_production, live, wrap_up}` ∪ grants.
- `event_user_access` uses `ON DELETE CASCADE` on both FKs.
- New action `event.grant_access` → CEO or Producer only (matches design §4).
- Every commit ends with `Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk`.

---

## Task 1 — Schema + migration for `event_user_access`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260906_add_event_user_access/migration.sql`
- Apply against current `DATABASE_URL`.

Prisma:
```prisma
model EventUserAccess {
  id              Int      @id @default(autoincrement())
  eventId         Int      @map("event_id")
  userId          Int      @map("user_id")
  grantedByUserId Int      @map("granted_by_user_id")
  grantedAt       DateTime @default(now()) @map("granted_at") @db.Timestamptz(6)

  event     Event @relation("EventGrantees", fields: [eventId], references: [id], onDelete: Cascade)
  user      User  @relation("EventGrants",   fields: [userId], references: [id], onDelete: Cascade)
  grantedBy User  @relation("EventGrantsBy", fields: [grantedByUserId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@index([userId], name: "event_access_user_idx")
  @@map("event_user_access")
}
```

Add reverse relations on `User` (`grants`, `grantsMade`) and `Event` (`grants`).

SQL:
```sql
CREATE TABLE event_user_access (
  id                    SERIAL PRIMARY KEY,
  event_id              INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id               INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  granted_by_user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  granted_at            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);
CREATE INDEX event_access_user_idx ON event_user_access (user_id);
```

Apply via `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/…/migration.sql`. Commit schema + migration together.

---

## Task 2 — `src/lib/visibility.ts` with `whereEventVisible`

**Files:**
- Create: `src/lib/visibility.ts`
- Create: `src/lib/visibility.test.ts` (node:test, one case per role)

Interface:
```ts
export function whereEventVisible(user: SessionUser): Prisma.EventWhereInput
```

Body (pseudocode):
```ts
if (user.role === "ceo") return {};

const grantsOr = { grants: { some: { userId: user.id } } };
const createdOr = { createdByUserId: user.id };

switch (user.role) {
  case "sales":
    return { OR: [{ status: { in: ["lead","proposed","confirmed"] } }, createdOr, grantsOr] };
  case "producer":
    return { OR: [{ status: { in: ["confirmed","in_production","live","wrap_up"] } }, createdOr, grantsOr] };
  case "finance":
    return { OR: [{ totalBudgetCents: { gt: 0 } }, grantsOr] };
  case "coordinator":
    return { OR: [{ status: { in: ["in_production","live","wrap_up"] } }, grantsOr] };
}
```

Tests exercise each branch's shape (structural — assert `OR[0]` matches expected status list, `OR[1]` contains createdByUserId, etc.). CEO returns `{}`. `pnpm test:unit` stays green.

Commit `visibility.ts` + tests together.

---

## Task 3 — Apply `whereEventVisible` to every event query

**Files to touch:** `src/app/(dashboard)/{overview,events,calendar,proposals,rfqs,vendors,budgets,teams,reputation,market}/**` and `src/app/(dashboard)/layout.tsx` (the sidebar-count query).

Approach: grep for `db.event.find` / `db.event.count` / `prisma.event.` outside `src/lib/visibility.ts`, and for each occurrence:
1. Import `whereEventVisible`, `getSessionUser`.
2. Add `const me = await getSessionUser(); if (!me) redirect("/login");` at the top if not already present.
3. Wrap the existing `where` with `{ AND: [existing, whereEventVisible(me)] }`, or add `where: whereEventVisible(me)` when none exists.

Verification: `bash -c 'grep -rn "db.event\." src/app | grep -v "visibility.ts"'` — every hit should either already thread through visibility, OR be a create/update by id (not a list).

Commit — dashboard now visibility-scoped.

---

## Task 4 — Per-event "Grant access" drawer

**Files:**
- Create: `src/app/(dashboard)/events/[code]/AccessDrawer.tsx` (client)
- Create: `src/app/(dashboard)/events/[code]/access-actions.ts` (server)
- Modify: `src/app/(dashboard)/events/[code]/page.tsx` — insert `<AccessDrawer eventId={event.id} initialGrants={grants} candidateUsers={users} />` in the sidebar of the event brief, only if `can(user, "event.grant_access")`.

Server actions (`grantAccess`, `revokeAccess`) both:
- `requireRole(me, "ceo", "producer")` — throw is fine, drawer is only visible to those roles.
- For producer: additionally verify they can see the event (`can(me, "event.view", { event })`) — if not, throw.
- Write/delete an `EventUserAccess` row.
- `revalidatePath` for the event brief.

Drawer shows: current grantees (name + role + revoke button) + a picker to add a user. Users list = `db.user.findMany({ where: { active: true } })`. Add matching `view.settings.users` unused? no — reuse the existing user list.

Commit.

---

## Task 5 — "Seeing N of M events" chip on the Events list

**Files:**
- Modify: `src/app/(dashboard)/events/page.tsx`

Compute `mine = db.event.count({ where: whereEventVisible(me) })` and `total = db.event.count()`. Render `<Pill>Seeing {mine} of {total} · {roleLabel(me.role)} default</Pill>` at the top-right of the events list header. CEO sees `Seeing N of N · all`.

No new files. Commit.

---

## Task 6 — Friendly `/forbidden` page + swap remaining `requireRole` throws

**Files:**
- Create: `src/app/(dashboard)/forbidden/page.tsx`
- Modify: `src/lib/guard.ts` — `guardPage` redirects to `/forbidden` (not `/overview`) for authorized-but-wrong-role.
- Modify: `src/app/(dashboard)/settings/users/actions.ts` — swap `requireRole` throws for `assertOrForbidden` (new helper) that redirects.
- Modify: `src/app/accept-invite/[token]/actions.ts` and `src/app/(dashboard)/settings/users/actions.ts` — mutations still use `requireRole` (they're server actions, throws are fine there — the client sees an error), but page-level access uses `guardPage`.

`/forbidden` page: a plain page reading "You don't have access to that page. If you need it, ask the CEO to grant you access or add you to the event." with a link back to /overview.

Commit.

---

## Task 7 — Flip `LEGACY_AUTH` off + remove legacy path

**Files:**
- Modify: `src/lib/auth.ts` — delete the `LEGACY_AUTH === "on"` branch entirely.
- Modify: `.env.example` — drop `LEGACY_AUTH`, `AUTH_EMAIL`, `AUTH_PASSWORD`.
- Modify: `.env.local` (manual note — don't commit) — the user should also delete those.

Commit — legacy env-auth is gone.

---

## Task 8 — Final verify

- `pnpm typecheck` → 0 errors.
- `pnpm test:unit` → all green (should be ~24 tests now).
- `pnpm lint` → no new errors.
- Full role×page smoke script (same as Phase A audit) — every role hits `/events` and confirms the `Seeing N of M` chip reflects their scope:
  - CEO sees all 16 events.
  - Sales sees events in lead/proposed/confirmed + created + grants.
  - Producer sees in-delivery.
  - Coordinator sees only in-delivery + grants.
  - Finance sees events with budget > 0 + grants.
- Manual: as CEO, open one event brief, click "Grant access", add coordinator → sign in as coordinator → new event now visible.

Commit any tidying + close the phase.

---

## Deferred to Phase C

- `Task` table + `/tasks` page + task drawer on event brief.
- Task-assignment notifications (blocked on Notifications from Phase D).
