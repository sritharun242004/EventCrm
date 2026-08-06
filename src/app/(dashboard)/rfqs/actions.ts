"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

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
