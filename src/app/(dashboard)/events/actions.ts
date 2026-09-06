"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import type { EventStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { canSeeEvent } from "@/lib/visibility-server";
import { can } from "@/lib/authz";
import { logActivity } from "@/lib/activity";

const VALID: EventStatus[] = [
  "lead", "proposed", "confirmed", "in_production", "live", "wrap_up", "completed", "cancelled",
];

/** Move an event to a new pipeline column (kanban drop). */
export async function updateEventStatus(id: number, next: EventStatus) {
  const me = await requireUser();
  if (!VALID.includes(next)) {
    return { ok: false as const, error: `Invalid status: ${next}` };
  }
  if (!(await canSeeEvent(me, id))) return { ok: false as const, error: "Forbidden" };
  // Only ceo/sales for early stages; ceo/producer for later. Simple gate here
  // — the design's split of who can move which arrow lives in the matrix but
  // is applied uniformly by role for now; refined per-transition in Phase C.
  const earlyStages: EventStatus[] = ["lead", "proposed", "confirmed"];
  const gate = earlyStages.includes(next)
    ? can(me, "event.move_status.lead_to_confirmed")
    : can(me, "event.move_status.confirmed_to_completed");
  if (!gate) return { ok: false as const, error: "Forbidden" };
  try {
    const before = await db.event.findUnique({ where: { id }, select: { status: true } });
    await db.event.update({ where: { id }, data: { status: next } });
    await logActivity({
      actorUserId: me.id,
      action: "event.move_status",
      entityType: "event",
      entityId: id,
      diff: { before: before?.status, after: next },
    });
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
  const me = await requireUser();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  if (!(await canSeeEvent(me, parsed.data.eventId))) return { ok: false as const, error: "Forbidden" };
  if (!can(me, "event.edit_brief")) return { ok: false as const, error: "Forbidden" };
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
  const me = await requireUser();
  const parsed = budgetLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;
  if (!(await canSeeEvent(me, d.eventId))) return { ok: false as const, error: "Forbidden" };
  if (!can(me, "budget.line.create")) return { ok: false as const, error: "Forbidden" };
  try {
    const evt = await db.event.findUnique({ where: { id: d.eventId }, select: { code: true } });
    const created = await db.budgetLine.create({
      data: {
        eventId: d.eventId,
        category: d.category,
        plannedCents: BigInt(Math.round(d.plannedInr * 100)),
        actualCents: d.actualInr != null ? BigInt(Math.round(d.actualInr * 100)) : 0n,
        notes: d.notes || null,
      },
    });
    await logActivity({
      actorUserId: me.id,
      action: "budget.line.create",
      entityType: "event",
      entityId: d.eventId,
      diff: {
        after: {
          budgetLineId: created.id,
          category: d.category,
          plannedInr: d.plannedInr,
          actualInr: d.actualInr ?? 0,
        },
      },
    });
    revalidatePath("/budgets");
    if (evt?.code) revalidatePath(`/events/${evt.code}`);
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Insert failed" };
  }
}
