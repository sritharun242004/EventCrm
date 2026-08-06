"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import type { EventStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";

const VALID: EventStatus[] = [
  "lead", "proposed", "confirmed", "in_production", "live", "wrap_up", "completed", "cancelled",
];

/** Move an event to a new pipeline column (kanban drop). */
export async function updateEventStatus(id: number, next: EventStatus) {
  await requireUser();
  if (!VALID.includes(next)) {
    return { ok: false as const, error: `Invalid status: ${next}` };
  }
  try {
    await db.event.update({ where: { id }, data: { status: next } });
    revalidatePath("/events");
    revalidatePath("/overview");
    revalidatePath("/calendar");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Update failed" };
  }
}

/** Save the one-line highlight (note) on an event. Blank string clears it. */
const noteSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  note: z.string().trim().max(500),
});
export async function saveEventNote(input: z.input<typeof noteSchema>) {
  await requireUser();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  try {
    const evt = await db.event.update({
      where: { id: parsed.data.eventId },
      data: { highlight: parsed.data.note || null },
      select: { code: true },
    });
    revalidatePath("/events");
    revalidatePath("/overview");
    if (evt.code) revalidatePath(`/events/${evt.code}`);
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Update failed" };
  }
}

/** Append a new budget line to an event. */
const budgetLineSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  category: z.string().trim().min(1, "Category is required").max(60),
  plannedInr: z.coerce.number().min(0, "Amount must be ≥ 0"),
  actualInr: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(400).optional(),
});
export async function addBudgetLine(input: z.input<typeof budgetLineSchema>) {
  await requireUser();
  const parsed = budgetLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;
  try {
    const evt = await db.event.findUnique({ where: { id: d.eventId }, select: { code: true } });
    await db.budgetLine.create({
      data: {
        eventId: d.eventId,
        category: d.category,
        plannedCents: BigInt(Math.round(d.plannedInr * 100)),
        actualCents: d.actualInr != null ? BigInt(Math.round(d.actualInr * 100)) : 0n,
        notes: d.notes || null,
      },
    });
    revalidatePath("/budgets");
    if (evt?.code) revalidatePath(`/events/${evt.code}`);
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Insert failed" };
  }
}
