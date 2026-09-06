import Link from "next/link";
import { db } from "@/lib/db";
import { PageHead } from "@/components/ui/PageHead";
import { ChipLink } from "@/components/ui/ChipLink";
import { EventsKanban } from "./EventsKanban";
import type { EventType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { whereEventVisible } from "@/lib/visibility";

// User-scoped: cannot ISR-cache since different roles see different sets.
export const dynamic = "force-dynamic";

const FILTERS: Array<{ label: string; type?: EventType }> = [
  { label: "All" },
  { label: "Concerts", type: "concert" },
  { label: "Conferences", type: "conference" },
  { label: "TEDx", type: "tedx" },
  { label: "Weddings", type: "wedding" },
  { label: "Festivals", type: "festival" },
];

type Search = Promise<{ type?: string; group?: string }>;

export default async function EventsPage({ searchParams }: { searchParams: Search }) {
  const me = await requireUser();
  const sp = await searchParams;
  const activeType = sp.type as EventType | undefined;
  const groupBy: "status" | "team" = sp.group === "team" ? "team" : "status";

  const eventScope = whereEventVisible(me);
  const whereFilter = activeType
    ? { AND: [{ type: activeType }, eventScope] }
    : eventScope;

  const [events, totalVisible, totalAll] = await Promise.all([
    db.event.findMany({
      where: whereFilter,
      include: { client: true, venue: true, leadTeam: true },
      orderBy: { startsOn: "asc" },
    }),
    db.event.count({ where: eventScope }),
    db.event.count(),
  ]);

  const cards = events.map((e) => ({
    id: e.id,
    code: e.code ?? "",
    name: e.name,
    type: e.type,
    status: e.status,
    clientName: e.client?.company ?? null,
    venueName: e.venue?.name ?? null,
    teamName: e.leadTeam?.name ?? null,
    teamId: e.leadTeamId ?? null,
    startsOn: e.startsOn.toISOString(),
    endsOn: e.endsOn.toISOString(),
    projectedCents: Number(e.projectedRevenueCents),
    spentCents: Number(e.spentCents),
    budgetCents: Number(e.totalBudgetCents),
  }));

  // Build the current groupBy toggle URL — preserve any active type filter
  const toggleGroupHref = (() => {
    const p = new URLSearchParams();
    if (activeType) p.set("type", activeType);
    if (groupBy === "status") p.set("group", "team");
    return "/events" + (p.toString() ? `?${p.toString()}` : "");
  })();

  return (
    <>
      <PageHead
        crumb="Pipeline"
        title="Events"
        subtitle={
          me.role === "ceo"
            ? `${events.length} events on the board. Drag any card to move it through the stages.`
            : `Seeing ${totalVisible} of ${totalAll} events (${me.role} default). Drag any card to move it through the stages.`
        }
        actions={
          <>
            <Link
              className={"btn " + (groupBy === "team" ? "primary" : "")}
              href={toggleGroupHref}
            >
              {groupBy === "team" ? "Grouped by team ✓" : "Group by team"}
            </Link>
            <Link className="btn primary" href="/calendar/new">New event</Link>
          </>
        }
      />

      <div className="filters">
        {FILTERS.map((f) => (
          <ChipLink
            key={f.label}
            href={
              (f.type ? `/events?type=${f.type}` : "/events") +
              (groupBy === "team" ? (f.type ? "&" : "?") + "group=team" : "")
            }
            label={f.label}
            active={f.type ? activeType === f.type : !activeType}
          />
        ))}
      </div>

      {/* Remount per filter / grouping so optimistic kanban state doesn't leak between URLs. */}
      <EventsKanban key={(activeType ?? "all") + ":" + groupBy} cards={cards} groupBy={groupBy} />
    </>
  );
}
