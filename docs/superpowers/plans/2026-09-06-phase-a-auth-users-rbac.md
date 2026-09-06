# Phase A — Auth + Users + RBAC Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-user env-cookie auth with real multi-user login backed by Postgres, five staff roles (CEO/Sales/Producer/Coordinator/Finance), and role-gated CTAs on every existing dashboard page. Keep the legacy env-auth path behind a `LEGACY_AUTH=on` flag so we can cut over safely.

**Architecture:** Auth.js v5 (`next-auth@5`) with `@auth/prisma-adapter`, JWT session strategy, Credentials provider for daily login (bcrypt), and Resend Email provider for invite + reset magic-links. New `src/lib/authz.ts` centralises `can(user, action)` and `requireRole()`. New `src/middleware.ts` guards `/(dashboard)/*` and `/settings/*`. One seeded CEO user (from env) bootstraps the system; everyone else is invite-only.

**Tech Stack:** Next.js 16 App Router · React 19 · Prisma 7 (pg adapter, Neon Postgres) · TypeScript strict · `next-auth@5` · `@auth/prisma-adapter` · `bcryptjs` · `resend` · `node:test` (Node 24 built-in) · Playwright (existing).

## Global Constraints

- Node runtime `>=24 <25` — no `runtime = "edge"` anywhere in this plan.
- pnpm `11.15.1` — every install command is `pnpm add`, never `npm`.
- Money still stored as **paise BigInt** — not touched by this phase but preserved everywhere it appears.
- All new tables `snake_case`; Prisma models `PascalCase` with `@@map(...)`; columns `@map("...")`.
- All FKs get a matching Prisma index.
- All new timestamp columns are `DateTime @db.Timestamptz(6)`.
- Role names in DB: lowercase (`ceo`, `sales`, `producer`, `coordinator`, `finance`). UI labels are title-case.
- Only `src/lib/authz.ts` may build `Prisma.EventWhereInput` for visibility (enforced in review; Phase B adds the ESLint rule).
- **Migration policy:** every schema change goes through a `prisma/migrations/YYYYMMDD_<name>/migration.sql` file **hand-checked before apply**. `prisma migrate deploy` is the only apply command, never `db push`.
- **Never commit** `.env.local` — only `.env.example`.
- Every commit message ends with `Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk`.
- **Test framework:** `node:test` for unit tests (no new dev dep); Playwright for the one integration flow.

---

## File Structure

**Create:**
- `src/lib/authz.ts` — role enum, `UserRole`, `can()`, `requireUser()`, `requireRole()`, permission matrix.
- `src/lib/authz.test.ts` — unit tests (one per matrix row).
- `src/lib/session.ts` — thin `getSessionUser()` that returns `{ id, email, name, role } | null` from the Auth.js session.
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler.
- `src/middleware.ts` — route guard.
- `src/app/(dashboard)/settings/layout.tsx` — sidebar for settings pages.
- `src/app/(dashboard)/settings/profile/page.tsx` — view/edit own name; change password.
- `src/app/(dashboard)/settings/users/page.tsx` — CEO-only user table + invite drawer.
- `src/app/(dashboard)/settings/users/actions.ts` — `inviteUser`, `deactivateUser`, `changeUserRole` server actions.
- `src/app/accept-invite/[token]/page.tsx` — set-password landing.
- `src/app/accept-invite/[token]/actions.ts` — `acceptInvite(token, password)`.
- `src/app/reset-password/page.tsx` — request reset (email input).
- `src/app/reset-password/[token]/page.tsx` — set new password from token.
- `prisma/migrations/20260906_add_users_rbac/migration.sql` — hand-written additive migration.
- `prisma/seed/seed-ceo.ts` — creates first CEO + backfills existing rows.
- `tests/e2e/auth-ceo.spec.ts` — Playwright: seeded CEO logs in, lands on `/overview`.

**Modify:**
- `prisma/schema.prisma` — add `UserRole` enum, `User`/`Account`/`VerificationToken` models, `TeamMember.userId?`, `Event.createdByUserId?`, `Rfq.createdByUserId?`.
- `src/lib/auth.ts` — rewrite: exports `auth()`, `signIn()`, `signOut()` from Auth.js v5. Legacy HMAC-cookie path preserved behind `LEGACY_AUTH === "on"`.
- `src/app/login/page.tsx` — use Auth.js `signIn()` via `<form action>` server action.
- `src/app/login/LoginForm.tsx` — same, updated fields.
- `src/app/login/actions.ts` — call Auth.js `signIn("credentials", …)`; delete the old HMAC verify path.
- `src/app/(dashboard)/layout.tsx` — sidebar filters by `can(user, "view.<page>")`; removes CEO/Manager lens toggle.
- Each existing page under `src/app/(dashboard)/*/page.tsx` — wrap mutating server actions with `requireRole(...)` and hide role-gated CTAs.
- `package.json` — add deps, add `test:unit` script, keep existing scripts intact.
- `.env.example` — add `AUTH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`, `RESEND_API_KEY`, `EMAIL_FROM`, `LEGACY_AUTH`, `NEXTAUTH_URL`.

**Boundary:** Auth-related code lives in `src/lib/auth.ts` (Auth.js wiring), `src/lib/authz.ts` (roles + can()), `src/lib/session.ts` (session getter). Nothing else in `src/` imports from `next-auth` directly.

---

## Task 1: Install deps + wire env stubs

**Files:**
- Modify: `package.json`, `.env.example`, `pnpm-lock.yaml` (regenerated)

**Interfaces:**
- Consumes: none
- Produces: `next-auth`, `@auth/prisma-adapter`, `bcryptjs`, `resend` importable in later tasks; new env vars documented.

- [ ] **Step 1: Add prod deps**

Run:
```bash
pnpm add next-auth@^5 @auth/prisma-adapter bcryptjs resend
pnpm add -D @types/bcryptjs
```
Expected: `pnpm-lock.yaml` updated; no version pinning warnings.

- [ ] **Step 2: Verify typecheck still passes**

Run: `pnpm typecheck`
Expected: exit 0 (no new type errors just from install).

- [ ] **Step 3: Update `.env.example`**

Replace the file contents with (keeping any existing non-auth vars intact — read the file first):

```env
# --- Database ---
DATABASE_URL="postgres://user:pass@host/db?sslmode=require&pgbouncer=true"
DIRECT_URL="postgres://user:pass@host/db?sslmode=require"

# --- Auth (Auth.js v5) ---
AUTH_SECRET=""              # generate: `openssl rand -base64 32`
NEXTAUTH_URL="http://localhost:3000"

# Legacy env-auth fallback — set to "on" to keep the old single-user path alive during cutover; "off" after Phase A ships.
LEGACY_AUTH="off"
AUTH_EMAIL=""               # legacy only, remove after LEGACY_AUTH=off
AUTH_PASSWORD=""            # legacy only, remove after LEGACY_AUTH=off

# Seeded first CEO (bootstrap only — password must be rotated after first login)
SEED_ADMIN_EMAIL=""
SEED_ADMIN_NAME=""
SEED_ADMIN_PASSWORD=""

# Email (Resend) — used for invite + password-reset magic links
RESEND_API_KEY=""
EMAIL_FROM="Eventbot <no-reply@example.com>"
```

