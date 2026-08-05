import Link from "next/link";
import { db } from "@/lib/db";
import { addPaise, money, moneyShort, pct, sumPaise } from "@/lib/money";
import { daysFrom, fmtDate, nf } from "@/lib/dates";
import { statusClass, statusLabel, typeLabel } from "@/lib/format";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi, KpiRow } from "@/components/ui/Kpi";
import { LinkKpi } from "@/components/ui/LinkKpi";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Meter } from "@/components/ui/Meter";
import { Sparkline } from "@/components/charts/Sparkline";
import { Donut } from "@/components/charts/Donut";
import { DualBar } from "@/components/charts/DualBar";
import { OverviewKpiSwitcher } from "./OverviewKpiSwitcher";
import { LinkRow } from "@/components/ui/LinkRow";
import { ActionButton } from "@/components/ui/Toast";

// Short-cache for freshness; ISR gives us ~10x page speed vs force-dynamic.
export const revalidate = 15;

// Restrained palette — the 5 print-shop tokens, with lightened tones
// used only when we run out of categories. No rainbow.
const PALETTE = [
  "#BA0013", // brand — largest category
  "#1B3A8A", // deep blue
  "#B7791F", // amber
  "#1F5F49", // green
  "#4A4E58", // ink gray
  "#D64751", // brand tinted
  "#4E6BB0", // blue tinted
  "#D89F58", // amber tinted
  "#5E9C81", // green tinted
  "#8B8D93", // gray light
];

