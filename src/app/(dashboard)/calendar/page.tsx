import Link from "next/link";
import { db } from "@/lib/db";
import { fmtDate, fmtDateFull, nf } from "@/lib/dates";
import { statusClass, statusLabel } from "@/lib/format";
import { Pill } from "@/components/ui/Pill";
import { CalendarClient } from "./CalendarClient";

// Month view — new events land after revalidate; the createEvent action also
// force-revalidates so a freshly-created event still shows up immediately.
export const revalidate = 30;

type Search = Promise<{ y?: string; m?: string }>;

export default async function CalendarPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const y = Number(sp.y ?? new Date().getFullYear());
  const m = Number(sp.m ?? new Date().getMonth());

  const [events, venues] = await Promise.all([
    db.event.findMany({
      include: { venue: true },
      orderBy: { startsOn: "asc" },
    }),
    db.venue.findMany({ orderBy: { name: "asc" } }),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const calEvents = events.map((e) => ({
    id: e.id,
    code: e.code ?? "",
    name: e.name,
    status: e.status,
    startsOn: e.startsOn.toISOString(),
    endsOn: e.endsOn.toISOString(),
    startsAt: e.startsAt ? e.startsAt.toISOString() : null,
    time: e.startsAt
      ? new Date(e.startsAt).toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }).replace(":00", "")
      : null,
  }));

  const nextEvents = events
    .filter((e) => new Date(e.startsOn) >= new Date())
    .slice(0, 6);

  return (
    <>
      <CalendarClient
        year={y}
        month={m}
        events={calEvents}
        todayIso={todayIso}
      />

      <div className="row row-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-head"><h3>Load-in schedule · next 30 days</h3></div>
          {nextEvents.map((e) => (
            <Link
              key={e.id}
              href={`/events/${e.code}`}
              className="flex between clickable"
              style={{ padding: "10px 0", borderBottom: "1px solid var(--outline)" }}
            >
              <div>
                <b>{e.name}</b><br />
                <span className="subtle">{e.venue?.name ?? "—"} · {fmtDateFull(e.startsOn)}</span>
              </div>
              <Pill kind={statusClass(e.status) as any} dot>{statusLabel(e.status)}</Pill>
            </Link>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><h3>Venue blocks</h3></div>
          {venues.map((v) => {
            const cnt = events.filter((e) => e.venue?.id === v.id).length;
            return (
              <div
                key={v.id}
                className="flex between"
                style={{ padding: "8px 0", borderBottom: "1px solid var(--outline)" }}
              >
                <div>
                  <b>{v.name}</b><br />
                  <span className="subtle">{v.city} · {nf.format(v.capacity ?? 0)} cap</span>
                </div>
                <span className="muted">{cnt} event{cnt === 1 ? "" : "s"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
