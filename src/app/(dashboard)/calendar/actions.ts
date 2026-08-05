"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { EventType } from "@prisma/client";
import { requireUser } from "@/lib/auth";

const VALID_TYPES: EventType[] = [
  "concert", "conference", "tech_summit", "tedx",
  "private_party", "product_launch", "wedding",
  "festival", "corporate", "gala",
];

/**
 * Create a new event from the calendar's click-to-add dialog.
 * Returns { ok: true, code } on success, or { ok: false, error } on failure.
 */
export async function createEvent(input: {
  name: string;
  type: string;
  date: string;      // yyyy-mm-dd
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  venueId?: string;
  clientId?: string;
  expected?: string;
  notes?: string;
}) {
  await requireUser();
  const name = input.name?.trim();
  if (!name) return { ok: false as const, error: "Event name is required" };

  const type = VALID_TYPES.includes(input.type as EventType)
    ? (input.type as EventType)
    : "corporate";

  if (!input.date) return { ok: false as const, error: "Date is required" };
  if (!input.startTime || !input.endTime) {
    return { ok: false as const, error: "Start and end time are required" };
  }

  // Compose IST timestamps. Postgres will store as UTC.
  const startsAt = new Date(`${input.date}T${input.startTime}:00+05:30`);
  const endsAt = new Date(`${input.date}T${input.endTime}:00+05:30`);
  if (endsAt <= startsAt) {
    return { ok: false as const, error: "End time must be after start time" };
  }

  // Generate a code EVT-YYYY-NNNN based on existing count for the year.
  const yr = startsAt.getFullYear();
  const count = await db.event.count({
    where: { code: { startsWith: `EVT-${yr}-` } },
  });
  const code = `EVT-${yr}-${String(count + 1).padStart(4, "0")}`;

  const venueId = input.venueId ? Number(input.venueId) : undefined;
  const clientId = input.clientId ? Number(input.clientId) : undefined;
  const expected = input.expected ? Number(input.expected) : 0;

  try {
    await db.event.create({
      data: {
        code,
        name,
        type,
        status: "proposed",
        clientId: clientId || null,
        venueId: venueId || null,
        startsOn: new Date(input.date),
        endsOn: new Date(input.date),
        startsAt,
        endsAt,
        expectedAttendees: expected,
        highlight: input.notes?.trim() || null,
      },
    });
    revalidatePath("/calendar");
    revalidatePath("/events");
    revalidatePath("/overview");
    return { ok: true as const, code };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Insert failed" };
  }
}
