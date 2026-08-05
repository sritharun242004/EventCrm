import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { PageHead } from "@/components/ui/PageHead";
import { Kpi, KpiRow } from "@/components/ui/Kpi";
import { Card } from "@/components/ui/Card";
import { Meter } from "@/components/ui/Meter";

export const revalidate = 60;

export default async function ReputationPage() {
  const [reviews, eventsWithRep] = await Promise.all([
    db.eventReview.findMany({
      include: { event: true },
      orderBy: { reviewedOn: "desc" },
    }),
    db.event.findMany({
      where: { reputationScore: { not: null } },
      orderBy: { reputationScore: "desc" },
    }),
  ]);

  const avg = reviews.length
    ? (reviews.reduce((a, r) => a + Number(r.score), 0) / reviews.length).toFixed(2)
    : "—";
  const nps = reviews.length
    ? Math.round(reviews.reduce((a, r) => a + (r.nps ?? 0), 0) / reviews.length)
    : 0;

  const bySource: Record<string, number> = {};
  reviews.forEach((r) => {
    const s = r.source ?? "other";
    bySource[s] = (bySource[s] ?? 0) + 1;
  });

  return (
    <>
      <PageHead
        crumb="Reputation & Advocacy"
        title="Reputation"
        subtitle="Post-event scores, NPS, and press mentions across sources."
        actions={
          <>
            <button className="btn">Send survey</button>
            <button className="btn primary">Request review</button>
          </>
        }
      />

      <KpiRow>
        <Kpi label="Composite Score" value={avg} unit="/ 5" delta="+0.12" deltaKind="up" note="last 90 days" />
        <Kpi label="Net Promoter" value={nps} delta="+6" deltaKind="up" note={`${reviews.length} responses`} />
        <Kpi label="Repeat Clients" value="6" delta="+2" deltaKind="up" note="of 8 total" />
        <Kpi label="Press Mentions" value="42" delta="+14" deltaKind="up" note="this quarter" />
      </KpiRow>

      <div className="row row-2">
        <Card title="Recent reviews">
          {reviews.map((r) => (
            <div className="review" key={r.id}>
              <div className="head">
                <span className="who">
                  {r.author}
                  <span className="subtle" style={{ fontWeight: 500, marginLeft: 6 }}>
                    {r.source} · {fmtDate(r.reviewedOn)}
                  </span>
                </span>
                <span className="stars">{"★".repeat(Math.round(Number(r.score))) + "☆".repeat(5 - Math.round(Number(r.score)))}</span>
              </div>
              <div className="quote">{r.quote}</div>
              <div className="subtle" style={{ marginTop: 6 }}>{r.event?.name ?? ""}</div>
            </div>
          ))}
        </Card>

        <div>
          <Card title="Score by event" style={{ marginBottom: 12 }}>
            {eventsWithRep.map((e) => (
              <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--outline)" }}>
                <div className="flex between">
                  <b style={{ fontSize: 13 }}>{e.name}</b>
                  <b>{Number(e.reputationScore).toFixed(1)}★</b>
                </div>
                <Meter value={(Number(e.reputationScore) / 5) * 100} kind="success" style={{ marginTop: 4 }} />
              </div>
            ))}
          </Card>
          <Card title="By channel">
            {Object.entries(bySource).map(([s, n]) => (
              <div key={s} className="flex between" style={{ padding: "8px 4px", borderBottom: "1px solid var(--outline)" }}>
                <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{s}</span>
                <b>{n}</b>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
