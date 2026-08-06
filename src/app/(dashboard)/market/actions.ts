"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { EventType } from "@prisma/client";

const eventTypes: EventType[] = [
  "concert", "conference", "tech_summit", "tedx", "private_party",
  "product_launch", "wedding", "festival", "corporate", "gala",
];

const signalSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(160),
  organizer: z.string().trim().max(120).optional(),
  type: z.enum(eventTypes as [EventType, ...EventType[]]).optional(),
  city: z.string().trim().max(80).optional(),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  expectedAttendees: z.coerce.number().int().min(0).optional(),
  estTicketPriceInr: z.coerce.number().min(0).optional(),
  signal: z.enum(["competitor", "partner", "opportunity"]),
  notes: z.string().trim().max(800).optional(),
});

export async function createMarketSignal(input: z.input<typeof signalSchema>) {
  await requireUser();
  const parsed = signalSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;
  try {
    await db.marketIntel.create({
      data: {
        name: d.name,
        organizer: d.organizer || null,
        type: d.type ?? null,
        city: d.city || null,
        startsOn: new Date(d.startsOn),
        expectedAttendees: d.expectedAttendees ?? 0,
        estTicketPriceCents:
          d.estTicketPriceInr != null ? BigInt(Math.round(d.estTicketPriceInr * 100)) : 0n,
        signal: d.signal,
        notes: d.notes || null,
      },
    });
    revalidatePath("/market");
    revalidatePath("/overview");
    return { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Insert failed" };
  }
}