export default async function Overview() {
  const now = new Date();

  const [events, reviews, members, teams, marketAll] = await Promise.all([
    db.event.findMany({
      include: { client: true, venue: true, leadTeam: true },
      orderBy: { startsOn: "asc" },
    }),
    db.eventReview.findMany({ orderBy: { reviewedOn: "desc" } }),
    db.teamMember.findMany(),
    db.team.findMany(),
    db.marketIntel.findMany({ orderBy: { startsOn: "asc" }, take: 4 }),
  ]);

  // === Aggregates ===
  const bookedYTD = sumPaise(events, (e) => e.bookedRevenueCents);
  const projectedFY = sumPaise(events, (e) => e.projectedRevenueCents);
  const budgetFY = sumPaise(events, (e) => e.totalBudgetCents);
  const grossMargin = pct(addPaise(projectedFY, -Number(budgetFY)), projectedFY);
  const totalEvents = events.length;

  const avgRep = reviews.length
    ? (reviews.reduce((a, r) => a + Number(r.score), 0) / reviews.length).toFixed(2)
    : "—";
  const npsAvg = reviews.length
    ? Math.round(reviews.reduce((a, r) => a + (r.nps ?? 0), 0) / reviews.length)
    : 0;
  const avgUtil = members.length
    ? Math.round(members.reduce((a, m) => a + m.utilizationPct, 0) / members.length)
    : 0;

  // Monthly revenue (12 mo) — derived from event dates
  const months = Array.from({ length: 12 }, (_, i) => ({
    label: new Date(2026, i, 1).toLocaleString("en-IN", { month: "short" }),
    actual: 0,
    projected: 0,
  }));
  events.forEach((e) => {
    const idx = new Date(e.startsOn).getMonth();
    months[idx].actual += Number(e.bookedRevenueCents) / 100;
    months[idx].projected += Number(e.projectedRevenueCents) / 100;
  });

  const revActual = months.map((m) => m.actual).filter((v) => v > 0);
  const revProjected = months.map((m) => m.projected);

  // Event type mix
  const mix: Record<string, number> = {};
  events.forEach((e) => {
    const k = typeLabel(e.type);
    mix[k] = (mix[k] ?? 0) + 1;
  });
  const segments = Object.entries(mix).map(([label, value], i) => ({
    label,
    value,
    color: PALETTE[i % PALETTE.length],
  }));

  const upcoming = events
    .filter((e) => new Date(e.startsOn) >= now)
    .slice(0, 6);
  const liveEvent = events.find((e) => e.status === "live");
  const liveCount = events.filter((e) => e.status === "live").length;

  return (
    <>
      <PageHead
        crumb="C-Suite Overview · FY26"
        title="How the year is running"
        subtitle="Financials, reputation, and pipeline at a glance. Drill anywhere."
        actions={
          <>
            <ActionButton label="Export" toastMsg="Preparing CSV export…" />
            <ActionButton label="Share" toastMsg="Share link copied" />
            <Link className="btn primary" href="/calendar">
              New event
            </Link>
          </>
        }
      />

      <OverviewKpiSwitcher
        ceo={
          <KpiRow>
            <LinkKpi
              href="/events"
              label="Booked Revenue · FY26"
              value={moneyShort(bookedYTD)}
              delta="+18.4%"
              deltaKind="up"
              note={`vs FY25 · ${totalEvents} events`}
              extra={
                <div style={{ position: "absolute", right: 12, top: 12, opacity: 0.9 }}>
                  <Sparkline points={revActual} width={90} height={30} labels={months.filter(m => m.actual > 0).map(m => `${m.label}: ${moneyShort(Math.round(m.actual * 100))}`)} />
                </div>
              }
            />
            <LinkKpi
              href="/events"
              label="Projected · FY26"
              value={moneyShort(projectedFY)}
              delta="+24.1%"
              deltaKind="up"
              note="Full-year pipeline"
              extra={
                <div style={{ position: "absolute", right: 12, top: 12, opacity: 0.9 }}>
                  <Sparkline points={revProjected} width={90} height={30} stroke="var(--info)" fill="var(--info-tint)" labels={months.map(m => `${m.label}: ${moneyShort(Math.round(m.projected * 100))}`)} />
                </div>
              }
            />
            <LinkKpi href="/budgets" label="Gross Margin" value={`${grossMargin}%`} delta="+3.2 pts" deltaKind="up" note="Target 30%" />
            <LinkKpi href="/reputation" label="Reputation · NPS" value={npsAvg} unit="/ 100" delta="+6" deltaKind="up" note={`${avgRep}★ across ${reviews.length} reviews`} />
          </KpiRow>
        }
        mgr={
          <KpiRow>
            <LinkKpi
              href={liveEvent ? `/events/${liveEvent.code}` : "/events"}
              label="Live Right Now"
              value={liveCount}
              unit="event"
              extra={
                <div className="foot">
                  <Pill kind="live" dot>On-site</Pill>
                  <span className="note">{liveEvent?.name ?? "—"}</span>
                </div>
              }
            />
            <LinkKpi href="/calendar" label="This Week · Load-ins" value="2" delta="Aug 20" deltaKind="neutral" note="NovaTech AI launch stage build" />
            <LinkKpi href="/budgets" label="Budget Alerts" value="1" delta="88.5%" deltaKind="down" note="Arjt Tour used — recovered post-event" />
            <LinkKpi href="/teams" label="Team Utilization" value={`${avgUtil}%`} delta="Target 75%" deltaKind="neutral" note={`${members.length} producers across ${teams.length} teams`} />
          </KpiRow>
        }
      />

      <div className="row row-2" style={{ marginBottom: 12 }}>
        <Card title="Revenue · Actual vs Projected · FY26">
          <DualBar data={months} />
          <div className="legend" style={{ marginTop: 8 }}>
            <span><i style={{ background: "var(--primary)" }} />Actual</span>
            <span><i style={{ background: "var(--info)" }} />Projected</span>
          </div>
        </Card>
        <Card title="Event Mix · FY26" sub={`${totalEvents} events`}>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 16, alignItems: "center" }}>
            <Donut segments={segments} />
            <div>
              {segments.map((s) => (
                <div className="flex between" style={{ padding: "4px 0" }} key={s.label}>
                  <span className="flex" style={{ gap: 8 }}>
                    <i style={{ width: 8, height: 8, background: s.color, display: "inline-block", borderRadius: 2 }} />
                    <span style={{ fontSize: 13 }}>{s.label}</span>
                  </span>
                  <span className="muted"><b>{s.value}</b></span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {liveEvent ? (
        <Card className="live-card" style={{ marginBottom: 12, borderLeft: "3px solid var(--primary)" }}>
          <div className="card-head">
            <h3><Pill kind="live" dot>LIVE</Pill> {liveEvent.name}</h3>
            <Link className="link" href={`/events/${liveEvent.code}`}>Open brief →</Link>
          </div>
          <div className="row row-3" style={{ gap: 16 }}>
            <div>
              <div className="subtle">Attendees</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>
                {nf.format(liveEvent.confirmedAttendees)}
                <span className="muted" style={{ fontSize: 12 }}> / {nf.format(liveEvent.expectedAttendees)}</span>
              </div>
              <Meter value={pct(liveEvent.confirmedAttendees, liveEvent.expectedAttendees)} kind="success" style={{ marginTop: 6 }} />
            </div>
            <div>
              <div className="subtle">Budget Used</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {moneyShort(liveEvent.spentCents)}
                <span className="muted" style={{ fontSize: 12 }}> / {moneyShort(liveEvent.totalBudgetCents)}</span>
              </div>
              <Meter value={pct(liveEvent.spentCents, liveEvent.totalBudgetCents)} style={{ marginTop: 6 }} />
            </div>
            <div>
              <div className="subtle">Booked Revenue</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {moneyShort(liveEvent.bookedRevenueCents)}
                <span className="muted" style={{ fontSize: 12 }}> / {moneyShort(liveEvent.projectedRevenueCents)}</span>
              </div>
              <Meter value={pct(liveEvent.bookedRevenueCents, liveEvent.projectedRevenueCents)} kind="info" style={{ marginTop: 6 }} />
            </div>
          </div>
          <div className="hr" />
          <div className="muted" style={{ fontSize: 13 }}>{liveEvent.highlight}</div>
        </Card>
      ) : null}

      <div className="row row-2" style={{ marginBottom: 12 }}>
        <Card title="Upcoming Events" link={{ label: "See pipeline →", href: "/events" }}>
          <div className="table-wrap" style={{ border: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>When</th><th>Event</th><th>Type</th><th>Status</th>
                  <th className="num">Attendees</th><th className="num">Projected</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((e) => (
                  <LinkRow key={e.id} href={`/events/${e.code}`}>
                    <td>
                      <div className="stack">
                        <b>{fmtDate(e.startsOn)}</b>
                        <span className="subtle">{daysFrom(e.startsOn, now)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="stack">
                        <b>{e.name}</b>
                        <span className="subtle">{e.client?.company ?? "—"} · {e.venue?.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="muted">{typeLabel(e.type)}</td>
                    <td><Pill kind={statusClass(e.status) as any} dot>{statusLabel(e.status)}</Pill></td>
                    <td className="num muted">{nf.format(e.confirmedAttendees || e.expectedAttendees)}</td>
                    <td className="num money">{moneyShort(e.projectedRevenueCents)}</td>
                  </LinkRow>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Team Utilization" link={{ label: "Manage teams →", href: "/teams" }}>
          {teams.map((t) => {
            const teamMembers = members.filter((m) => m.teamId === t.id);
            const avg = teamMembers.length ? Math.round(teamMembers.reduce((a, m) => a + m.utilizationPct, 0) / teamMembers.length) : 0;
            return (
              <div key={t.id} style={{ padding: "10px 4px", borderBottom: "1px solid var(--outline)" }}>
                <div className="flex between" style={{ marginBottom: 6 }}>
                  <div>
                    <b>{t.name}</b>
                    <span className="subtle" style={{ marginLeft: 8 }}>{t.focus}</span>
                  </div>
                  <b style={{ fontVariantNumeric: "tabular-nums" }}>{avg}%</b>
                </div>
                <Meter value={avg} kind={avg > 85 ? "warn" : avg > 60 ? undefined : "info"} />
                <div className="subtle" style={{ marginTop: 6 }}>Lead: {t.leadName} · {teamMembers.length} members</div>
              </div>
            );
          })}
        </Card>
      </div>

      <div className="row row-2b">
        <Card title="Market Signals" link={{ label: "See market →", href: "/market" }}>
          {marketAll.map((m) => (
            <div key={m.id} style={{ padding: "10px 4px", borderBottom: "1px solid var(--outline)" }}>
              <div className="flex between" style={{ marginBottom: 2 }}>
                <b>{m.name}</b>
                <Pill kind={m.signal === "competitor" ? "live" : m.signal === "partner" ? "confirmed" : "completed"}>{m.signal}</Pill>
              </div>
              <div className="subtle">{m.city} · {fmtDate(m.startsOn)} · {nf.format(m.expectedAttendees ?? 0)} pax</div>
            </div>
          ))}
        </Card>

        <Card title="Latest Reviews" link={{ label: "All reviews →", href: "/reputation" }}>
          <div className="flex" style={{ marginBottom: 12, gap: 16 }}>
            <div>
              <div className="subtle">Average</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {avgRep}<span className="muted" style={{ fontSize: 14 }}>/ 5</span>
              </div>
            </div>
            <div className="stars">★★★★★</div>
          </div>
          {reviews.slice(0, 3).map((r) => (
            <div className="review" key={r.id} style={{ paddingLeft: 0, paddingRight: 0 }}>
              <div className="head">
                <span className="who">{r.author}</span>
                <span className="subtle">{r.source} · {fmtDate(r.reviewedOn)}</span>
              </div>
              <div className="quote">{r.quote}</div>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
