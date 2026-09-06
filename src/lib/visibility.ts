import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/authz";

/**
 * The single source of truth for "which events can this user see."
 * Every db.event.findMany / findFirst / count outside this file MUST
 * pass the return value in its `where` clause (AND-ed with any other filter).
 *
 * The rule is a union: role-default set OR events they created OR events
 * they've been explicitly granted access to. CEO gets `{}` (all events).
 *
 * This file is pure — no side effects, no server-only imports — so the
 * unit tests can exercise it directly under node:test. For side-effectful
 * helpers like canSeeEvent(user, id) see @/lib/visibility-server.
 */
export function whereEventVisible(user: SessionUser): Prisma.EventWhereInput {
  if (user.role === "ceo") return {};

  const grantsOr: Prisma.EventWhereInput = { grants: { some: { userId: user.id } } };
  const createdOr: Prisma.EventWhereInput = { createdByUserId: user.id };

  switch (user.role) {
    case "sales":
      return {
        OR: [
          { status: { in: ["lead", "proposed", "confirmed"] } },
          createdOr,
          grantsOr,
        ],
      };
    case "producer":
      return {
        OR: [
          { status: { in: ["confirmed", "in_production", "live", "wrap_up"] } },
          createdOr,
          grantsOr,
        ],
      };
    case "finance":
      return {
        OR: [{ totalBudgetCents: { gt: 0 } }, grantsOr],
      };
    case "coordinator":
      return {
        OR: [
          { status: { in: ["in_production", "live", "wrap_up"] } },
          grantsOr,
        ],
      };
  }
}
