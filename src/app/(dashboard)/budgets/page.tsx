import { db } from "@/lib/db";
import { addPaise, moneyShort, pct, sumPaise } from "@/lib/money";
import { fmtDate, nf } from "@/lib/dates";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi, KpiRow } from "@/components/ui/Kpi";
import { Card } from "@/components/ui/Card";
import { Meter } from "@/components/ui/Meter";
import { BudgetActions } from "./BudgetActions";

export const revalidate = 30;

// 1,000-person capacity template — reusable, per-head pricing (paise).
const TEMPLATE: Array<{ cat: string; perHead: number; note: string }> = [
  { cat: "Sound & AV",  perHead: 85000,  note: "Line-array + monitors + wireless mics" },
  { cat: "Stage",       perHead: 90000,  note: "40x20 modular stage + truss" },
  { cat: "Decor",       perHead: 65000,  note: "Backdrops, florals, signage" },
  { cat: "Lighting",    perHead: 55000,  note: "Front-of-house + intelligent" },
  { cat: "F&B",         perHead: 140000, note: "Buffet dinner + cocktail hour" },
  { cat: "Water",       perHead: 8000,   note: "20L stations + 500ml bottled" },
  { cat: "Contractors", perHead: 42000,  note: "Pipe & drape, prefab BOH" },
  { cat: "Security",    perHead: 32000,  note: "12 bouncers, 12-hour shift" },
  { cat: "Ticketing",   perHead: 18000,  note: "Platform SaaS + scanners" },
  { cat: "Marketing",   perHead: 60000,  note: "Paid social + creator promo" },
  { cat: "Team Cost",   perHead: 50000,  note: "Producers, coord, ops" },
  { cat: "Contingency", perHead: 55000,  note: "~10% buffer of planned" },
];

type Search = Promise<{ event?: string }>;

export default async function BudgetsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;

  const candidates = await db.event.findMany({
    where: { budgets: { some: {} } },
    include: { budgets: true, venue: true },
    orderBy: { startsOn: "asc" },
  });
  if (candidates.length === 0) {
    return (
      <>
        <PageHead crumb="Budgets" title="Budget planner" subtitle="No events have budget lines yet." />
        <div className="empty">Seed the DB or create a budget from an event page.</div>
      </>
    );
  }

  const currentCode = sp.event ?? candidates[candidates.length - 1].code;
  const evt = candidates.find((e) => e.code === currentCode) ?? candidates[0];

  const planned = sumPaise(evt.budgets, (b) => b.plannedCents);
  const actual = sumPaise(evt.budgets, (b) => b.actualCents);
  const perHead = evt.expectedAttendees ? Number(planned) / evt.expectedAttendees : 0;
  const days = Math.max(1, Math.round((new Date(evt.endsOn).getTime() - new Date(evt.startsOn).getTime()) / 86400000) + 1);
  const tplTotal = TEMPLATE.reduce((a, t) => a + t.perHead, 0);

  return (
    <>
      <PageHead
        crumb="Budgets"
        title="Budget planner"
        subtitle="Per-event breakdown with projected vs actual, plus a reusable 1,000-person template."
        actions={
          <>
            <form>
              <select
                name="event"
                defaultValue={currentCode ?? ""}
                style={{
                  padding: "7px 10px",
                  border: "1px solid var(--outline-strong)",
                  background: "var(--surface)",
                  borderRadius: "var(--radius-lg)",
                  fontSize: 13,
                }}
                // Client-only handler kept minimal via a tiny inline hydration below.
                data-native
              >
                {candidates.map((e) => (
                  <option key={e.code} value={e.code!}>{e.name}</option>
                ))}
              </select>
            </form>
            <BudgetActions eventId={evt.id} eventName={evt.name} />
          </>
        }
      />
      {/* Auto-submit the select when it changes — small progressive-enhancement inline script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelectorAll('select[data-native]').forEach(s => s.addEventListener('change', e => { const p = new URLSearchParams(location.search); p.set('event', e.target.value); location.search = p.toString(); }));`,
        }}
      />

      <KpiRow>
        <Kpi label="Total Budget" value={moneyShort(planned)} delta="Approved" deltaKind="neutral" note={`${evt.budgets.length} lines`} />
        <Kpi
          label="Spent"
          value={moneyShort(actual)}
          delta={`${pct(actual, planned)}%`}
          deltaKind={pct(actual, planned) >= 90 ? "down" : "up"}
          note="of budget"
        />
        <Kpi label="Cost per Head" value={`₹${nf.format(Math.round(perHead / 100))}`} delta={`${nf.format(evt.expectedAttendees)} pax`} deltaKind="neutral" note={`${days} day${days > 1 ? "s" : ""}`} />
        <Kpi
          label="Projected Revenue"
          value={moneyShort(evt.projectedRevenueCents)}
          delta={moneyShort(addPaise(evt.projectedRevenueCents, -Number(planned)))}
          deltaKind="up"
          note="margin at plan"
        />
      </KpiRow>

      <div className="row row-2">
        <Card title={`${evt.name} · category breakdown`} sub={`${fmtDate(evt.startsOn)}${new Date(evt.endsOn).getTime() !== new Date(evt.startsOn).getTime() ? " — " + fmtDate(evt.endsOn) : ""} · ${evt.venue?.name ?? ""}`}>
          {evt.budgets.map((l) => {
            const p = pct(l.actualCents, l.plannedCents);
            const pctClass = p >= 100 ? "critical" : p >= 90 ? "warn" : "";
            return (
              <div className="bud-row" key={l.id}>
                <div className="cat">{l.category}</div>
                <div><Meter value={Math.min(p, 100)} kind={p >= 100 ? "warn" : undefined} /></div>
                <div className="amt">{moneyShort(l.actualCents)}</div>
                <div className="amt subtle">{moneyShort(l.plannedCents)}</div>
                <div className={"pct " + pctClass}>{p}%</div>
              </div>
            );
          })}
          <div className="hr" />
          <div className="bud-row" style={{ fontWeight: 700 }}>
            <div className="cat">Total</div>
            <div />
            <div className="amt">{moneyShort(actual)}</div>
            <div className="amt subtle">{moneyShort(planned)}</div>
            <div className={"pct " + (pct(actual, planned) >= 90 ? "warn" : "")}>{pct(actual, planned)}%</div>
          </div>
        </Card>

        <Card title="1,000-person capacity template" sub={`₹${nf.format(Math.round(tplTotal / 100))} / head`}>
          {TEMPLATE.map((t) => (
            <div key={t.cat} className="flex between" style={{ padding: "8px 4px", borderBottom: "1px solid var(--outline)" }}>
              <div>
                <b>{t.cat}</b>
                <div className="subtle">{t.note}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <b>₹{nf.format(t.perHead / 100)}</b>
                <div className="subtle">₹{nf.format((t.perHead * 1000) / 100)} @ 1k</div>
              </div>
            </div>
          ))}
          <div className="hr" />
          <div className="flex between" style={{ fontWeight: 700, padding: 4 }}>
            <div>Ballpark @ 1,000 pax</div>
            <div>
              ₹{nf.format((tplTotal * 1000) / 100)}
              <span className="subtle" style={{ fontWeight: 500, marginLeft: 6 }}>plan · pre-negotiation</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