- [ ] **Step 4: Add `test:unit` script to `package.json`**

Insert into `scripts` (after `test:smoke`):

```json
"test:unit": "node --test --experimental-strip-types src/lib/*.test.ts"
```

- [ ] **Step 5: Verify script works**

Run: `pnpm test:unit`
Expected: exits 0 with "tests: 0" (no test files yet — will fail-fast if the flag combo is wrong).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "$(cat <<'EOF'
Install Auth.js v5 + Resend + bcryptjs for Phase A

Adds next-auth@5, @auth/prisma-adapter, bcryptjs, and resend. Documents
the new required env vars (AUTH_SECRET, SEED_ADMIN_*, RESEND_API_KEY,
EMAIL_FROM) plus the LEGACY_AUTH cutover flag in .env.example. Wires a
test:unit script backed by node:test so we do not take a new dev dep for
the permission-matrix suite.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 2: Extend Prisma schema (User, Account, VerificationToken, FKs)

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consumes: existing `Event`, `Rfq`, `TeamMember` models.
- Produces: `prisma.user`, `prisma.account`, `prisma.verificationToken`, and `User.role: UserRole` typed everywhere the client is imported. `Event.createdByUserId?: number`, `Rfq.createdByUserId?: number`, `TeamMember.userId?: number` added.

- [ ] **Step 1: Add the `UserRole` enum**

After the existing `QuoteStatus` enum, insert:

```prisma
enum UserRole {
  ceo
  sales
  producer
  coordinator
  finance
  @@map("user_role")
}
```

- [ ] **Step 2: Add `User`, `Account`, `VerificationToken` models**

At the end of the file, append:

```prisma
// ================= AUTH =================

model User {
  id              Int       @id @default(autoincrement())
  email           String    @unique
  name            String
  passwordHash    String?   @map("password_hash")
  role            UserRole
  active          Boolean   @default(true)
  invitedByUserId Int?      @map("invited_by_user_id")
  invitedAt       DateTime? @map("invited_at") @db.Timestamptz(6)
  acceptedAt      DateTime? @map("accepted_at") @db.Timestamptz(6)
  lastLoginAt     DateTime? @map("last_login_at") @db.Timestamptz(6)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  invitedBy       User?     @relation("Invites", fields: [invitedByUserId], references: [id])
  invitees        User[]    @relation("Invites")
  accounts        Account[]
  teamMember      TeamMember?
  eventsCreated   Event[]   @relation("EventCreatedBy")
  rfqsCreated     Rfq[]     @relation("RfqCreatedBy")

  @@index([role], name: "users_role_idx")
  @@map("users")
}

model Account {
  id                Int     @id @default(autoincrement())
  userId            Int     @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId], name: "accounts_user_idx")
  @@map("accounts")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime @db.Timestamptz(6)

  @@id([identifier, token])
  @@map("verification_tokens")
}
```

- [ ] **Step 3: Add optional FK columns + relations to existing models**

In `model TeamMember`, add before the closing `}`:
```prisma
  userId  Int?  @unique @map("user_id")
  user    User? @relation(fields: [userId], references: [id], onDelete: SetNull)
```

In `model Event`, add before the closing `}`:
```prisma
  createdByUserId Int?  @map("created_by_user_id")
  createdBy       User? @relation("EventCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
```
Then add `@@index([createdByUserId], name: "events_created_by_idx")` just before `@@map("events")`.

In `model Rfq`, add before the closing `}`:
```prisma
  createdByUserId Int?  @map("created_by_user_id")
  createdByUser   User? @relation("RfqCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
```
Then add `@@index([createdByUserId], name: "rfqs_created_by_user_idx")` just before `@@map("rfqs")`. Keep the existing `createdBy String?` column in place — we drop it in a follow-up migration after backfill validates.

- [ ] **Step 4: Regenerate Prisma client**

Run: `pnpm db:generate`
Expected: `prisma generated ✔` — no schema errors.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0. `prisma.user` and friends are now typed.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "$(cat <<'EOF'
Add User/Account/VerificationToken models and staff role enum

Introduces UserRole (ceo/sales/producer/coordinator/finance) plus the
three tables Auth.js v5 requires (users, accounts, verification_tokens).
Adds optional FK columns to team_members, events, and rfqs so we can
link roster rows and audit createdBy; the legacy rfqs.created_by string
column stays for one release before being dropped.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 3: Write the SQL migration file

**Files:**
- Create: `prisma/migrations/20260906_add_users_rbac/migration.sql`

**Interfaces:**
- Consumes: schema from Task 2.
- Produces: `users`, `accounts`, `verification_tokens` tables in Postgres, plus new columns on `events`, `rfqs`, `team_members`.

- [ ] **Step 1: Write the migration**

Create `prisma/migrations/20260906_add_users_rbac/migration.sql` with:

```sql
-- ==================== ENUM ====================
CREATE TYPE user_role AS ENUM ('ceo', 'sales', 'producer', 'coordinator', 'finance');

-- ==================== USERS ====================
CREATE TABLE users (
  id                    SERIAL PRIMARY KEY,
  email                 TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  password_hash         TEXT,
  role                  user_role NOT NULL,
  active                BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by_user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  invited_at            TIMESTAMPTZ(6),
  accepted_at           TIMESTAMPTZ(6),
  last_login_at         TIMESTAMPTZ(6),
  created_at            TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX users_role_idx ON users (role);

-- ==================== ACCOUNTS (Auth.js) ====================
CREATE TABLE accounts (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                    TEXT NOT NULL,
  provider                TEXT NOT NULL,
  provider_account_id     TEXT NOT NULL,
  refresh_token           TEXT,
  access_token            TEXT,
  expires_at              INTEGER,
  token_type              TEXT,
  scope                   TEXT,
  id_token                TEXT,
  session_state           TEXT,
  UNIQUE (provider, provider_account_id)
);
CREATE INDEX accounts_user_idx ON accounts (user_id);

-- ==================== VERIFICATION TOKENS (Auth.js) ====================
CREATE TABLE verification_tokens (
  identifier  TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  expires     TIMESTAMPTZ(6) NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ==================== EXISTING TABLE PATCHES ====================
ALTER TABLE team_members
  ADD COLUMN user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE events
  ADD COLUMN created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX events_created_by_idx ON events (created_by_user_id);

ALTER TABLE rfqs
  ADD COLUMN created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX rfqs_created_by_user_idx ON rfqs (created_by_user_id);
```

- [ ] **Step 2: Apply to a Neon branch (dev)**

