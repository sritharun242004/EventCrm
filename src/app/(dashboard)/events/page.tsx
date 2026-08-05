import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead } from "@/components/ui/PageHead";
import { ChipLink } from "@/components/ui/ChipLink";
import { ActionButton } from "@/components/ui/Toast";
import { EventsKanban } from "./EventsKanban";
import type { EventType } from "@prisma/client";

// Drag-and-drop calls updateEventStatus which revalidates /events immediately,
// so a 15s ISR window is a safe cache without breaking responsiveness.
export const revalidate = 15;

const FILTERS: Array<{ label: string; type?: EventType }> = [
  { label: "All" },
  { label: "Concerts", type: "concert" },
  { label: "Conferences", type: "conference" },
  { label: "TEDx", type: "tedx" },
  { label: "Weddings", type: "wedding" },
  { label: "Festivals", type: "festival" },
];

type Search = Promise<{ type?: string }>;

export default async function EventsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const activeType = sp.type as EventType | undefined;

  const events = await db.event.findMany({
    where: activeType ? { type: activeType } : undefined,
    include: { client: true, venue: true, leadTeam: true },
    orderBy: { startsOn: "asc" },
  });

  const cards = events.map((e) => ({
    id: e.id,
    code: e.code ?? "",
    name: e.name,
    type: e.type,
    status: e.status,
    clientName: e.client?.company ?? null,
    venueName: e.venue?.name ?? null,
    teamName: e.leadTeam?.name ?? null,
    startsOn: e.startsOn.toISOString(),
    endsOn: e.endsOn.toISOString(),
    projectedCents: Number(e.projectedRevenueCents),
    spentCents: Number(e.spentCents),
    budgetCents: Number(e.totalBudgetCents),
  }));

  return (
    <>
      <PageHead
        crumb="Pipeline"
        title="Events"
        subtitle={`${events.length} events on the board. Drag any card to move it through the stages.`}
        actions={
          <>
            <ActionButton label="Group by team" toastMsg="Grouping by team — coming soon" />
            <Link className="btn primary" href="/calendar">New event</Link>
          </>
        }
      />

      <div className="filters">
        {FILTERS.map((f) => (
          <ChipLink
            key={f.label}
            href={f.type ? `/events?type=${f.type}` : "/events"}
            label={f.label}
            active={f.type ? activeType === f.type : !activeType}
          />
        ))}
      </div>

      <EventsKanban cards={cards} />
    </>
  );
}
