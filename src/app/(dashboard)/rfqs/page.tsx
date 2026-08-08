import Link from "next/link";
import { db } from "@/lib/db";
import { moneyShort, pct, sumPaise } from "@/lib/money";
import { fmtDate } from "@/lib/dates";
import { categoryLabel, rfqStatusLabel } from "@/lib/format";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi, KpiRow } from "@/components/ui/Kpi";
import { Pill } from "@/components/ui/Pill";
import type { RfqStatus } from "@prisma/client";
import { RfqActions } from "./RfqActions";

export const revalidate = 30;

const ORDER: RfqStatus[] = ["draft", "sent", "collecting", "comparing", "awarded"];

export default async function RfqsPage() {
  const [rfqs, events] = await Promise.all([db.rfq.findMany({
    include: { event: true, quotes: true },
    orderBy: { createdAt: "desc" },
  }), db.event.findMany({ select: { id: true, name: true }, orderBy: { startsOn: "desc" }, take: 100 })]);

  const totalCeiling = sumPaise(rfqs, (r) => r.budgetCeilingCents);
  const allQuotes = rfqs.flatMap((r) => r.quotes);
  const quotesIn = allQuotes.filter((q) => q.status !== "pending").length;
  const activeVendors = new Set(allQuotes.map((q) => q.vendorId)).size;

  const grouped: Record<string, typeof rfqs> = Object.fromEntries(ORDER.map((k) => [k, []]));
  rfqs.forEach((r) => (grouped[r.status] ??= []).push(r));

  return (
    <>
      <PageHead
        crumb="Procurement · RFQ workspace"
        title="Vendor RFQs"
        subtitle="Create requests, send to vendors, compare quotes side-by-side, and award — all in one flow."
        actions={
          <RfqActions events={events} />
        }
      />

      <KpiRow>
        <Kpi
          label="Open RFQs"
          value={rfqs.filter((r) => r.status !== "awarded" && r.status !== "cancelled").length}
          delta={`${rfqs.length} total`}
          deltaKind="neutral"
          note="this quarter"
        />
        <Kpi label="Budget in Play" value={moneyShort(totalCeiling)} delta="Ceilings" deltaKind="neutral" note={`${rfqs.length} RFQs`} />
        <Kpi
          label="Quote Response"
          value={quotesIn}
          unit={`/ ${allQuotes.length}`}
          delta={`${pct(quotesIn, allQuotes.length)}%`}
          deltaKind={pct(quotesIn, allQuotes.length) >= 70 ? "up" : "neutral"}
          note="vendors returned"
        />
        <Kpi label="Active Vendors" value={activeVendors} delta="quoting" deltaKind="up" note="across all RFQs" />
      </KpiRow>

      <div className="filters">
        {["All", "Comparing", "Collecting", "Sent", "Draft", "Awarded"].map((c, i) => (
          <span key={c} className={"chip " + (i === 0 ? "on" : "")}>{c}</span>
        ))}
      </div>

      {ORDER.map((status) => {
        const list = grouped[status] ?? [];
        if (list.length === 0) return null;
        return (
          <div key={status}>
            <div className="sec-title">{rfqStatusLabel(status)} ({list.length})</div>
            <div className="row row-2" style={{ marginBottom: 12 }}>
              {list.map((r) => {
                const quotes = r.quotes;
                const returned = quotes.filter((q) => q.status !== "pending").length;
                const priced = quotes.filter((q) => q.quotedCents != null).map((q) => Number(q.quotedCents));
                const lowest = priced.length ? Math.min(...priced) : null;
                return (
                  <Link key={r.id} href={`/rfqs/${r.code}`} className={"rfq-card " + status}>
                    <div className="flex between" style={{ marginBottom: 6 }}>
                      <b>{r.title}</b>
                      <Pill
                        kind={
                          status === "awarded" ? "completed"
                          : status === "comparing" ? "production"
                          : status === "collecting" ? "confirmed"
                          : status === "sent" ? "lead"
                          : "proposed"
                        }
                      >
                        {rfqStatusLabel(status)}
                      </Pill>
                    </div>
                    <div className="subtle" style={{ marginBottom: 10 }}>
                      {r.code} · {categoryLabel(r.category)} · needed {fmtDate(r.neededBy)}
                    </div>
                    <div className="row row-3" style={{ gap: 12 }}>
                      <div>
                        <div className="subtle">Ceiling</div>
                        <b>{moneyShort(r.budgetCeilingCents)}</b>
                      </div>
                      <div>
                        <div className="subtle">Responses</div>
                        <b>{returned} / {quotes.length}</b>
                      </div>
                      <div>
                        <div className="subtle">Lowest bid</div>
                        <b>{lowest ? moneyShort(lowest) : "—"}</b>
                      </div>
                    </div>
                    <div className="hr" />
                    <div className="subtle">
                      Linked event: <b style={{ color: "var(--ink)", fontWeight: 600 }}>{r.event?.name ?? "—"}</b>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
