import { unstable_cache } from "next/cache";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { RunSheet } from "@/components/shell/RunSheet";
import { db } from "@/lib/db";

/**
 * Sidebar count badges are cached for 60s. They only need to be roughly
 * fresh; the actual pages fetch live data on every request.
 */
const getSidebarCounts = unstable_cache(
  async () => {
    const [events, vendors, teams, rfqs] = await Promise.all([
      db.event.count(),
      db.vendor.count(),
      db.team.count(),
      db.rfq.count(),
    ]);
    return { events, vendors, teams, rfqs };
  },
  ["sidebar-counts"],
  { revalidate: 60, tags: ["sidebar-counts"] }
);

/**
 * Live-event + today's-events header stripe. Cached briefly because it's
 * shared across every page load and the underlying data changes infrequently
 * relative to how often people navigate around.
 */
const getRunsheetContext = unstable_cache(
  async () => {
    const now = new Date();
    const [live, todayCount] = await Promise.all([
      db.event.findFirst({ where: { status: "live" } }),
      db.event.count({
        where: {
          startsOn: { lte: now },
          endsOn: { gte: now },
        },
      }),
    ]);
    return {
      live: live
        ? {
            code: live.code ?? "",
            name: live.name,
            startsOn: live.startsOn.toISOString(),
            endsOn: live.endsOn.toISOString(),
            roomCount: live.confirmedAttendees,
          }
        : null,
      todayCount,
    };
  },
  ["runsheet-ctx"],
  { revalidate: 30, tags: ["runsheet-ctx"] }
);

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [counts, { live, todayCount }] = await Promise.all([
    getSidebarCounts(),
    getRunsheetContext(),
  ]);

  const liveEvent = live
    ? {
        code: live.code,
        name: live.name,
        day: Math.max(1, Math.round((Date.now() - new Date(live.startsOn).getTime()) / 86_400_000) + 1),
        total: Math.max(
          1,
          Math.round((new Date(live.endsOn).getTime() - new Date(live.startsOn).getTime()) / 86_400_000) + 1
        ),
        roomCount: live.roomCount,
      }
    : null;

  return (
    <div className="app">
      <RunSheet liveEvent={liveEvent} totalToday={todayCount} />
      <Topbar />
      <Sidebar counts={counts} />
      <main className="main">{children}</main>
    </div>
  );
}
