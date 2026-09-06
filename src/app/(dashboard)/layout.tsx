import { unstable_cache } from "next/cache";
import { Sidebar, type SidebarGroup } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { RunSheet } from "@/components/shell/RunSheet";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can, type Action } from "@/lib/authz";

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

const getRunsheetContext = unstable_cache(
  async () => {
    const now = new Date();
    const [live, todayCount] = await Promise.all([
      db.event.findFirst({ where: { status: "live" } }),
      db.event.count({ where: { startsOn: { lte: now }, endsOn: { gte: now } } }),
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

type Counts = { events: number; vendors: number; teams: number; rfqs: number };

function buildSidebar(user: Awaited<ReturnType<typeof requireUser>>, counts: Counts): SidebarGroup[] {
  const gate = (a: Action) => can(user, a);
  const groups: SidebarGroup[] = [];

  const programme = [
    gate("view.overview") && { href: "/overview", label: "Overview" },
    gate("view.events") && { href: "/events", label: "Events", count: counts.events },
    gate("view.calendar") && { href: "/calendar", label: "Calendar" },
    gate("view.tasks") && { href: "/tasks", label: "Tasks" },
  ].filter(Boolean) as SidebarGroup["items"];
  if (programme.length) groups.push({ group: "Programme", items: programme });

  const production: SidebarGroup["items"] = [];
  // Proposal Factory stays visible to anyone who can create proposals — for
  // Phase A that's the same set as who can create events.
  if (gate("event.create")) production.push({ href: "/proposals", label: "Proposal Factory" });
  if (gate("view.vendors")) production.push({ href: "/vendors", label: "Vendors", count: counts.vendors });
  if (gate("view.budgets")) production.push({ href: "/budgets", label: "Budgets" });
  if (gate("view.rfqs")) production.push({ href: "/rfqs", label: "RFQs", count: counts.rfqs });
  if (gate("view.teams")) production.push({ href: "/teams", label: "Teams", count: counts.teams });
  if (production.length) groups.push({ group: "Production", items: production });

  const signals: SidebarGroup["items"] = [];
  if (gate("view.reputation")) signals.push({ href: "/reputation", label: "Reputation" });
  if (gate("view.market")) signals.push({ href: "/market", label: "Market" });
  if (signals.length) groups.push({ group: "Signals", items: signals });

  groups.push({ group: "Account", items: [{ href: "/settings/profile", label: "Settings" }] });
  return groups;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, counts, { live, todayCount }] = await Promise.all([
    requireUser(),
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

  const groups = buildSidebar(user, counts);
  const sidebar = <Sidebar groups={groups} />;

  return (
    <div className="app">
      <RunSheet liveEvent={liveEvent} totalToday={todayCount} />
      <Topbar email={user.email} name={user.name} role={user.role} mobileNavChildren={sidebar} />
      {sidebar}
      <main className="main">{children}</main>
    </div>
  );
}
