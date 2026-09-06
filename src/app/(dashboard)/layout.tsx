import { Sidebar, type SidebarGroup } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { RunSheet } from "@/components/shell/RunSheet";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { can, type Action, type SessionUser } from "@/lib/authz";
import { whereEventVisible } from "@/lib/visibility";

type Counts = { events: number; vendors: number; teams: number; rfqs: number };

async function getSidebarCounts(user: SessionUser): Promise<Counts> {
  const eventScope = whereEventVisible(user);
  const [events, vendors, teams, rfqs] = await Promise.all([
    db.event.count({ where: eventScope }),
    db.vendor.count(),
    db.team.count(),
    db.rfq.count(),
  ]);
  return { events, vendors, teams, rfqs };
}

async function getRunsheetContext(user: SessionUser) {
  const now = new Date();
  const eventScope = whereEventVisible(user);
  const [live, todayCount] = await Promise.all([
    db.event.findFirst({
      where: { AND: [{ status: "live" }, eventScope] },
    }),
    db.event.count({
      where: { AND: [{ startsOn: { lte: now }, endsOn: { gte: now } }, eventScope] },
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
}

function buildSidebar(user: SessionUser, counts: Counts): SidebarGroup[] {
  const gate = (a: Action) => can(user, a);
  const groups: SidebarGroup[] = [];

  const programme = [
    gate("view.overview") && { href: "/overview", label: "Overview" },
    gate("view.events") && { href: "/events", label: "Events", count: counts.events },
    gate("view.calendar") && { href: "/calendar", label: "Calendar" },
    // /tasks lands in Phase C — sidebar entry re-added there.
  ].filter(Boolean) as SidebarGroup["items"];
  if (programme.length) groups.push({ group: "Programme", items: programme });

  const production: SidebarGroup["items"] = [];
  if (gate("view.proposals")) production.push({ href: "/proposals", label: "Proposal Factory" });
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
  const user = await requireUser();
  const [counts, { live, todayCount }] = await Promise.all([
    getSidebarCounts(user),
    getRunsheetContext(user),
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
