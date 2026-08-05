"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createEvent } from "./actions";
import { toast } from "@/components/ui/Toast";

type CalEvent = {
  id: number;
  code: string;
  name: string;
  status: string;
  startsOn: string;
  endsOn: string;
  startsAt: string | null;
  time: string | null; // pre-formatted "6:00 PM"
};

type VenueOpt = { id: number; name: string; city: string | null };
type ClientOpt = { id: number; name: string; company: string | null };

export function CalendarClient({
  year,
  month,
  events,
  venues,
  clients,
  todayIso,
}: {
  year: number;
  month: number; // 0-indexed
  events: CalEvent[];
  venues: VenueOpt[];
  clients: ClientOpt[];
  todayIso: string;
}) {
  const router = useRouter();
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  // Esc to close, and prevent background scroll while open
  useEffect(() => {
    if (!dialogDate) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDialogDate(null); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [dialogDate]);

  const monthName = new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });

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

  const prevQS = new URLSearchParams({ y: String(month === 0 ? year - 1 : year), m: String((month + 11) % 12) }).toString();
  const nextQS = new URLSearchParams({ y: String(month === 11 ? year + 1 : year), m: String((month + 1) % 12) }).toString();

  function statusClass(s: string) {
    return s === "in_production" ? "production" : s;
  }

  function onSubmit(form: FormData) {
    startSaving(async () => {
      const res = await createEvent({
        name: String(form.get("name") ?? ""),
        type: String(form.get("type") ?? "corporate"),
        date: String(form.get("date") ?? ""),
        startTime: String(form.get("startTime") ?? ""),
        endTime: String(form.get("endTime") ?? ""),
        venueId: String(form.get("venueId") ?? ""),
        clientId: String(form.get("clientId") ?? ""),
        expected: String(form.get("expected") ?? ""),
        notes: String(form.get("notes") ?? ""),
      });
      if (res.ok) {
        toast(`Event ${res.code} created`, "ok");
        setDialogDate(null);
        router.refresh();
      } else {
        toast(res.error, "err");
      }
    });
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
          <button className="btn primary" onClick={() => setDialogDate(todayIso)}>New event</button>
        </div>
      </div>

      <div className="legend" style={{ marginBottom: 12 }}>
        <span><i style={{ background: "var(--critical-tint)", border: "1px solid var(--critical)" }} />Live</span>
        <span><i style={{ background: "var(--warning-tint)", border: "1px solid var(--warning)" }} />In production</span>
        <span><i style={{ background: "var(--info-tint)", border: "1px solid var(--info)" }} />Confirmed</span>
        <span><i style={{ background: "var(--success-tint)", border: "1px solid var(--success)" }} />Completed</span>
        <span><i style={{ background: "var(--container)", border: "1px solid var(--outline-strong)" }} />Proposed</span>
      </div>

      <div className="cal">
        <div className="cal-head">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((c, i) => {
            const list = c.oob ? [] : eventsOn(c.iso);
            const isToday = !c.oob && c.iso === todayIso;
            return (
              <div
                key={i}
                className={"cal-cell " + (c.oob ? "oob " : "clickable ") + (isToday ? "today" : "")}
                onClick={c.oob ? undefined : (e) => {
                  // Ignore clicks that landed on an event chip
                  if ((e.target as HTMLElement).closest("a.cal-evt")) return;
                  setDialogDate(c.iso);
                }}
                title={c.oob ? undefined : `Add event on ${c.iso}`}
              >
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

      {/* ============ Dialog ============ */}
      <div className={"dialog-scrim " + (dialogDate ? "open" : "")} onClick={() => setDialogDate(null)} />
      <div className={"dialog " + (dialogDate ? "open" : "")} role="dialog" aria-modal="true" aria-labelledby="createEventTitle" aria-hidden={!dialogDate}>
        <div className="dialog-head">
          <h3 id="createEventTitle">
            New event · <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>
              {dialogDate ? new Date(dialogDate).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : ""}
            </span>
          </h3>
          <button
            type="button"
            className="dialog-close"
            onClick={() => setDialogDate(null)}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        {/* key={dialogDate} remounts the form each time the dialog opens on
            a new date, so `defaultValue` is re-applied to every field. */}
        <form key={dialogDate ?? "closed"} action={onSubmit}>
          <div className="dialog-body">
            <div className="field">
              <label htmlFor="ev-name">Title</label>
              <input id="ev-name" name="name" placeholder="e.g. Skyline Live: The Local Train" required autoFocus />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="ev-type">Type</label>
                <select id="ev-type" name="type" defaultValue="concert">
                  <option value="concert">Concert</option>
                  <option value="conference">Conference</option>
                  <option value="tech_summit">Tech Summit</option>
                  <option value="tedx">TEDx</option>
                  <option value="wedding">Wedding</option>
                  <option value="festival">Festival</option>
                  <option value="product_launch">Product Launch</option>
                  <option value="private_party">Private Party</option>
                  <option value="corporate">Corporate</option>
                  <option value="gala">Gala</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="ev-expected">Expected attendees</label>
                <input id="ev-expected" name="expected" type="number" min={0} defaultValue={0} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="ev-date">Date</label>
                <input id="ev-date" name="date" type="date" defaultValue={dialogDate ?? ""} required />
              </div>
              <div className="field-row" style={{ margin: 0 }}>
                <div className="field">
                  <label htmlFor="ev-start">Start time</label>
                  <input id="ev-start" name="startTime" type="time" defaultValue="18:00" required />
                </div>
                <div className="field">
                  <label htmlFor="ev-end">End time</label>
                  <input id="ev-end" name="endTime" type="time" defaultValue="22:00" required />
                </div>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="ev-venue">Venue</label>
                <select id="ev-venue" name="venueId" defaultValue="">
                  <option value="">Not decided</option>
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.name}{v.city ? ` — ${v.city}` : ""}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ev-client">Client</label>
                <select id="ev-client" name="clientId" defaultValue="">
                  <option value="">Not decided</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.company ?? c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="ev-notes">Notes</label>
              <textarea id="ev-notes" name="notes" rows={3} placeholder="One-line highlight for the pipeline card." />
            </div>
          </div>
          <div className="dialog-foot">
            <button type="button" className="btn" onClick={() => setDialogDate(null)}>Cancel</button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Saving…" : "Create event"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
