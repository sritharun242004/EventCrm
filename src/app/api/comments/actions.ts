"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { CommentEntity } from "@prisma/client";
import { extractMentions, assertCanCommentOn, linkForEntity } from "@/lib/comments";

const KINDS: CommentEntity[] = ["event", "rfq", "task"];

export async function postComment(formData: FormData): Promise<void> {
  const me = await requireUser();
  const entityType = String(formData.get("entityType")) as CommentEntity;
  const entityId = Number(formData.get("entityId"));
  const body = String(formData.get("body") ?? "").trim();
  if (!KINDS.includes(entityType)) throw new Error("Invalid entityType.");
  if (!Number.isInteger(entityId) || entityId <= 0) throw new Error("Invalid entityId.");
  if (body.length < 1) throw new Error("Comment cannot be empty.");
  if (body.length > 4000) throw new Error("Comment too long.");
  await assertCanCommentOn(me, entityType, entityId);

  const mentionIds = extractMentions(body);
  const link = await linkForEntity(entityType, entityId);

  await db.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: { entityType, entityId, authorUserId: me.id, body },
    });
    if (mentionIds.length) {
      // Only mention real, active users. Cheap: cap 20 mentions per comment.
      const valid = await tx.user.findMany({
        where: { id: { in: mentionIds.slice(0, 20) }, active: true },
        select: { id: true },
      });
      if (valid.length) {
        await tx.commentMention.createMany({
          data: valid.map((u) => ({ commentId: c.id, mentionedUserId: u.id })),
          skipDuplicates: true,
        });
        // fan-out notifications (skip self)
        const others = valid.filter((u) => u.id !== me.id);
        for (const u of others) {
          await tx.notification.create({
            data: {
              userId: u.id,
              kind: "mentioned",
              title: `${me.name} mentioned you`,
              body: body.slice(0, 200),
              linkUrl: link,
            },
          });
        }
      }
    }
  });

  revalidatePath(link);
}

export async function deleteComment(formData: FormData): Promise<void> {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  const c = await db.comment.findUnique({ where: { id } });
  if (!c) return;
  if (c.authorUserId !== me.id && me.role !== "ceo") throw new Error("Forbidden.");
  await db.comment.delete({ where: { id } });
  const link = await linkForEntity(c.entityType, c.entityId);
  revalidatePath(link);
}

export async function markAllNotificationsRead(): Promise<void> {
  const me = await requireUser();
  await db.notification.updateMany({
    where: { userId: me.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/overview");
}
