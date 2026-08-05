"use client";

import Link from "next/link";
import { useMemo } from "react";

type CalEvent = {
  id: number;
  code: string;
  name: string;
  status: string;
  startsOn: string;
  endsOn: string;
  startsAt: string | null;
  time: string | null;
};

/**
 * Redesigned calendar: no modal, no dialog. Every date cell is a real
 * <Link> to /calendar/new?date=YYYY-MM-DD. The create form lives on its own
 * page, so "closing" the form is just router-back — always works.
 */
export function CalendarClient({
  year,
  month,
  events,
  todayIso,
}: {
  year: number;
  month: number;
  events: CalEvent[];
  todayIso: string;
}) {
  const monthName = new Date(year, month, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    type Cell = { d: number; oob: boolean; iso: string };
    const out: Cell[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      out.push({ d: prevMonthDays - i, oob: true, iso: "" });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      out.push({ d, oob: false, iso });
    }
    while (out.length < 42) {
      out.push({ d: out.length - daysInMonth - startOffset + 1, oob: true, iso: "" });
    }
    return out;
  }, [year, month]);

  const eventsOn = (iso: string) =>
    events.filter((e) => iso >= e.startsOn.slice(0, 10) && iso <= e.endsOn.slice(0, 10));

  const prevQS = new URLSearchParams({
    y: String(month === 0 ? year - 1 : year),
    m: String((month + 11) % 12),
  }).toString();
  const nextQS = new URLSearchParams({
    y: String(month === 11 ? year + 1 : year),
    m: String((month + 1) % 12),
  }).toString();

  function statusClass(s: string) {
    return s === "in_production" ? "production" : s;
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">Programming Calendar</div>
          <h1>Calendar</h1>
          <p>Click any date to schedule an event. Click any event chip to open its brief.</p>
        </div>
        <div className="page-actions">
          <Link className="btn ghost" href={`?${prevQS}`}>‹ Prev</Link>
          <div style={{ minWidth: 150, textAlign: "center", fontWeight: 700 }}>{monthName}</div>
          <Link className="btn ghost" href={`?${nextQS}`}>Next ›</Link>
          <Link className="btn" href="/calendar">Today</Link>
          <Link className="btn primary" href={`/calendar/new?date=${todayIso}`}>New event</Link>
        </div>
      </div>

      <div className="legend" style={{ marginBottom: 12 }}>
        <span><i style={{ background: "var(--live)" }} />Live</span>
        <span><i style={{ background: "var(--warn)" }} />In production</span>
        <span><i style={{ background: "var(--info)" }} />Confirmed</span>
        <span><i style={{ background: "var(--ok)" }} />Completed</span>
        <span><i style={{ background: "var(--rule-strong)" }} />Proposed</span>
      </div>

      <div className="cal">
        <div className="cal-head">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((c, i) => {
            const list = c.oob ? [] : eventsOn(c.iso);
            const isToday = !c.oob && c.iso === todayIso;
            const cellClass = "cal-cell " + (c.oob ? "oob" : "clickable") + (isToday ? " today" : "");

            if (c.oob) {
              return (
                <div key={i} className={cellClass}>
                  <div className="day-n">{c.d}</div>
                </div>
              );
            }

            return (
              <div key={i} className={cellClass}>
                {/* Full-cell background link so the whole date is a click target */}
                <Link
                  href={`/calendar/new?date=${c.iso}`}
                  className="cal-add"
                  aria-label={`Add event on ${c.iso}`}
                  title={`Add event on ${c.iso}`}
                />
                <div className="day-n">{c.d}</div>
                {list.map((e) => (
                  <Link
                    key={e.id}
                    href={`/events/${e.code}`}
                    className={"cal-evt " + statusClass(e.status)}
                    title={`${e.name}${e.time ? " · " + e.time : ""}`}
                  >
                    {e.time ? <b style={{ marginRight: 4 }}>{e.time}</b> : null}
                    {e.name}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
