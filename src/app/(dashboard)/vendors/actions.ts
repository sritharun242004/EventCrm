"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const categories = [
  "sound_av", "stage", "decor", "carpet_flooring", "lighting", "fnb", "water",
  "catering", "contractor", "security", "ticketing", "photography", "videography",
  "transport", "printing", "logistics",
] as const;

const vendorSchema = z.object({
  name: z.string().trim().min(2, "Vendor name is required").max(120),
  category: z.enum(categories),
  city: z.string().trim().max(80).optional(),
  contactName: z.string().trim().max(100).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  rating: z.coerce.number().min(0).max(5),
  reliabilityPct: z.coerce.number().int().min(0).max(100),
  preferred: z.boolean(),
  notes: z.string().trim().max(1000).optional(),
  sku: z.string().trim().max(160).optional(),
  unit: z.string().trim().max(40).optional(),
  basePriceInr: z.coerce.number().min(0).optional(),
  minOrder: z.coerce.number().int().min(1).optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
});

export type CreateVendorResult =
  | { ok: true; id: number; name: string }
  | { ok: false; error: string };

export async function createVendor(input: z.input<typeof vendorSchema>): Promise<CreateVendorResult> {
  await requireUser();
  const parsed = vendorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid vendor details" };
  }

  const data = parsed.data;
  const hasOffering = Boolean(data.sku || data.unit || data.basePriceInr);
  if (hasOffering && (!data.sku || !data.unit || data.basePriceInr == null)) {
    return { ok: false, error: "SKU, unit, and base price are all required for a rate-card item" };
  }

  try {
    const vendor = await db.vendor.create({
      data: {
        name: data.name,
        category: data.category,
        city: data.city || null,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || null,
        rating: data.rating,
        reliabilityPct: data.reliabilityPct,
        preferred: data.preferred,
        notes: data.notes || null,
        offerings: hasOffering
          ? {
              create: {
                sku: data.sku!,
                unit: data.unit!,
                basePriceCents: BigInt(Math.round(data.basePriceInr! * 100)),
                minOrder: data.minOrder ?? 1,
                leadTimeDays: data.leadTimeDays ?? 7,
              },
            }
          : undefined,
      },
    });
    revalidatePath("/vendors");
    return { ok: true, id: vendor.id, name: vendor.name };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create vendor" };
  }
}