Create a Neon branch from the current dev DB before applying:
```bash
# In Neon console: create branch "phase-a-migration" from main.
# Update .env.local's DATABASE_URL to point at the branch.
pnpm prisma migrate deploy
```
Expected: `Applying migration `20260906_add_users_rbac`` and no errors.

- [ ] **Step 3: Verify schema in psql**

```bash
psql "$DATABASE_URL" -c "\d users"
psql "$DATABASE_URL" -c "\d events" | grep created_by_user_id
psql "$DATABASE_URL" -c "\dT+ user_role"
```
Expected: `users` shows all columns and indices; `events` shows `created_by_user_id integer`; the `user_role` enum lists all five values.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/20260906_add_users_rbac/migration.sql
git commit -m "$(cat <<'EOF'
Add hand-written migration for users/accounts/verification_tokens

Additive-only: three new tables plus optional FK columns on
team_members, events, and rfqs. Safe to apply against a Neon branch;
rollback = keep code on LEGACY_AUTH and drop the branch. Every FK is
ON DELETE SET NULL so user removal never cascades into historical
domain rows.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 4: Seed the initial CEO + backfill existing rows

**Files:**
- Create: `prisma/seed/seed-ceo.ts`
- Modify: `package.json` (add `db:seed:ceo` script)

**Interfaces:**
- Consumes: env `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`.
- Produces: exactly one `users` row with `role='ceo'`; `events.created_by_user_id` and `rfqs.created_by_user_id` backfilled to that user's id.

- [ ] **Step 1: Write the seed script**

Create `prisma/seed/seed-ceo.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.SEED_ADMIN_NAME?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !name || !password) {
    throw new Error("SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD are required.");
  }
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");

  const passwordHash = await bcrypt.hash(password, 12);

  const ceo = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      role: "ceo",
      active: true,
      acceptedAt: new Date(),
    },
    update: {}, // never overwrite an existing CEO
  });

  const eventsUpdated = await prisma.event.updateMany({
    where: { createdByUserId: null },
    data: { createdByUserId: ceo.id },
  });

  const rfqsUpdated = await prisma.rfq.updateMany({
    where: { createdByUserId: null },
    data: { createdByUserId: ceo.id },
  });

  console.log(`✔ CEO user id=${ceo.id} ready`);
  console.log(`✔ Backfilled ${eventsUpdated.count} events, ${rfqsUpdated.count} rfqs`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add script**

Insert into `package.json > scripts`:
```json
"db:seed:ceo": "node --experimental-strip-types prisma/seed/seed-ceo.ts"
```

- [ ] **Step 3: Run on the migration branch**

```bash
pnpm db:seed:ceo
```
Expected: `✔ CEO user id=1 ready` and non-zero backfill counts (assuming existing events/rfqs are present).

- [ ] **Step 4: Verify in psql**

```bash
psql "$DATABASE_URL" -c "SELECT id, email, role, active FROM users;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM events WHERE created_by_user_id IS NULL;"
```
Expected: one CEO row; second query returns `0`.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed/seed-ceo.ts package.json
git commit -m "$(cat <<'EOF'
Seed initial CEO user and backfill createdByUserId

Reads SEED_ADMIN_EMAIL/NAME/PASSWORD from env, upserts a single CEO row
(never overwrites), bcrypt-hashes the password at cost 12, and
backfills events.created_by_user_id and rfqs.created_by_user_id for
every existing row. Idempotent — safe to re-run.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 5: Build `src/lib/authz.ts` (roles + permission switch)

**Files:**
- Create: `src/lib/authz.ts`

**Interfaces:**
- Consumes: `@prisma/client` `UserRole`.
- Produces:
  - `type SessionUser = { id: number; email: string; name: string; role: UserRole }`
  - `function can(user: SessionUser, action: Action, resource?: { event?: { status: EventStatus; createdByUserId?: number | null } }): boolean`
  - `function requireRole(user: SessionUser | null, ...allowed: UserRole[]): asserts user is SessionUser`
  - `type Action` — the string-literal union of every permission key.

- [ ] **Step 1: Write the module**

Create `src/lib/authz.ts`:

```ts
import { UserRole, EventStatus } from "@prisma/client";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
};

export type Action =
  | "event.create"
  | "event.edit_brief"
  | "event.move_status.lead_to_confirmed"
  | "event.move_status.confirmed_to_completed"
  | "event.grant_access"
  | "budget.line.create"
  | "budget.line.edit"
  | "budget.approve"
  | "vendor.create"
  | "vendor.edit"
  | "rfq.create"
  | "rfq.send"
  | "rfq.award"
  | "task.create"
  | "task.edit"
  | "task.assign"
  | "comment.post"
  | "user.invite"
  | "user.deactivate"
  | "user.change_role"
  | "audit.view.all"
  | "audit.view.finance"
  | "view.overview"
  | "view.events"
  | "view.calendar"
  | "view.tasks"
  | "view.rfqs"
  | "view.vendors"
  | "view.budgets"
  | "view.teams"
  | "view.reputation"
  | "view.market"
  | "view.settings.users"
  | "view.settings.audit";

type Resource = { event?: { status: EventStatus; createdByUserId?: number | null } };

export function can(user: SessionUser, action: Action, resource?: Resource): boolean {
  const r = user.role;
  switch (action) {
    // ---------- Events ----------
    case "event.create":
      return r === "ceo" || r === "sales" || r === "producer";
    case "event.edit_brief": {
      if (r === "ceo" || r === "producer") return true;
      if (r === "sales") {
        const s = resource?.event?.status;
        return s === "lead" || s === "proposed";
      }
      return false;
    }
    case "event.move_status.lead_to_confirmed":
      return r === "ceo" || r === "sales";
    case "event.move_status.confirmed_to_completed":
      return r === "ceo" || r === "producer";
    case "event.grant_access":
      return r === "ceo" || r === "producer";

    // ---------- Budgets ----------
    case "budget.line.create":
    case "budget.line.edit":
      return r === "ceo" || r === "producer" || r === "finance";
    case "budget.approve":
      return r === "ceo" || r === "finance";

    // ---------- Vendors / RFQs ----------
    case "vendor.create":
    case "vendor.edit":
    case "rfq.create":
    case "rfq.send":
    case "rfq.award":
      return r === "ceo" || r === "producer";

    // ---------- Tasks / comments (everyone; scoped by event visibility later) ----------
    case "task.create":
    case "task.edit":
    case "task.assign":
    case "comment.post":
      return true;

    // ---------- User mgmt / audit ----------
    case "user.invite":
    case "user.deactivate":
    case "user.change_role":
    case "audit.view.all":
      return r === "ceo";
    case "audit.view.finance":
      return r === "ceo" || r === "finance";

    // ---------- Sidebar/page visibility ----------
    case "view.overview":
    case "view.events":
    case "view.calendar":
    case "view.tasks":
      return true;
    case "view.rfqs":
    case "view.vendors":
    case "view.teams":
      return r === "ceo" || r === "producer";
    case "view.budgets":
      return r === "ceo" || r === "producer" || r === "finance";
    case "view.reputation":
    case "view.market":
      return r === "ceo" || r === "sales";
    case "view.settings.users":
      return r === "ceo";
    case "view.settings.audit":
      return r === "ceo" || r === "finance";
  }
}

