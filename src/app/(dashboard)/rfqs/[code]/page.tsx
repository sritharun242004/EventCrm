import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { moneyShort, pct } from "@/lib/money";
import { fmtDate, nf } from "@/lib/dates";
import { categoryLabel, rfqStatusLabel, quoteStatusLabel } from "@/lib/format";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi, KpiRow } from "@/components/ui/Kpi";
import { Pill } from "@/components/ui/Pill";
import { Meter } from "@/components/ui/Meter";
import { Card } from "@/components/ui/Card";

export const revalidate = 30;

type Props = { params: Promise<{ code: string }> };

export default async function RfqDetail({ params }: Props) {
  const { code } = await params;

  const r = await db.rfq.findUnique({
    where: { code },
    include: {
      event: true,
      items: true,
      quotes: { include: { vendor: true } },
    },
  });
  if (!r) notFound();

  const priced = r.quotes.filter((q) => q.quotedCents != null);
  const sorted = [...priced].sort((a, b) => Number(a.quotedCents) - Number(b.quotedCents));
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const spread = lowest && highest && lowest !== highest ? Number(highest.quotedCents) - Number(lowest.quotedCents) : 0;

  const now = new Date();
  const kindForStatus = (s: string) =>
    s === "awarded" ? "completed"
    : s === "comparing" ? "production"
    : s === "collecting" ? "confirmed"
    : s === "sent" ? "lead"
    : "proposed";

  return (
    <>
      <PageHead
        crumb={<><Link href="/rfqs" style={{ color: "var(--primary)", fontWeight: 700 }}>← RFQs</Link>{` · ${r.code}`}</>}
        title={r.title}
        subtitle={`${categoryLabel(r.category)} · needed by ${fmtDate(r.neededBy)} · linked to ${r.event?.name ?? ""}`}
        actions={
          <>
            <button className="btn">Duplicate</button>
            <button className="btn">Send reminder</button>
            <button className="btn primary" disabled={r.status === "awarded"}>
              Award {lowest ? "· " + moneyShort(lowest.quotedCents) : ""}
            </button>
          </>
        }
      />

      {r.event ? (
        <div style={{ marginTop: -12, marginBottom: 16 }}>
          <Link className="pill confirmed" href={`/events/${r.event.code}`}>
            Event: {r.event.name}
          </Link>
        </div>
      ) : null}

      <KpiRow>
        <Kpi
          label="Status"
          value={<Pill kind={kindForStatus(r.status) as any} dot>{rfqStatusLabel(r.status)}</Pill>}
          note={r.sentAt ? "Sent " + fmtDate(r.sentAt) : "Not sent yet"}
        />
        <Kpi
          label="Budget Ceiling"
          value={moneyShort(r.budgetCeilingCents)}
          delta={
            lowest && Number(lowest.quotedCents) <= Number(r.budgetCeilingCents ?? 0n)
              ? `${Math.round(((Number(r.budgetCeilingCents) - Number(lowest.quotedCents)) / Number(r.budgetCeilingCents)) * 100)}% headroom`
              : "no bids"
          }
          deltaKind={lowest && Number(lowest.quotedCents) <= Number(r.budgetCeilingCents ?? 0n) ? "up" : "down"}
        />
        <Kpi
          label="Responses"
          value={r.quotes.filter((q) => q.status !== "pending").length}
          unit={`/ ${r.quotes.length}`}
          note={`${r.quotes.filter((q) => q.status === "pending").length} pending`}
        />
        <Kpi label="Spread" value={spread ? moneyShort(spread) : "—"} note="low → high delta" />
      </KpiRow>

      <div className="row row-2">
        <Card title="What we're asking for">
          <div className="table-wrap" style={{ border: 0 }}>
            <table>
              <thead>
                <tr><th>SKU / Item</th><th className="num">Qty</th><th>Unit</th><th>Specs</th></tr>
              </thead>
              <tbody>
                {r.items.map((i) => (
                  <tr key={i.id}>
                    <td><b>{i.sku}</b></td>
                    <td className="num">{nf.format(i.quantity)}</td>
                    <td className="muted">{i.unit}</td>
                    <td className="muted">{i.specs ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hr" />
          <div className="muted">Notes: {r.notes ?? "—"}</div>
        </Card>

        <Card title="Timeline">
          <div className="timeline">
            <div className={"tl-item " + (r.sentAt ? "done" : "")}>
              <div className="when">{r.sentAt ? fmtDate(r.sentAt) : "—"}</div>
              <div className="what">RFQ dispatched</div>
              <div className="who">{r.createdBy ?? "—"}</div>
            </div>
            <div className={"tl-item " + (r.quotes.some((q) => q.submittedAt) ? "done" : "")}>
              <div className="when">Rolling</div>
              <div className="what">Vendor responses</div>
              <div className="who">
                {r.quotes.filter((q) => q.submittedAt).length} of {r.quotes.length} in
              </div>
            </div>
            <div className={"tl-item " + (r.closesAt && new Date(r.closesAt) < now ? "done" : "")}>
              <div className="when">{r.closesAt ? fmtDate(r.closesAt) : "—"}</div>
              <div className="what">RFQ closes</div>
              <div className="who">Cutoff for submissions</div>
            </div>
            <div className={"tl-item " + (r.status === "awarded" ? "done" : "")}>
              <div className="when">Post-close</div>
              <div className="what">Award + booking</div>
              <div className="who">Producer + Vendor Ops</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="sec-title">Compare quotes</div>

      <div
        className="quote-grid"
        style={{ gridTemplateColumns: `220px repeat(${r.quotes.length}, minmax(200px, 1fr))` }}
      >
        <div className="qh">Metric</div>
        {r.quotes.map((q) => (
          <div className="qh" key={"h-" + q.id}>
            <div style={{ textTransform: "none", letterSpacing: "normal" }}>
              <b style={{ fontSize: 13, color: "var(--ink)" }}>{q.vendor?.name}</b><br />
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {q.vendor?.city} · {q.vendor && Number(q.vendor.rating).toFixed(1)}★
              </span>
            </div>
          </div>
        ))}

        <div className="qlabel">Quote</div>
        {r.quotes.map((q) => {
          const cls = q.quotedCents == null ? "" : q === lowest ? "winner" : q === highest && sorted.length > 1 ? "high" : "";
          return (
            <div className={"qval big " + cls} key={"q-" + q.id}>
              {q.quotedCents != null ? moneyShort(q.quotedCents) : <span className="muted">pending</span>}
            </div>
          );
        })}

        <div className="qlabel">vs Ceiling</div>
        {r.quotes.map((q) => {
          if (q.quotedCents == null) return <div className="qval muted" key={"c-" + q.id}>—</div>;
          const ceiling = Number(r.budgetCeilingCents ?? 0n);
          const delta = Number(q.quotedCents) - ceiling;
          const p = ceiling ? Math.round((Math.abs(delta) / ceiling) * 100) : 0;
          return (
            <div className="qval" key={"c-" + q.id}>
              {delta <= 0 ? (
                <><span style={{ color: "var(--success)", fontWeight: 700 }}>−{p}%</span> under</>
              ) : (
                <><span style={{ color: "var(--critical)", fontWeight: 700 }}>+{p}%</span> over</>
              )}
            </div>
          );
        })}

        <div className="qlabel">Lead time</div>
        {r.quotes.map((q) => (
          <div className="qval" key={"l-" + q.id}>
            {q.leadTimeDays != null ? q.leadTimeDays + " days" : <span className="muted">—</span>}
          </div>
        ))}

        <div className="qlabel">Reliability</div>
        {r.quotes.map((q) => (
          <div className="qval" key={"r-" + q.id}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Meter
                value={q.vendor?.reliabilityPct ?? 0}
                kind={
                  (q.vendor?.reliabilityPct ?? 0) >= 95 ? "success"
                  : (q.vendor?.reliabilityPct ?? 0) >= 90 ? undefined
                  : "warn"
                }
                style={{ width: 60, height: 5 }}
              />
              <b>{q.vendor?.reliabilityPct ?? 0}%</b>
            </div>
          </div>
        ))}

        <div className="qlabel">Preferred</div>
        {r.quotes.map((q) => (
          <div className="qval" key={"p-" + q.id}>
            {q.vendor?.preferred ? <Pill kind="completed">Yes</Pill> : <span className="muted">—</span>}
          </div>
        ))}

        <div className="qlabel">Notes</div>
        {r.quotes.map((q) => (
          <div className="qval muted" style={{ fontSize: 12 }} key={"n-" + q.id}>{q.notes ?? "—"}</div>
        ))}

        <div className="qlabel">Status</div>
        {r.quotes.map((q) => {
          const kind = q.status === "shortlisted" || q.status === "awarded" ? "completed"
            : q.status === "submitted" ? "confirmed"
            : "proposed";
          return (
            <div className="qval" key={"s-" + q.id}>
              <Pill kind={kind as any}>{quoteStatusLabel(q.status)}</Pill>
            </div>
          );
        })}

        <div className="qlabel">Action</div>
        {r.quotes.map((q) => (
          <div className="qval" key={"a-" + q.id}>
            {q.status === "pending" ? (
              <button className="btn ghost" style={{ padding: "4px 10px", fontSize: 12 }}>Nudge</button>
            ) : q.status === "awarded" ? (
              <Pill kind="completed">Awarded</Pill>
            ) : (
              <button className="btn primary" style={{ padding: "4px 10px", fontSize: 12 }}>
                {q === lowest ? "Award" : "Consider"}
              </button>
            )}
          </div>
        ))}
      </div>

      {lowest && lowest !== highest ? (
        <Card style={{ marginTop: 16, borderLeft: "3px solid var(--success)" }} title="Recommendation">
          <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55 }}>
            <b>{lowest.vendor?.name}</b> is the lowest bid at <b>{moneyShort(lowest.quotedCents)}</b> —
            {" "}
            {Math.round(((Number(r.budgetCeilingCents) - Number(lowest.quotedCents)) / Number(r.budgetCeilingCents)) * 100)}% under
            the ceiling, with a {lowest.leadTimeDays}-day lead time. The spread between the lowest and highest bid is
            {" "}
            <b>{moneyShort(spread)}</b> — significant enough to negotiate the highest quote down or confirm with the leader.
          </div>
        </Card>
      ) : null}
    </>
  );
}
