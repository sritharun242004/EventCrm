import "server-only";
import type { SessionUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { whereEventVisible } from "@/lib/visibility";

/**
 * Returns true iff `user` can see event with id `eventId` under the hybrid
 * visibility rule. Use before any mutation of an event by id.
 */
export async function canSeeEvent(user: SessionUser, eventId: number): Promise<boolean> {
  if (user.role === "ceo") return true;
  const hit = await db.event.count({
    where: { AND: [{ id: eventId }, whereEventVisible(user)] },
  });
  return hit > 0;
}