export function requireRole(
  user: SessionUser | null,
  ...allowed: UserRole[]
): asserts user is SessionUser {
  if (!user) throw new Error("UNAUTHORIZED");
  if (allowed.length && !allowed.includes(user.role)) throw new Error("FORBIDDEN");
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/authz.ts
git commit -m "$(cat <<'EOF'
Add central authz module with role enum, can(), and requireRole()

Introduces src/lib/authz.ts as the single source of truth for the
permission matrix (§4 of the design doc). One switch keyed by Action.
No other file in src/ is allowed to duplicate role checks — call can()
or requireRole() instead. Tests come next.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 6: Unit tests for `authz.ts` (one per matrix row)

**Files:**
- Create: `src/lib/authz.test.ts`

**Interfaces:**
- Consumes: `can()`, `requireRole()`, `SessionUser` from Task 5.
- Produces: `pnpm test:unit` passes with N tests.

- [ ] **Step 1: Write the test file**

Create `src/lib/authz.test.ts`:

```ts
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { can, requireRole, type SessionUser } from "./authz.ts";

const roles = ["ceo", "sales", "producer", "coordinator", "finance"] as const;
const u = (role: (typeof roles)[number]): SessionUser => ({
  id: 1, email: `${role}@ex.co`, name: role, role,
});

describe("can(user, action)", () => {
  test("event.create: ceo/sales/producer allowed", () => {
    assert.equal(can(u("ceo"), "event.create"), true);
    assert.equal(can(u("sales"), "event.create"), true);
    assert.equal(can(u("producer"), "event.create"), true);
    assert.equal(can(u("coordinator"), "event.create"), false);
    assert.equal(can(u("finance"), "event.create"), false);
  });

  test("event.edit_brief: sales limited to lead/proposed", () => {
    assert.equal(can(u("sales"), "event.edit_brief", { event: { status: "lead" } }), true);
    assert.equal(can(u("sales"), "event.edit_brief", { event: { status: "proposed" } }), true);
    assert.equal(can(u("sales"), "event.edit_brief", { event: { status: "confirmed" } }), false);
    assert.equal(can(u("producer"), "event.edit_brief", { event: { status: "in_production" } }), true);
  });

  test("budget.approve: ceo + finance only", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "budget.approve"), r === "ceo" || r === "finance");
    }
  });

  test("rfq.award: ceo + producer only", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "rfq.award"), r === "ceo" || r === "producer");
    }
  });

  test("user.invite: ceo only", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "user.invite"), r === "ceo");
    }
  });

  test("audit.view.all: ceo only; audit.view.finance: ceo + finance", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "audit.view.all"), r === "ceo");
      assert.equal(can(u(r), "audit.view.finance"), r === "ceo" || r === "finance");
    }
  });

  test("view.settings.users: ceo only", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "view.settings.users"), r === "ceo");
    }
  });

  test("view.budgets: ceo + producer + finance", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "view.budgets"), r === "ceo" || r === "producer" || r === "finance");
    }
  });

  test("view.reputation / view.market: ceo + sales", () => {
    for (const r of roles) {
      const expect = r === "ceo" || r === "sales";
      assert.equal(can(u(r), "view.reputation"), expect);
      assert.equal(can(u(r), "view.market"), expect);
    }
  });
});

describe("requireRole", () => {
  test("throws UNAUTHORIZED on null user", () => {
    assert.throws(() => requireRole(null, "ceo"), /UNAUTHORIZED/);
  });
  test("throws FORBIDDEN on wrong role", () => {
    assert.throws(() => requireRole(u("sales"), "ceo"), /FORBIDDEN/);
  });
  test("passes for allowed role", () => {
    assert.doesNotThrow(() => requireRole(u("ceo"), "ceo"));
  });
  test("no allowed list = any authenticated user OK", () => {
    assert.doesNotThrow(() => requireRole(u("coordinator")));
  });
});
```

- [ ] **Step 2: Run tests**

Run: `pnpm test:unit`
Expected: all tests pass (~12 tests, all green).

- [ ] **Step 3: Commit**

```bash
git add src/lib/authz.test.ts
git commit -m "$(cat <<'EOF'
Add unit tests covering every row of the permission matrix

Uses node:test (Node 24 built-in) so no dev dep. Any future change to
the matrix must be paired with a matching test change — that is the
enforcement mechanism.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 7: Rewrite `src/lib/auth.ts` — Auth.js v5 wiring

**Files:**
- Modify: `src/lib/auth.ts` (full rewrite)
- Create: `src/lib/session.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

**Interfaces:**
- Consumes: `SessionUser` type from `authz.ts`.
- Produces:
  - `export const { auth, handlers, signIn, signOut }` from `src/lib/auth.ts`.
  - `export async function getSessionUser(): Promise<SessionUser | null>` from `src/lib/session.ts`.
  - Route handlers at `GET|POST /api/auth/*`.

- [ ] **Step 1: Rewrite `src/lib/auth.ts`**

Replace the whole file with:

```ts
import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";

const SESSION_MAX_AGE = 60 * 60 * 12; // 12h idle

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET must be set to a 32+ character string.");
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active || !user.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    Resend({
      from: process.env.EMAIL_FROM!,
      apiKey: process.env.RESEND_API_KEY!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = String((user as { id: string }).id);
        token.role = (user as { role: UserRole }).role;
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = String(token.sub);
        (session.user as { role: UserRole }).role = token.role as UserRole;
      }
      return session;
    },
  },
});

// Legacy HMAC cookie path, gated behind LEGACY_AUTH=on for one cutover release.
export async function legacyAuthActive(): Promise<boolean> {
  return process.env.LEGACY_AUTH === "on";
}
```

- [ ] **Step 2: Add `src/lib/session.ts`**

```ts
import "server-only";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/authz";
import type { UserRole } from "@prisma/client";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user as { id?: string; email?: string; name?: string; role?: UserRole } | undefined;
  if (!u?.id || !u.email || !u.role) return null;
  return {
    id: Number(u.id),
    email: u.email,
    name: u.name ?? u.email,
    role: u.role,
  };
}
```

- [ ] **Step 3: Add the route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: Typecheck + start dev**

Run: `pnpm typecheck`
Expected: exit 0.

Run (foreground for 10s, then Ctrl-C):
```bash
AUTH_SECRET="$(openssl rand -base64 32)" pnpm dev
```
Expected: server starts, no import errors mentioning `next-auth` or `@auth/prisma-adapter`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/session.ts src/app/api/auth/[...nextauth]/route.ts
git commit -m "$(cat <<'EOF'
Wire Auth.js v5 with Prisma adapter + Credentials + Resend

Rewrites src/lib/auth.ts around next-auth@5: JWT session (12h idle),
Credentials provider using bcrypt against users.password_hash, and
Resend provider for magic-link invites and password reset. Session
callback puts role on the token so middleware can read it without a
DB hit. Legacy HMAC path stubbed for LEGACY_AUTH=on until cutover.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 8: Add `src/middleware.ts` — route guard

**Files:**
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: `auth` from `src/lib/auth.ts`.
- Produces: any unauthenticated hit on `/(dashboard)/*`, `/settings/*`, `/api/(protected)/*` → 302 to `/login?returnTo=<path>`.

- [ ] **Step 1: Write the middleware**

Create `src/middleware.ts`:

```ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC = [
  /^\/login/,
  /^\/accept-invite/,
  /^\/reset-password/,
  /^\/api\/auth/,
  /^\/api\/health/,
  /^\/_next/,
  /^\/favicon\.ico/,
  /^\/apple-icon/,
  /^\/icon/,
];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();
  if (!req.auth) {
    const url = new URL("/login", req.url);
    url.searchParams.set("returnTo", `${pathname}${search || ""}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  // Everything except public assets — the PUBLIC list above is the fine-grained gate.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Manual smoke**

Start dev server, then in a browser:
- `http://localhost:3000/overview` → redirects to `/login?returnTo=%2Foverview`. ✅
- `http://localhost:3000/login` → renders. ✅
- `http://localhost:3000/api/health` → responds without redirect. ✅

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "$(cat <<'EOF'
Add middleware guard redirecting unauthed hits to /login

Uses Auth.js v5's auth() middleware wrapper. Public routes (/login,
/accept-invite, /reset-password, /api/auth, /api/health, static assets)
skip the check; every other request lands on /login?returnTo= if the
JWT is absent or invalid.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 9: Rewire the existing `/login` page to use Auth.js

