"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const CATEGORIES = ["sound_av", "stage", "decor", "carpet_flooring", "lighting", "fnb", "water", "catering", "contractor", "security", "ticketing", "photography", "videography", "transport", "printing", "logistics"] as const;

const createSchema = z.object({
  eventId: z.coerce.number().int().positive().optional(),
  title: z.string().trim().min(3, "Title is required").max(160),
  category: z.enum(CATEGORIES),
  neededBy: z.string().optional(),
  budgetCeilingInr: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(800).optional(),
});

export async function createRfq(input: z.input<typeof createSchema>) {
  const user = await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid RFQ" };
  const data = parsed.data;
  try {
    const year = new Date().getFullYear();
    const code = `RFQ-${year}-${Date.now().toString().slice(-7)}`;
    const rfq = await db.rfq.create({
      data: {
        code,
        eventId: data.eventId,
        title: data.title,
        category: data.category,
        neededBy: data.neededBy ? new Date(`${data.neededBy}T00:00:00.000Z`) : null,
        budgetCeilingCents: data.budgetCeilingInr != null ? BigInt(Math.round(data.budgetCeilingInr * 100)) : null,
        notes: data.notes || null,
        createdBy: user.email,
      },
      select: { code: true },
    });
    revalidatePath("/rfqs");
    return { ok: true as const, code: rfq.code! };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "RFQ creation failed" };
  }
}

const awardSchema = z.object({
  rfqId: z.coerce.number().int().positive(),
  vendorId: z.coerce.number().int().positive(),
});

/**
 * Award an RFQ to a vendor. Marks the winning quote as `awarded`, all other
 * submitted quotes as `declined`, and stamps the RFQ itself as `awarded`.
 */
export async function awardRfq(input: z.input<typeof awardSchema>) {
  await requireUser();
  const parsed = awardSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const { rfqId, vendorId } = parsed.data;

  try {
    const rfq = await db.rfq.findUnique({
      where: { id: rfqId },
      select: { code: true, quotes: { select: { id: true, vendorId: true, status: true } } },
    });
    if (!rfq) return { ok: false as const, error: "RFQ not found" };
    const winner = rfq.quotes.find((q) => q.vendorId === vendorId);
    if (!winner) return { ok: false as const, error: "That vendor didn't quote this RFQ" };

    await db.$transaction([
      db.rfqQuote.update({
        where: { id: winner.id },
        data: { status: "awarded" },
      }),
      // Decline every OTHER submitted/shortlisted quote — pending ones stay pending
      db.rfqQuote.updateMany({
        where: {
          rfqId,
          id: { not: winner.id },
          status: { in: ["submitted", "shortlisted"] },
        },
        data: { status: "declined" },
      }),
      db.rfq.update({
        where: { id: rfqId },
        data: { status: "awarded", awardedVendorId: vendorId },
      }),
    ]);

    revalidatePath("/rfqs");
    if (rfq.code) revalidatePath(`/rfqs/${rfq.code}`);
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Award failed" };
  }
}
