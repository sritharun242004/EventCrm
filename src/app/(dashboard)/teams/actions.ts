"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const addMemberSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  role: z.string().trim().max(120).optional(),
  teamId: z.coerce.number().int().positive("Pick a team"),
  utilizationPct: z.coerce.number().int().min(0).max(100).default(70),
  rating: z.coerce.number().min(0).max(5).default(4.5),
  skills: z.string().trim().max(400).optional(),
});

export type CreateMemberResult =
  | { ok: true; id: number; name: string }
  | { ok: false; error: string };

export async function createTeamMember(
  input: z.input<typeof addMemberSchema>,
): Promise<CreateMemberResult> {
  await requireUser();
  const parsed = addMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid member details" };
  }
  const d = parsed.data;
  try {
    const member = await db.teamMember.create({
      data: {
        name: d.name,
        role: d.role || null,
        teamId: d.teamId,
        utilizationPct: d.utilizationPct,
        ratingAvg: d.rating,
        skillTags: d.skills
          ? d.skills.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
      },
    });
    revalidatePath("/teams");
    revalidatePath("/overview");
    return { ok: true, id: member.id, name: member.name };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Insert failed" };
  }
}

const reassignSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  teamId: z.coerce.number().int().positive("Pick a team"),
});

export type ReassignResult = { ok: true } | { ok: false; error: string };

export async function reassignTeamMember(
  input: z.input<typeof reassignSchema>,
): Promise<ReassignResult> {
  await requireUser();
  const parsed = reassignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  try {
    await db.teamMember.update({
      where: { id: parsed.data.memberId },
      data: { teamId: parsed.data.teamId },
    });
    revalidatePath("/teams");
    revalidatePath("/overview");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}