**Files:**
- Modify: `src/app/login/actions.ts`, `src/app/login/LoginForm.tsx`, `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `signIn` from `src/lib/auth.ts`.
- Produces: valid POST → session cookie set → redirect to `returnTo` or `/overview`.

- [ ] **Step 1: Rewrite `src/app/login/actions.ts`**

Replace the file with:

```ts
"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type LoginState = { error: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/overview");
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/overview";
  try {
    await signIn("credentials", { email, password, redirectTo: safeReturnTo });
    return { error: "" };
  } catch (e) {
    if (e instanceof AuthError && e.type === "CredentialsSignin") {
      return { error: "Invalid email address or password." };
    }
    throw e;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
```

- [ ] **Step 2: Read the existing form and make minimal changes**

Read `src/app/login/LoginForm.tsx`. Keep the visual layout. Only ensure:
- The `<form>` calls the `login` server action.
- Inputs are `name="email"`, `name="password"`, and a hidden `name="returnTo"` populated from `searchParams`.

If the current file already matches, skip. Otherwise edit accordingly (the file is < 100 lines — a targeted Edit is fine).

- [ ] **Step 3: Manual smoke — CEO login**

With Neon branch DB pointed at by `.env.local` and CEO seeded (Task 4):
```bash
pnpm dev
```
- Visit `http://localhost:3000/overview` → redirects to `/login`.
- Enter CEO email + password → lands on `/overview`.
- `document.cookie` shows an `authjs.session-token`.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/actions.ts src/app/login/LoginForm.tsx src/app/login/page.tsx
git commit -m "$(cat <<'EOF'
Rewire /login server action to use Auth.js signIn()

Replaces the HMAC-cookie verifyCredentials/createSession pair with
Auth.js's Credentials sign-in. Preserves the returnTo query behavior
with the same safe-URL check. logout() now goes through signOut().

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 10: `/settings/profile` — view + change password

**Files:**
- Create: `src/app/(dashboard)/settings/layout.tsx`
- Create: `src/app/(dashboard)/settings/profile/page.tsx`
- Create: `src/app/(dashboard)/settings/profile/actions.ts`

**Interfaces:**
- Consumes: `getSessionUser` (Task 7), `prisma` client, `bcryptjs`.
- Produces: server actions `updateProfileName(formData)`, `changePassword(formData)`.

- [ ] **Step 1: Create the settings layout**

`src/app/(dashboard)/settings/layout.tsx`:

```tsx
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { can } from "@/lib/authz";
import { redirect } from "next/navigation";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?returnTo=/settings/profile");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <div className="grid grid-cols-[180px_1fr] gap-8">
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/settings/profile" className="px-2 py-1 rounded hover:bg-slate-100">Profile</Link>
          {can(user, "view.settings.users") && (
            <Link href="/settings/users" className="px-2 py-1 rounded hover:bg-slate-100">Users</Link>
          )}
          {can(user, "view.settings.audit") && (
            <Link href="/settings/audit" className="px-2 py-1 rounded hover:bg-slate-100">Audit log</Link>
          )}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Actions**

`src/app/(dashboard)/settings/profile/actions.ts`:

```ts
"use server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function updateProfileName(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated." };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Name must be at least 2 characters." };
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/settings/profile");
  return { ok: true };
}

export async function changePassword(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated." };
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 12) return { error: "New password must be at least 12 characters." };
  if (!/\d/.test(next) || !/[^\w\s]/.test(next)) return { error: "Include at least one number and one symbol." };

  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row?.passwordHash) return { error: "Account has no password set." };
  const ok = await bcrypt.compare(current, row.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(next, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true };
}
```

- [ ] **Step 3: Page**

`src/app/(dashboard)/settings/profile/page.tsx`:

```tsx
import { getSessionUser } from "@/lib/session";
import { updateProfileName, changePassword } from "./actions";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) return null;
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium mb-4">Profile</h2>
        <form action={updateProfileName} className="space-y-3">
          <label className="block text-sm">Email <input value={user.email} disabled className="mt-1 w-full rounded border px-3 py-2 bg-slate-50" /></label>
          <label className="block text-sm">Name <input name="name" defaultValue={user.name} required minLength={2} className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="block text-sm">Role <input value={user.role} disabled className="mt-1 w-full rounded border px-3 py-2 bg-slate-50" /></label>
          <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm">Save name</button>
        </form>
      </section>
      <section>
        <h2 className="text-lg font-medium mb-4">Change password</h2>
        <form action={changePassword} className="space-y-3 max-w-sm">
          <label className="block text-sm">Current password <input name="current" type="password" required className="mt-1 w-full rounded border px-3 py-2" /></label>
          <label className="block text-sm">New password (min 12, at least 1 number + 1 symbol) <input name="next" type="password" required minLength={12} className="mt-1 w-full rounded border px-3 py-2" /></label>
          <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm">Update password</button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Manual smoke**

