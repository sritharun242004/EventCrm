"use client";

import { useEffect, useState } from "react";

/**
 * The signature element of the console: a running header that anchors the
 * whole product in real-time. Reads like the top of a broadcast slate or
 * a stage-manager's call sheet — never like a SaaS chrome.
 *
 * Server passes down the currently live event (if any). The clock ticks
 * client-side so the second-counter is always fresh without re-hydrating.
 */
export function RunSheet({
  liveEvent,
  totalToday,
}: {
  liveEvent: { code: string; name: string; day: number; total: number; roomCount: number } | null;
  totalToday: number;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const date = now
    ? now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : "———";
  const time = now
    ? now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "——:——:——";

  return (
    <div className="runsheet" role="status" aria-live="polite">
      <span className="rs-dash">——</span>
      <span>{date}</span>
      <span className="rs-sep">·</span>
      <span className="rs-clock">{time} IST</span>
      <span className="rs-sep">·</span>
      {liveEvent ? (
        <>
          <span className="rs-live">LIVE</span>
          <span>{liveEvent.name}</span>
          <span className="rs-sep">·</span>
          <span>Day {liveEvent.day} / {liveEvent.total}</span>
          <span className="rs-sep">·</span>
          <span>{liveEvent.roomCount.toLocaleString("en-IN")} in room</span>
        </>
      ) : (
        <>
          <span>{totalToday === 0 ? "No live events today" : `${totalToday} events scheduled today`}</span>
        </>
      )}
      <span className="rs-dash" style={{ marginLeft: "auto" }}>——</span>
    </div>
  );
}
