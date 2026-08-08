"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createMarketSignal } from "./actions";
import { toast } from "@/components/ui/Toast";
import { ActionButton } from "@/components/ui/Toast";

export function MarketActions() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLInputElement>("input, select")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function submit(form: FormData) {
    startSaving(async () => {
      const res = await createMarketSignal({
        name: String(form.get("name") ?? ""),
        organizer: String(form.get("organizer") ?? ""),
        type: (form.get("type") as any) || undefined,
        city: String(form.get("city") ?? ""),
        startsOn: String(form.get("startsOn") ?? ""),
        expectedAttendees: form.get("expectedAttendees") ? Number(form.get("expectedAttendees")) : undefined,
        estTicketPriceInr: form.get("estTicketPriceInr") ? Number(form.get("estTicketPriceInr")) : undefined,
        signal: (form.get("signal") as any) || "opportunity",
        notes: String(form.get("notes") ?? ""),
      });
      if (res.ok) {
        toast("Signal added to the watchlist", "ok");
        setOpen(false);
        router.refresh();
      } else {
        toast(res.error, "err");
      }
    });
  }

  return (
    <>
      <ActionButton label="Import calendar" toastMsg="ICS import — coming soon" />
      <button className="btn primary" onClick={() => setOpen(true)} aria-label="Open add signal dialog">
        Add signal
      </button>

      {open && mounted ? createPortal(
        <>
          <button className="dialog-scrim vendor-scrim open" type="button" onClick={() => setOpen(false)} aria-label="Close add market signal dialog" />
          <div ref={ref} className="vendor-dialog open" role="dialog" aria-modal="true" aria-label="Add market signal">
            <div className="dialog-head">
              <div>
                <div className="vendor-dialog-kicker">Market intelligence</div>
                <h3>Add market signal</h3>
                <p>Track a competitor, partner or opportunity event for commercial follow-up.</p>
              </div>
              <button type="button" className="dialog-close" onClick={() => setOpen(false)} aria-label="Close add market signal dialog">×</button>
            </div>
            <form action={submit}>
              <div className="dialog-body vendor-form-body">
              <div className="field">
                <label htmlFor="ms-name">Event name *</label>
                <input id="ms-name" name="name" required placeholder="e.g. India Live Music Awards" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="ms-organizer">Organizer</label>
                  <input id="ms-organizer" name="organizer" placeholder="Music Circle" />
                </div>
                <div className="field">
                  <label htmlFor="ms-signal">Signal *</label>
                  <select id="ms-signal" name="signal" required defaultValue="opportunity">
                    <option value="competitor">Competitor</option>
                    <option value="partner">Partner</option>
                    <option value="opportunity">Opportunity</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="ms-type">Type</label>
                  <select id="ms-type" name="type" defaultValue="">
                    <option value="">—</option>
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
                  <label htmlFor="ms-city">City</label>
                  <input id="ms-city" name="city" placeholder="Bengaluru" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="ms-date">Date *</label>
                  <input id="ms-date" name="startsOn" type="date" required />
                </div>
                <div className="field">
                  <label htmlFor="ms-pax">Expected attendees</label>
                  <input id="ms-pax" name="expectedAttendees" type="number" min={0} placeholder="0" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="ms-ticket">Est. ticket price (₹)</label>
                <input id="ms-ticket" name="estTicketPriceInr" type="number" min={0} placeholder="0" />
              </div>
              <div className="field">
                <label htmlFor="ms-notes">Notes</label>
                <textarea id="ms-notes" name="notes" rows={2} placeholder="e.g. RFP window opens August, worth pitching." />
              </div>
              </div>
              <div className="dialog-foot">
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? "Saving…" : "Add signal"}
                </button>
              </div>
            </form>
          </div>
        </>, document.body) : null}
    </>
  );
}
