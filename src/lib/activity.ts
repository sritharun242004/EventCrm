import "server-only";
import { db } from "@/lib/db";

/**
 * Log a single audit trail entry. Wrap every mutating server action with one
 * of these — never call this from a read path.
 *
 * `diff` is arbitrary JSON. Convention: { before?: {...}, after?: {...} } for
 * updates; a single object for creates/deletes.
 */
export async function logActivity(input: {
  actorUserId: number | null;
  action: string;
  entityType: string;
  entityId: number;
  diff?: unknown;
}): Promise<void> {
  await db.activityLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      diff: input.diff === undefined ? undefined : (input.diff as any),
    },
  });
}

/**
 * The finance-only slice for the audit sheet — actions Finance is entitled to
 * see under design §4 (`audit.view.finance`).
 */
export const FINANCE_ACTIONS: string[] = [
  "budget.line.create",
  "budget.line.edit",
  "budget.approve",
  "rfq.award",
  "event.move_status",
];
