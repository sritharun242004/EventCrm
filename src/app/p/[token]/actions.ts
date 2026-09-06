"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function acceptProposal(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const p = await db.proposal.findUnique({ where: { publicToken: token } });
  if (!p) throw new Error("Not found.");
  if (p.status !== "sent" && p.status !== "viewed") return;
  await db.$transaction(async (tx) => {
    await tx.proposal.update({
      where: { id: p.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });
    // Bump the event forward if still in proposed status.
    const evt = await tx.event.findUnique({ where: { id: p.eventId }, select: { status: true, code: true } });
    if (evt?.status === "proposed" || evt?.status === "lead") {
      await tx.event.update({ where: { id: p.eventId }, data: { status: "confirmed" } });
    }
  });
  await logActivity({
    actorUserId: null, // public accept — no actor
    action: "proposal.accepted",
    entityType: "event",
    entityId: p.eventId,
    diff: { proposalId: p.id, token },
  });
  revalidatePath(`/p/${token}`);
}
