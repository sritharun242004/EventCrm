import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/authz";
import type { CommentEntity, NotificationKind } from "@prisma/client";
import { canSeeEvent } from "@/lib/visibility-server";

/**
 * Extract @[Name](userId) mention tokens from a comment body. Returns the
 * unique userIds mentioned.
 */
export function extractMentions(body: string): number[] {
  const ids = new Set<number>();
  const re = /@\[[^\]]+\]\((\d+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const id = Number(m[1]);
    if (Number.isInteger(id) && id > 0) ids.add(id);
  }
  return [...ids];
}

/**
 * Verify the caller can see the referenced entity before posting a comment.
 * event → whereEventVisible / canSeeEvent
 * rfq   → the event the RFQ belongs to must be visible
 * task  → the event the task belongs to must be visible
 */
export async function assertCanCommentOn(
  user: SessionUser,
  entityType: CommentEntity,
  entityId: number,
): Promise<void> {
  if (entityType === "event") {
    if (!(await canSeeEvent(user, entityId))) throw new Error("Forbidden.");
    return;
  }
  if (entityType === "rfq") {
    const rfq = await db.rfq.findUnique({ where: { id: entityId }, select: { eventId: true } });
    if (!rfq?.eventId) throw new Error("Not found.");
    if (!(await canSeeEvent(user, rfq.eventId))) throw new Error("Forbidden.");
    return;
  }
  if (entityType === "task") {
    const task = await db.task.findUnique({ where: { id: entityId }, select: { eventId: true } });
    if (!task) throw new Error("Not found.");
    if (!(await canSeeEvent(user, task.eventId))) throw new Error("Forbidden.");
    return;
  }
}

export type NotifyInput = {
  userId: number;
  kind: NotificationKind;
  title: string;
  body?: string;
  linkUrl: string;
};

export async function notify(input: NotifyInput): Promise<void> {
  await db.notification.create({ data: input });
}

/**
 * Convenience — build the deep-link URL for a comment target.
 */
export async function linkForEntity(entityType: CommentEntity, entityId: number): Promise<string> {
  if (entityType === "event") {
    const evt = await db.event.findUnique({ where: { id: entityId }, select: { code: true } });
    return evt?.code ? `/events/${evt.code}` : "/events";
  }
  if (entityType === "rfq") {
    const r = await db.rfq.findUnique({ where: { id: entityId }, select: { code: true } });
    return r?.code ? `/rfqs/${r.code}` : "/rfqs";
  }
  if (entityType === "task") {
    return `/tasks`;
  }
  return "/overview";
}
