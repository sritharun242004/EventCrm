"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/authz";
import { canSeeEvent } from "@/lib/visibility-server";

export async function grantAccess(formData: FormData): Promise<void> {
  const me = await requireUser();
  const eventId = Number(formData.get("eventId"));
  const userId = Number(formData.get("userId"));
  if (!eventId || !userId) throw new Error("Missing eventId or userId.");
  if (!can(me, "event.grant_access")) throw new Error("Forbidden.");
  // Producer must themselves be able to see the event before granting others.
  if (me.role === "producer" && !(await canSeeEvent(me, eventId))) throw new Error("Forbidden.");
  // Upsert-style: unique(event_id, user_id) means create is a no-op on duplicate.
  await db.eventUserAccess.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, grantedByUserId: me.id },
    update: {},
  });
  const evt = await db.event.findUnique({ where: { id: eventId }, select: { code: true } });
  if (evt?.code) revalidatePath(`/events/${evt.code}`);
  revalidatePath("/events");
  revalidatePath("/overview");
}

export async function revokeAccess(formData: FormData): Promise<void> {
  const me = await requireUser();
  const eventId = Number(formData.get("eventId"));
  const userId = Number(formData.get("userId"));
  if (!eventId || !userId) throw new Error("Missing eventId or userId.");
  if (!can(me, "event.grant_access")) throw new Error("Forbidden.");
  if (me.role === "producer" && !(await canSeeEvent(me, eventId))) throw new Error("Forbidden.");
  await db.eventUserAccess.deleteMany({ where: { eventId, userId } });
  const evt = await db.event.findUnique({ where: { id: eventId }, select: { code: true } });
  if (evt?.code) revalidatePath(`/events/${evt.code}`);
  revalidatePath("/events");
  revalidatePath("/overview");
}
