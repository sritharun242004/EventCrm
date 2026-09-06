"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/authz";
import { canSeeEvent } from "@/lib/visibility-server";
import { notify } from "@/lib/comments";
import type { TaskStatus } from "@prisma/client";

const STATUSES: TaskStatus[] = ["open", "in_progress", "blocked", "done", "cancelled"];

const createSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  assigneeUserId: z.coerce.number().int().positive().optional(),
  dueOn: z.string().trim().min(1).optional(),
});

export async function createTask(formData: FormData): Promise<void> {
  const me = await requireUser();
  if (!can(me, "task.create")) throw new Error("Forbidden.");
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid.");
  const d = parsed.data;
  if (!(await canSeeEvent(me, d.eventId))) throw new Error("Forbidden.");
  const evt = await db.event.findUnique({ where: { id: d.eventId }, select: { code: true, name: true } });
  const created = await db.task.create({
    data: {
      eventId: d.eventId,
      title: d.title,
      description: d.description || null,
      priority: d.priority,
      assigneeUserId: d.assigneeUserId ?? null,
      createdByUserId: me.id,
      dueOn: d.dueOn ? new Date(d.dueOn) : null,
    },
  });
  if (created.assigneeUserId && created.assigneeUserId !== me.id) {
    await notify({
      userId: created.assigneeUserId,
      kind: "task_assigned",
      title: `${me.name} assigned you a task`,
      body: `${d.title} · ${evt?.name ?? "event"}`,
      linkUrl: evt?.code ? `/events/${evt.code}` : "/tasks",
    });
  }
  revalidatePath("/tasks");
  if (evt?.code) revalidatePath(`/events/${evt.code}`);
}

export async function setTaskStatus(formData: FormData): Promise<void> {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  const next = String(formData.get("status")) as TaskStatus;
  if (!STATUSES.includes(next)) throw new Error("Invalid status.");
  const t = await db.task.findUnique({ where: { id }, select: { eventId: true, event: { select: { code: true } } } });
  if (!t) throw new Error("Not found.");
  if (!(await canSeeEvent(me, t.eventId))) throw new Error("Forbidden.");
  await db.task.update({
    where: { id },
    data: { status: next, completedAt: next === "done" ? new Date() : null },
  });
  revalidatePath("/tasks");
  if (t.event.code) revalidatePath(`/events/${t.event.code}`);
}

export async function assignTask(formData: FormData): Promise<void> {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  const userId = formData.get("userId");
  const nextUserId = userId && String(userId).length ? Number(userId) : null;
  const t = await db.task.findUnique({
    where: { id },
    select: { eventId: true, title: true, assigneeUserId: true, event: { select: { code: true, name: true } } },
  });
  if (!t) throw new Error("Not found.");
  if (!(await canSeeEvent(me, t.eventId))) throw new Error("Forbidden.");
  await db.task.update({ where: { id }, data: { assigneeUserId: nextUserId } });
  if (nextUserId && nextUserId !== me.id && nextUserId !== t.assigneeUserId) {
    await notify({
      userId: nextUserId,
      kind: "task_assigned",
      title: `${me.name} assigned you a task`,
      body: `${t.title} · ${t.event.name}`,
      linkUrl: t.event.code ? `/events/${t.event.code}` : "/tasks",
    });
  }
  revalidatePath("/tasks");
  if (t.event.code) revalidatePath(`/events/${t.event.code}`);
}

export async function deleteTask(formData: FormData): Promise<void> {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  const t = await db.task.findUnique({ where: { id }, select: { eventId: true, event: { select: { code: true } } } });
  if (!t) return;
  if (!(await canSeeEvent(me, t.eventId))) throw new Error("Forbidden.");
  await db.task.delete({ where: { id } });
  revalidatePath("/tasks");
  if (t.event.code) revalidatePath(`/events/${t.event.code}`);
}