- Log in as CEO → visit `/settings/profile` → edit name → save → refresh → name persists.
- Change password → log out → log back in with new password.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/settings"
git commit -m "$(cat <<'EOF'
Add /settings/profile with change-name and change-password flows

Simple two-form page. Password rule: min 12 chars, one number, one
symbol; bcrypt cost 12. Settings layout also filters sidebar entries
(Users, Audit log) by can() so non-CEO staff cannot see they exist.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 11: `/settings/users` — CEO-only user table + invite flow

**Files:**
- Create: `src/app/(dashboard)/settings/users/page.tsx`
- Create: `src/app/(dashboard)/settings/users/actions.ts`
- Create: `src/app/(dashboard)/settings/users/InviteDrawer.tsx`

**Interfaces:**
- Consumes: `prisma`, `getSessionUser`, `requireRole`.
- Produces: server actions `inviteUser({email, name, role})`, `deactivateUser(id)`, `reactivateUser(id)`, `changeUserRole(id, role)`.

- [ ] **Step 1: Actions**

`src/app/(dashboard)/settings/users/actions.ts`:

```ts
"use server";
import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import type { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

const resend = new Resend(process.env.RESEND_API_KEY);

function inviteUrl(token: string) {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/accept-invite/${token}`;
}

export async function inviteUser(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const user = await getSessionUser();
  requireRole(user, "ceo");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Invalid email." };
  if (name.length < 2) return { error: "Name required." };
  if (!["ceo","sales","producer","coordinator","finance"].includes(role)) return { error: "Invalid role." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with that email already exists." };

  const created = await prisma.user.create({
    data: { email, name, role, invitedByUserId: user.id, invitedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "You're invited to Eventbot",
    html: `<p>Hi ${name},</p><p>${user.name} invited you to Eventbot as <b>${role}</b>. Click below to set your password (link valid 24h):</p><p><a href="${inviteUrl(token)}">${inviteUrl(token)}</a></p>`,
  });

  revalidatePath("/settings/users");
  return { ok: true };
}

export async function deactivateUser(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  requireRole(user, "ceo");
  const id = Number(formData.get("id"));
  if (id === user.id) throw new Error("Cannot deactivate yourself.");
  await prisma.user.update({ where: { id }, data: { active: false } });
  revalidatePath("/settings/users");
}

export async function reactivateUser(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  requireRole(user, "ceo");
  const id = Number(formData.get("id"));
  await prisma.user.update({ where: { id }, data: { active: true } });
  revalidatePath("/settings/users");
}

export async function changeUserRole(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  requireRole(user, "ceo");
  const id = Number(formData.get("id"));
  const role = String(formData.get("role")) as UserRole;
  if (id === user.id && role !== "ceo") throw new Error("Cannot demote yourself.");
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/settings/users");
}
```

- [ ] **Step 2: Page**

`src/app/(dashboard)/settings/users/page.tsx`:

```tsx
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { InviteDrawer } from "./InviteDrawer";
import { deactivateUser, reactivateUser, changeUserRole } from "./actions";

export default async function UsersPage() {
  const me = await getSessionUser();
  requireRole(me, "ceo");
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Users</h2>
        <InviteDrawer />
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="py-2">{u.name}</td>
              <td>{u.email}</td>
              <td>
                <form action={changeUserRole} className="inline">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="rounded border px-2 py-1">
                    {["ceo","sales","producer","coordinator","finance"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </form>
              </td>
              <td>{u.active ? "Active" : "Inactive"}{!u.acceptedAt && u.invitedAt ? " · invited" : ""}</td>
              <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}</td>
              <td className="text-right">
                {u.active ? (
                  <form action={deactivateUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className="text-red-600 text-xs">Deactivate</button>
                  </form>
                ) : (
                  <form action={reactivateUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className="text-slate-700 text-xs">Reactivate</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Invite drawer (client component)**

`src/app/(dashboard)/settings/users/InviteDrawer.tsx`:

```tsx
"use client";
import { useState } from "react";
import { inviteUser } from "./actions";

export function InviteDrawer() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm">Invite user</button>
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Invite user</h3>
            <form
              action={async (fd) => {
                const res = await inviteUser(fd);
                if (res?.error) setError(res.error);
                else setOpen(false);
              }}
              className="space-y-3"
            >
              <label className="block text-sm">Email <input name="email" type="email" required className="mt-1 w-full rounded border px-3 py-2" /></label>
              <label className="block text-sm">Name <input name="name" required minLength={2} className="mt-1 w-full rounded border px-3 py-2" /></label>
              <label className="block text-sm">Role
                <select name="role" required defaultValue="coordinator" className="mt-1 w-full rounded border px-3 py-2">
                  <option value="sales">Sales</option>
                  <option value="producer">Producer</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="finance">Finance</option>
                  <option value="ceo">CEO / Owner</option>
                </select>
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="text-sm">Cancel</button>
                <button className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm">Send invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Manual smoke**

- CEO visits `/settings/users` → sees themselves.
- Non-CEO visits `/settings/users` → throws FORBIDDEN (500 page for now; better UX in a later phase).
- CEO invites a fake email → row appears, "invited" tag shows.
- Change a user's role via the dropdown → re-fetch reflects change.
- Deactivate self → error.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/settings/users"
git commit -m "$(cat <<'EOF'
Add CEO-only /settings/users with invite/deactivate/change-role

Server actions gated by requireRole('ceo'). Invite creates the User
row with passwordHash=null + a 24h VerificationToken and dispatches
an email via Resend containing the /accept-invite/[token] URL. Cannot
deactivate self or demote self away from ceo.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 12: Accept-invite page — set password

**Files:**
- Create: `src/app/accept-invite/[token]/page.tsx`
- Create: `src/app/accept-invite/[token]/actions.ts`

**Interfaces:**
- Consumes: `prisma`, `bcryptjs`, `signIn`.
- Produces: `acceptInvite(token, password) → sets passwordHash, marks acceptedAt, deletes VerificationToken, calls signIn credentials, redirects to /overview`.

- [ ] **Step 1: Actions**

`src/app/accept-invite/[token]/actions.ts`:

```ts
"use server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";

export async function acceptInvite(formData: FormData): Promise<{ error?: string }> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 12 || !/\d/.test(password) || !/[^\w\s]/.test(password)) {
    return { error: "Password must be 12+ chars with a number and a symbol." };
  }
  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.expires < new Date()) return { error: "This invite has expired." };

  const user = await prisma.user.findUnique({ where: { email: row.identifier } });
  if (!user) return { error: "Invite target user missing." };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, acceptedAt: new Date() } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  await signIn("credentials", { email: user.email, password, redirectTo: "/overview" });
  return {};
}
```

- [ ] **Step 2: Page**

`src/app/accept-invite/[token]/page.tsx`:

```tsx
import { acceptInvite } from "./actions";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold mb-4">Set your password</h1>
      <form action={acceptInvite} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <label className="block text-sm">New password
          <input name="password" type="password" required minLength={12} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <p className="text-xs text-slate-500">Min 12 chars, at least one number and one symbol.</p>
        <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm">Set password &amp; sign in</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke**

- Invite a test user → open the emailed URL (or grab the `token` from `verification_tokens`) → set password → auto-lands on `/overview`.
- Try the same URL twice → second attempt shows "invite has expired."

- [ ] **Step 4: Commit**

```bash
git add src/app/accept-invite
git commit -m "$(cat <<'EOF'
Add /accept-invite/[token] page for first-time password set

Validates the VerificationToken, bcrypt-hashes the new password,
transactionally updates the user + deletes the token, then signs the
user in via Auth.js Credentials so they land on /overview already
authenticated. Password rule matches /settings/profile.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 13: Password-reset flow

**Files:**
- Create: `src/app/reset-password/page.tsx`
- Create: `src/app/reset-password/[token]/page.tsx`
- Create: `src/app/reset-password/actions.ts`

**Interfaces:**
- Consumes: `prisma`, `bcryptjs`, Resend.
- Produces: `requestReset(email)` and `resetPassword(token, password)` server actions.

- [ ] **Step 1: Actions**

`src/app/reset-password/actions.ts`:

```ts
"use server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { prisma } from "@/lib/db";

const resend = new Resend(process.env.RESEND_API_KEY);
function resetUrl(token: string) {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/reset-password/${token}`;
}

export async function requestReset(formData: FormData): Promise<{ ok: true }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return ok — do not leak whether the email exists.
  if (user && user.active) {
    const token = randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: "Reset your Eventbot password",
      html: `<p>Click below to reset your password (valid 60 min):</p><p><a href="${resetUrl(token)}">${resetUrl(token)}</a></p>`,
    });
  }
  return { ok: true };
}

export async function resetPassword(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 12 || !/\d/.test(password) || !/[^\w\s]/.test(password)) {
    return { error: "Password must be 12+ chars with a number and a symbol." };
  }
  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.expires < new Date()) return { error: "Reset link expired." };
  const user = await prisma.user.findUnique({ where: { email: row.identifier } });
  if (!user) return { error: "User not found." };
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);
  return { ok: true };
}
```

- [ ] **Step 2: Pages**

`src/app/reset-password/page.tsx`:

```tsx
import { requestReset } from "./actions";

export default function ResetRequestPage() {
  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold mb-4">Reset password</h1>
      <p className="text-sm text-slate-600 mb-4">Enter your email — if an account exists, we'll send a reset link.</p>
      <form action={requestReset} className="space-y-3">
        <input name="email" type="email" required className="w-full rounded border px-3 py-2" placeholder="you@company.com" />
        <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm">Send reset link</button>
      </form>
    </div>
  );
}
```

`src/app/reset-password/[token]/page.tsx`:

```tsx
import { resetPassword } from "../actions";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold mb-4">Choose a new password</h1>
      <form action={resetPassword} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <input name="password" type="password" required minLength={12} className="w-full rounded border px-3 py-2" placeholder="New password" />
        <p className="text-xs text-slate-500">Min 12 chars, one number, one symbol.</p>
        <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm">Update password</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke**

- `/reset-password` → submit unknown email → still returns OK (no leak).
- Submit CEO email → check inbox → click link → set new password → log in with it.

- [ ] **Step 4: Commit**

```bash
git add src/app/reset-password
git commit -m "$(cat <<'EOF'
Add password-reset request + landing pages via Resend magic links

/reset-password issues a 60-minute VerificationToken and emails the
link — response is always OK to avoid account enumeration.
/reset-password/[token] validates + bcrypt-updates. Same password
policy as invite acceptance and /settings/profile.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 14: Retrofit role gates on existing dashboard pages

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/(dashboard)/overview/page.tsx`, `events/page.tsx`, `calendar/page.tsx`, `rfqs/page.tsx`, `vendors/page.tsx`, `budgets/page.tsx`, `teams/page.tsx`, `reputation/page.tsx`, `market/page.tsx`, `proposals/page.tsx`

**Interfaces:**
- Consumes: `getSessionUser`, `can`.
- Produces: sidebar rows filtered by `can(user, "view.<page>")`; each mutating server action wrapped in `requireRole(...)`.

- [ ] **Step 1: Rewrite the dashboard layout to inject user + filter sidebar**

Read the existing `src/app/(dashboard)/layout.tsx` first, then edit only the sidebar section. Wrap the section that renders nav links so each one is conditional on `can(user, ...)`. Remove any CEO/Manager toggle. Show a badge in the top bar reading `{user.name} · {user.role}` (title-cased).

The minimum change is adding at the top of the layout:

```tsx
import { getSessionUser } from "@/lib/session";
import { can } from "@/lib/authz";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // …existing chrome…
  // Filter sidebar entries with can(user, "view.<page>")
  //   only render Vendors / RFQs / Teams if can(user, "view.rfqs") etc.
  //   only render Reputation / Market if can(user, "view.reputation")
  //   Settings link visible to all (they hit /settings/profile)
}
```

- [ ] **Step 2: For each dashboard page, add a top-level `requireRole` or gate on CTA**

Concretely (adjust to whatever the current server action names are):
- `events/[code]/page.tsx` "Create event" button — hidden if `!can(user, "event.create")`.
- `rfqs/*` — page component starts with `requireRole(me, "ceo", "producer")` (if the user lacks it, redirect to `/overview`).
- `budgets/*` — `requireRole(me, "ceo", "producer", "finance")`.
- `vendors/*`, `teams/*` — `requireRole(me, "ceo", "producer")`.
- `reputation/*`, `market/*` — `requireRole(me, "ceo", "sales")`.

- [ ] **Step 3: Delete the CEO/Manager lens toggle**

Grep for the toggle component:
```bash
grep -rn "role.*toggle\|CEO.*Manager\|lens" src/app src/components
```
Delete it and any state associated. Overview KPIs render for everyone the same way (Phase A doesn't reshape them per role — that's a follow-up).

- [ ] **Step 4: Manual smoke**

Invite a Coordinator via `/settings/users`, log in as them, verify:
- Sidebar shows Overview, Events, Calendar, Tasks only.
- Direct URL to `/rfqs` → redirects to `/overview`.
- Direct URL to `/settings/users` → 500 (FORBIDDEN throw) — acceptable for Phase A; friendly 403 lands in Phase B.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)"
git commit -m "$(cat <<'EOF'
Gate every dashboard page + sidebar entry by role via can()

Sidebar rows now filter through can(user, 'view.<page>') so RFQs,
Vendors, Teams, Budgets, Reputation, and Market Intel hide from roles
that lack access. Each protected route also calls requireRole() at the
top so direct-URL access redirects or 403s. Removes the old CEO/Manager
lens toggle from the top bar — role now comes from the session and is
shown as a badge next to the avatar.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 15: In-memory login rate limiter

**Files:**
- Create: `src/lib/rate-limit.ts`
- Modify: `src/lib/auth.ts` (call the limiter from `authorize`)

**Interfaces:**
- Consumes: nothing.
- Produces: `hitLoginAttempt(email: string): { locked: boolean; retryAfterSec: number }`.

- [ ] **Step 1: Write the limiter**

`src/lib/rate-limit.ts`:

```ts
type Bucket = { failures: number; lockedUntil: number; windowStart: number };
const buckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 10;
const LOCK_MS = 15 * 60 * 1000;

export function loginAttemptAllowed(email: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(email);
  if (b && b.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function recordLoginFailure(email: string): void {
  const now = Date.now();
  const b = buckets.get(email) ?? { failures: 0, lockedUntil: 0, windowStart: now };
  if (now - b.windowStart > WINDOW_MS) { b.failures = 0; b.windowStart = now; }
  b.failures += 1;
  if (b.failures >= MAX_FAILS) b.lockedUntil = now + LOCK_MS;
  buckets.set(email, b);
}

export function recordLoginSuccess(email: string): void {
  buckets.delete(email);
}
```

TODO in comment: swap this for Redis in prod (Upstash) — this Map is per-instance and loses state on restart.

- [ ] **Step 2: Wire into `authorize` in `src/lib/auth.ts`**

Inside the `Credentials.authorize` callback, at the top:

```ts
const gate = loginAttemptAllowed(email);
if (!gate.allowed) return null;
```

At the end, on failure paths, call `recordLoginFailure(email)`; on the success path (before returning the user object), call `recordLoginSuccess(email)`.

- [ ] **Step 3: Manual smoke**

Try 10 wrong passwords in a row → 11th attempt returns "Invalid…" even with the correct password (until 15 min pass, or process restart in dev).

- [ ] **Step 4: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/auth.ts
git commit -m "$(cat <<'EOF'
Add per-email login rate limit (10 fails / 15 min → 15 min lock)

In-memory Map today — flagged as TODO to move onto Upstash Redis
before we open the CRM to more than a handful of staff. Cleared on
successful login.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 16: Legacy env-auth fallback (behind `LEGACY_AUTH=on`)

**Files:**
- Modify: `src/lib/auth.ts` (add a small legacy check on `authorize`)

**Interfaces:**
- Consumes: env `LEGACY_AUTH`, `AUTH_EMAIL`, `AUTH_PASSWORD`.
- Produces: when `LEGACY_AUTH === "on"`, sign-in with matching legacy creds returns a synthesised `ceo` session mapped to the seeded CEO user id.

- [ ] **Step 1: Add the branch in `authorize`**

Insert at the very top of `authorize` (before the DB lookup):

```ts
if (process.env.LEGACY_AUTH === "on"
  && process.env.AUTH_EMAIL?.toLowerCase() === email
  && process.env.AUTH_PASSWORD === password) {
  const ceo = await prisma.user.findFirst({ where: { role: "ceo", active: true }, orderBy: { id: "asc" } });
  if (ceo) return { id: String(ceo.id), email: ceo.email, name: ceo.name, role: ceo.role };
}
```

- [ ] **Step 2: Manual smoke**

Set `LEGACY_AUTH=on`, `AUTH_EMAIL`, `AUTH_PASSWORD` in `.env.local`, sign in with those creds → lands on `/overview` as the seeded CEO.

Set `LEGACY_AUTH=off`, same creds → login rejected.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "$(cat <<'EOF'
Add LEGACY_AUTH=on fallback that maps env creds to the seeded CEO

Kept for exactly one release so an in-flight session using the old
AUTH_EMAIL/AUTH_PASSWORD env pair still lands somewhere sensible.
Set LEGACY_AUTH=off after every real staff user has been invited
and logged in; delete both env vars in a follow-up PR.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 17: Playwright integration test — CEO signs in and lands on /overview

**Files:**
- Create: `tests/e2e/auth-ceo.spec.ts`

**Interfaces:**
- Consumes: seeded CEO from Task 4.
- Produces: `pnpm e2e` runs one flow that fails if login is broken.

- [ ] **Step 1: Write the test**

`tests/e2e/auth-ceo.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const CEO_EMAIL = process.env.E2E_CEO_EMAIL ?? process.env.SEED_ADMIN_EMAIL!;
const CEO_PASSWORD = process.env.E2E_CEO_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD!;

test("seeded CEO signs in and reaches /overview", async ({ page }) => {
  await page.goto("/overview");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel(/email/i).fill(CEO_EMAIL);
  await page.getByLabel(/password/i).fill(CEO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/overview/);
  await expect(page.getByText(/overview/i)).toBeVisible();
});

test("unauthenticated request to /rfqs redirects to /login", async ({ page }) => {
  await page.goto("/rfqs");
  await expect(page).toHaveURL(/\/login/);
});
```

- [ ] **Step 2: Run**

```bash
pnpm dev &  # or `pnpm build && pnpm start`
pnpm e2e --project=chromium tests/e2e/auth-ceo.spec.ts
```
Expected: both tests pass green.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/auth-ceo.spec.ts
git commit -m "$(cat <<'EOF'
Add Playwright smoke — CEO sign-in + unauthenticated redirect

Blocking check for the auth cutover. Reads creds from
E2E_CEO_EMAIL/PASSWORD (fallback to SEED_ADMIN_*) so the same test
can run against local dev and against the Neon migration branch.

Claude-Session: https://claude.ai/code/session_01AcZ9DTTp9JTxYB5an9Nxgk
EOF
)"
```

---

## Task 18: Final verification checklist

- [ ] `pnpm typecheck` → exit 0
- [ ] `pnpm lint` → no new errors
- [ ] `pnpm test:unit` → all green
- [ ] `pnpm e2e --project=chromium tests/e2e/auth-ceo.spec.ts` → green
- [ ] Manual: seeded CEO logs in, invites Sales user, Sales user accepts invite, logs in, sees sidebar with **Overview / Events / Calendar / Tasks / Reputation / Market**, cannot reach `/rfqs` (redirects), cannot reach `/settings/users` (throws).
- [ ] Manual: password reset flow works end-to-end.
- [ ] Manual: `LEGACY_AUTH=off` in `.env.local` — old env creds no longer work.

If everything is green, mark Phase A shipped and open the Phase B plan (event visibility hybrid + per-event grants + friendly 403 page).

---

## Deferred to later phases (explicit)

- Hybrid `whereEventVisible` + `event_user_access` table — **Phase B**.
- Friendly 403 UI — **Phase B**.
- Tasks, Comments, Notifications, Activity — **Phases C, D, E**.
- Contacts, Proposals, Playbooks — **Phases F, G**.
- Redis-backed rate limiter — **before Phase A hits public**, tracked outside the plan.
- Dropping `rfqs.created_by` string column — **one release after A ships**.
