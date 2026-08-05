"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { EventStatus } from "@prisma/client";

const VALID: EventStatus[] = [
  "lead", "proposed", "confirmed", "in_production", "live", "wrap_up", "completed", "cancelled",
];

/**
 * Move an event to a new pipeline column. Called from the kanban's onDrop.
 * Optimistic — the UI moves the card before this returns.
 */
export async function updateEventStatus(id: number, next: EventStatus) {
  if (!VALID.includes(next)) {
    return { ok: false as const, error: `Invalid status: ${next}` };
  }
  try {
    await db.event.update({
      where: { id },
      data: { status: next },
    });
    revalidatePath("/events");
    revalidatePath("/overview");
    revalidatePath("/calendar");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Update failed" };
  }
}
