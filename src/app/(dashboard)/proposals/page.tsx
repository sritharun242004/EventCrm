import { db } from "@/lib/db";
import { ProposalFactory } from "./ProposalFactory";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const [events, offerings] = await Promise.all([
    db.event.findMany({
      where: { status: "completed" },
      include: { client: true, venue: true, reviews: true },
      orderBy: [{ reputationScore: "desc" }, { startsOn: "desc" }],
      take: 8,
    }),
    db.vendorOffering.findMany({
      include: { vendor: true },
      orderBy: { basePriceCents: "asc" },
      take: 40,
    }),
  ]);

  return <ProposalFactory
    caseStudies={events.map((event) => ({
      id: event.id,
      name: event.name,
      type: event.type,
      client: event.client?.company ?? event.client?.name ?? "Private client",
      venue: event.venue?.name ?? "Venue confidential",
      city: event.venue?.city ?? "India",
      attendees: event.confirmedAttendees,
      valueInr: Number(event.bookedRevenueCents) / 100,
      rating: event.reputationScore ? Number(event.reputationScore) : null,
      highlight: event.highlight ?? "Successfully planned and delivered end to end.",
    }))}
    rateItems={offerings.map((offering) => ({
      id: offering.id,
      name: offering.sku,
      category: offering.vendor?.category ?? "production",
      vendor: offering.vendor?.name ?? "Agency partner",
      unit: offering.unit,
      rateInr: Number(offering.basePriceCents) / 100,
    }))}
  />;
}
