import { db } from "@/lib/db";
import { moneyShort } from "@/lib/money";
import { fmtDate, nf } from "@/lib/dates";
import { typeLabel } from "@/lib/format";
import { PageHead } from "@/components/ui/PageHead";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ChipLink } from "@/components/ui/ChipLink";
import { ActionButton } from "@/components/ui/Toast";

export const revalidate = 60;

type Search = Promise<{ signal?: string }>;

export default async function MarketPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const filter = sp.signal;

  const items = await db.marketIntel.findMany({
    where: filter ? { signal: filter } : undefined,
    orderBy: { startsOn: "asc" },
  });

  const buckets = {
    competitor: items.filter((i) => i.signal === "competitor"),
    partner: items.filter((i) => i.signal === "partner"),
    opportunity: items.filter((i) => i.signal === "opportunity"),
  };

  return (
    <>
      <PageHead
        crumb="Market intelligence"
        title="Events in the market"
        subtitle="Signals from competitor, partner, and opportunity events across the region."
        actions={
          <>
            <ActionButton label="Import calendar" toastMsg="ICS import — coming soon" />
            <ActionButton label="Add signal" toastMsg="Add signal form — coming soon" variant="primary" />
          </>
        }
      />

      <div className="filters">
        <ChipLink href="/market" label="All signals" active={!filter} />
        <ChipLink href="/market?signal=competitor" label="Competitor" active={filter === "competitor"} />
        <ChipLink href="/market?signal=partner" label="Partner" active={filter === "partner"} />
        <ChipLink href="/market?signal=opportunity" label="Opportunity" active={filter === "opportunity"} />
      </div>

      <div className="row row-2b">
        {items.map((m) => (
          <Card
            key={m.id}
            title={m.name}
            link={undefined}
          >
            <div style={{ marginTop: -8, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div className="muted">{m.organizer} · {m.city}</div>
              <Pill
                kind={
                  m.signal === "competitor" ? "live"
                  : m.signal === "partner" ? "confirmed"
                  : "completed"
                }
              >
                {m.signal}
              </Pill>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, margin: "12px 0" }}>
              <div>
                <div className="subtle">Date</div>
                <b>{fmtDate(m.startsOn)}</b>
              </div>
              <div>
                <div className="subtle">Expected</div>
                <b>{nf.format(m.expectedAttendees ?? 0)} pax</b>
              </div>
              <div>
                <div className="subtle">Est. Ticket</div>
                <b>{m.estTicketPriceCents && Number(m.estTicketPriceCents) > 0 ? moneyShort(m.estTicketPriceCents) : "Free"}</b>
              </div>
            </div>
            <div className="hr" />
            <div className="muted" style={{ fontSize: 13 }}>{m.notes}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{m.type ? typeLabel(m.type) : ""}</div>
            <div className="flex" style={{ marginTop: 12, gap: 8 }}>
              <button className="btn">Notes</button>
              <button className="btn primary" style={{ padding: "5px 10px", fontSize: 12 }}>Add to watchlist</button>
            </div>
          </Card>
        ))}
      </div>

      <Card title="Positioning · this quarter" style={{ marginTop: 16 }}>
        <div className="row row-3" style={{ gap: 14 }}>
          <div>
            <div className="subtle">Direct competitors this quarter</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{buckets.competitor.length}</div>
            <div className="subtle">Watch date overlaps and share-of-voice.</div>
          </div>
          <div>
            <div className="subtle">Partner opportunities</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{buckets.partner.length}</div>
            <div className="subtle">Warm intros — book meetings this month.</div>
          </div>
          <div>
            <div className="subtle">Open RFPs / new formats</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{buckets.opportunity.length}</div>
            <div className="subtle">Windows opening in the next 60 days.</div>
          </div>
        </div>
      </Card>
    </>
  );
}
