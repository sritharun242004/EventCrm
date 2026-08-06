import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { moneyShort, pct, sumPaise } from "@/lib/money";
import { fmtDate, fmtDateFull, nf } from "@/lib/dates";
import { statusClass, statusLabel, typeLabel, rfqStatusLabel, categoryLabel } from "@/lib/format";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi, KpiRow } from "@/components/ui/Kpi";
import { Pill } from "@/components/ui/Pill";
import { Meter } from "@/components/ui/Meter";
import { Card } from "@/components/ui/Card";
import { NoteEditor } from "./NoteEditor";

export const revalidate = 30;

type Props = { params: Promise<{ code: string }> };

export default async function EventDetail({ params }: Props) {
  const { code } = await params;

  const evt = await db.event.findUnique({
    where: { code },
    include: {
      client: true,
      venue: true,
      leadTeam: { include: { members: true } },
      budgets: true,
      tiers: true,
      sponsors: true,
      assignments: { include: { member: true } },
      rfqs: { include: { quotes: { include: { vendor: true } } } },
    },
  });
  if (!evt) notFound();

  const planned = sumPaise(evt.budgets, (b) => b.plannedCents);
  const actual = sumPaise(evt.budgets, (b) => b.actualCents);
  const marginPct = pct(BigInt(Number(evt.projectedRevenueCents) - Number(evt.totalBudgetCents)), evt.projectedRevenueCents);
  const days = Math.max(1, Math.round((new Date(evt.endsOn).getTime() - new Date(evt.startsOn).getTime()) / 86400000) + 1);

  const totalSold = evt.tiers.reduce((a, t) => a + t.sold, 0);
  const totalInv = evt.tiers.reduce((a, t) => a + t.inventory, 0);
  const totalTicketRev = evt.tiers.reduce((a, t) => a + t.sold * Number(t.priceCents), 0);
  const totalSponsor = sumPaise(evt.sponsors, (s) => s.amountCents);

  return (
    <>
      <PageHead
        crumb={`${evt.code} · ${typeLabel(evt.type)}`}
        title={evt.name}
        subtitle={`${fmtDateFull(evt.startsOn)}${new Date(evt.endsOn).getTime() !== new Date(evt.startsOn).getTime() ? " → " + fmtDate(evt.endsOn) : ""} · ${evt.venue?.name} · ${evt.venue?.city}`}
        actions={
          <>
            <Link className="btn ghost" href="/events">← All events</Link>
          </>
        }
      />

      <div className="flex" style={{ gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Pill kind={statusClass(evt.status) as any} dot>{statusLabel(evt.status)}</Pill>
        <span className="pill" style={{ background: "var(--container)", color: "var(--ink-2)" }}>{typeLabel(evt.type)}</span>
        <span className="pill" style={{ background: "var(--container)", color: "var(--ink-2)" }}>{evt.leadTeam?.name ?? "No team"}</span>
        <span className="pill" style={{ background: "var(--container)", color: "var(--ink-2)" }}>{evt.client?.company ?? "No client"}</span>
      </div>

      <KpiRow>
        <Kpi
          label="Attendees"
          value={nf.format(evt.confirmedAttendees)}
          unit={`/ ${nf.format(evt.expectedAttendees)}`}
          delta={`${pct(evt.confirmedAttendees, evt.expectedAttendees)}%`}
          deltaKind={evt.confirmedAttendees >= evt.expectedAttendees * 0.9 ? "up" : "neutral"}
          note="confirmed"
        />
        <Kpi
          label="Booked Revenue"
          value={moneyShort(evt.bookedRevenueCents)}
          delta={`${pct(evt.bookedRevenueCents, evt.projectedRevenueCents)}%`}
          deltaKind={Number(evt.bookedRevenueCents) >= Number(evt.projectedRevenueCents) * 0.8 ? "up" : "neutral"}
          note={`of ${moneyShort(evt.projectedRevenueCents)} projected`}
        />
        <Kpi
          label="Budget"
          value={moneyShort(evt.spentCents)}
          unit={`/ ${moneyShort(evt.totalBudgetCents)}`}
          delta={`${pct(evt.spentCents, evt.totalBudgetCents)}%`}
          deltaKind={pct(evt.spentCents, evt.totalBudgetCents) > 90 ? "down" : "up"}
          note="used"
        />
        <Kpi
          label="Margin @ Plan"
          value={`${marginPct}%`}
          delta={moneyShort(BigInt(Number(evt.projectedRevenueCents) - Number(evt.totalBudgetCents)))}
          deltaKind={marginPct >= 25 ? "up" : "neutral"}
          note="gross"
        />
      </KpiRow>

      <div className="row row-2" style={{ marginBottom: 12 }}>
        <Card title="Highlight">
          <NoteEditor eventId={evt.id} initial={evt.highlight} />
        </Card>
        <Card title="Duration">
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>
            {days} day{days > 1 ? "s" : ""}
          </div>
          <div className="muted">{fmtDate(evt.startsOn)} — {fmtDate(evt.endsOn)}</div>
        </Card>
      </div>

      {/* Budget */}
      <Card title="Budget · category breakdown" sub={`${evt.budgets.length} lines · ${pct(actual, planned)}% used`} style={{ marginBottom: 12 }}>
        {evt.budgets.length === 0 ? (
          <div className="empty">No budget lines yet. Build one from the 1,000-person template.</div>
        ) : (
          <>
            {evt.budgets.map((b) => {
              const p = pct(b.actualCents, b.plannedCents);
              const pctClass = p >= 100 ? "critical" : p >= 90 ? "warn" : "";
              return (
                <div className="bud-row" key={b.id}>
                  <div className="cat">{b.category}</div>
                  <div><Meter value={Math.min(p, 100)} kind={p >= 100 ? "warn" : undefined} /></div>
                  <div className="amt">{moneyShort(b.actualCents)}</div>
                  <div className="amt subtle">{moneyShort(b.plannedCents)}</div>
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
          </>
        )}
      </Card>

      <div className="row row-2b" style={{ marginBottom: 12 }}>
        {/* Team */}
        <Card title={`Assigned team · ${evt.leadTeam?.name ?? "—"}`}>
          {evt.assignments.length === 0 ? (
            <div className="empty">No assignments yet on this event.</div>
          ) : (
            <div className="table-wrap" style={{ border: 0 }}>
              <table>
                <thead><tr><th>Producer</th><th>Role</th><th className="num">Util</th></tr></thead>
                <tbody>
                  {evt.assignments.map((a) => a.member && (
                    <tr key={a.id}>
                      <td>
                        <div className="flex" style={{ gap: 10 }}>
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                            {a.member.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </div>
                          <b>{a.member.name}</b>
                        </div>
                      </td>
                      <td className="muted">{a.role}</td>
                      <td className="num" style={{ minWidth: 140 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Meter value={a.member.utilizationPct} kind={a.member.utilizationPct > 90 ? "warn" : undefined} style={{ width: 80, height: 5 }} />
                          <b>{a.member.utilizationPct}%</b>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Sponsors */}
        <Card title={`Sponsors · ${moneyShort(totalSponsor)}`}>
          {evt.sponsors.length === 0 ? (
            <div className="empty">No sponsors on record.</div>
          ) : (
            <div className="table-wrap" style={{ border: 0 }}>
              <table>
                <thead><tr><th>Sponsor</th><th>Tier</th><th className="num">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {evt.sponsors.map((s) => (
                    <tr key={s.id}>
                      <td><b>{s.name}</b></td>
                      <td className="muted">{s.tier}</td>
                      <td className="num money">{moneyShort(s.amountCents)}</td>
                      <td>
                        <Pill kind={s.status === "paid" ? "completed" : s.status === "signed" ? "confirmed" : "proposed"}>
                          {s.status}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Tickets */}
      {evt.tiers.length > 0 && (
        <Card title="Ticketing" sub={`${nf.format(totalSold)} / ${nf.format(totalInv)} sold · ${moneyShort(totalTicketRev)} revenue`} style={{ marginBottom: 12 }}>
          {evt.tiers.map((t) => {
            const p = pct(t.sold, t.inventory);
            return (
              <div key={t.id} style={{ padding: "10px 4px", borderBottom: "1px solid var(--outline)" }}>
                <div className="flex between" style={{ marginBottom: 4 }}>
                  <div><b>{t.tierName}</b> <span className="muted">· {moneyShort(t.priceCents)}</span></div>
                  <div><b>{nf.format(t.sold)}</b><span className="muted"> / {nf.format(t.inventory)}</span></div>
                </div>
                <Meter value={p} kind={p >= 80 ? "success" : p >= 50 ? "info" : undefined} />
                <div className="subtle" style={{ marginTop: 4 }}>{p}% sold · {moneyShort(t.sold * Number(t.priceCents))} revenue</div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Related RFQs */}
      <Card title="Related RFQs" link={{ label: "Open RFQ workspace →", href: "/rfqs" }}>
        {evt.rfqs.length === 0 ? (
          <div className="empty">No RFQs on this event yet.</div>
        ) : (
          evt.rfqs.map((r) => (
            <Link
              key={r.id}
              href={`/rfqs/${r.code}`}
              className="flex between clickable"
              style={{ padding: "10px 0", borderBottom: "1px solid var(--outline)" }}
            >
              <div>
                <b>{r.title}</b>
                <div className="subtle">{r.code} · {categoryLabel(r.category)} · needed by {fmtDate(r.neededBy)}</div>
              </div>
              <Pill kind={r.status === "awarded" ? "completed" : r.status === "comparing" ? "production" : r.status === "collecting" ? "confirmed" : "proposed"}>
                {rfqStatusLabel(r.status)}
              </Pill>
            </Link>
          ))
        )}
      </Card>
    </>
  );
}
