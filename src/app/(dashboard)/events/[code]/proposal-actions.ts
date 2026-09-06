"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/authz";
import { canSeeEvent } from "@/lib/visibility-server";
import { logActivity } from "@/lib/activity";

export async function createProposal(formData: FormData): Promise<void> {
  const me = await requireUser();
  if (!can(me, "proposal.create")) throw new Error("Forbidden.");
  const eventId = Number(formData.get("eventId"));
  const title = String(formData.get("title") ?? "").trim();
  const bodyMarkdown = String(formData.get("bodyMarkdown") ?? "").trim();
  const amountInrRaw = formData.get("amountInr");
  const amountCents = amountInrRaw && String(amountInrRaw).trim() !== ""
    ? BigInt(Math.round(Number(amountInrRaw) * 100))
    : null;
  if (!eventId) throw new Error("Missing eventId.");
  if (title.length < 2) throw new Error("Title required (2+ chars).");
  if (bodyMarkdown.length < 5) throw new Error("Body required.");
  if (!(await canSeeEvent(me, eventId))) throw new Error("Forbidden.");

  const lastVersion = await db.proposal.findFirst({
    where: { eventId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (lastVersion?.version ?? 0) + 1;
  const publicToken = randomBytes(24).toString("hex");

  const created = await db.proposal.create({
    data: {
      eventId,
      version,
      status: "draft",
      publicToken,
      title,
      bodyMarkdown,
      amountCents,
      createdByUserId: me.id,
    },
  });
  await logActivity({
    actorUserId: me.id,
    action: "proposal.create",
    entityType: "event",
    entityId: eventId,
    diff: { proposalId: created.id, version, title },
  });
  const evt = await db.event.findUnique({ where: { id: eventId }, select: { code: true } });
  if (evt?.code) revalidatePath(`/events/${evt.code}`);
}

export async function sendProposal(formData: FormData): Promise<void> {
  const me = await requireUser();
  if (!can(me, "proposal.send")) throw new Error("Forbidden.");
  const id = Number(formData.get("id"));
  const p = await db.proposal.findUnique({
    where: { id },
    select: { eventId: true, status: true, event: { select: { code: true } } },
  });
  if (!p) throw new Error("Not found.");
  if (!(await canSeeEvent(me, p.eventId))) throw new Error("Forbidden.");
  if (p.status !== "draft") throw new Error("Only draft proposals can be sent.");
  await db.proposal.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  });
  await logActivity({
    actorUserId: me.id,
    action: "proposal.send",
    entityType: "event",
    entityId: p.eventId,
    diff: { proposalId: id },
  });
  if (p.event.code) revalidatePath(`/events/${p.event.code}`);
}

export async function supersedeProposal(formData: FormData): Promise<void> {
  const me = await requireUser();
  if (!can(me, "proposal.create")) throw new Error("Forbidden.");
  const id = Number(formData.get("id"));
  const p = await db.proposal.findUnique({
    where: { id },
    select: { eventId: true, event: { select: { code: true } } },
  });
  if (!p) return;
  if (!(await canSeeEvent(me, p.eventId))) throw new Error("Forbidden.");
  await db.proposal.update({ where: { id }, data: { status: "superseded" } });
  await logActivity({
    actorUserId: me.id,
    action: "proposal.supersede",
    entityType: "event",
    entityId: p.eventId,
    diff: { proposalId: id },
  });
  if (p.event.code) revalidatePath(`/events/${p.event.code}`);
}
