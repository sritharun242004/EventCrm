"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { categoryLabel } from "@/lib/format";
import { toast } from "@/components/ui/Toast";
import { createRfq } from "./actions";

const CATEGORIES = ["sound_av", "stage", "decor", "carpet_flooring", "lighting", "fnb", "water", "catering", "contractor", "security", "ticketing", "photography", "videography", "transport", "printing", "logistics"] as const;

export function RfqActions({ events }: { events: { id: number; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saving, startSaving] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [open]);

  function submit(form: FormData) {
    startSaving(async () => {
      const result = await createRfq({
        eventId: form.get("eventId") ? Number(form.get("eventId")) : undefined,
        title: String(form.get("title") ?? ""),
        category: String(form.get("category") ?? "sound_av") as typeof CATEGORIES[number],
        neededBy: String(form.get("neededBy") ?? ""),
        budgetCeilingInr: form.get("budgetCeilingInr") ? Number(form.get("budgetCeilingInr")) : undefined,
        notes: String(form.get("notes") ?? ""),
      });
      if (!result.ok) return toast(result.error, "err");
      toast("Draft RFQ created", "ok");
      setOpen(false);
      router.push(`/rfqs/${result.code}`);
      router.refresh();
    });
  }

  return <>
    <button className="btn" type="button" onClick={() => toast("RFQ templates are being prepared", "ok")}>Templates</button>
    <button className="btn primary" type="button" onClick={() => setOpen(true)} aria-label="Open new RFQ dialog">New RFQ</button>
    {open && mounted ? createPortal(<>
      <button className="dialog-scrim vendor-scrim open" type="button" onClick={() => setOpen(false)} aria-label="Close new RFQ dialog" />
      <div ref={ref} className="vendor-dialog open" role="dialog" aria-modal="true" aria-label="New RFQ">
        <div className="dialog-head"><div><div className="vendor-dialog-kicker">Procurement workspace</div><h3>Create RFQ</h3><p>Start a vendor request with its commercial ceiling and delivery deadline.</p></div><button type="button" className="dialog-close" onClick={() => setOpen(false)} aria-label="Close new RFQ dialog">×</button></div>
        <form action={submit}>
          <div className="dialog-body vendor-form-body">
            <div className="field"><label htmlFor="rfq-title">RFQ title *</label><input id="rfq-title" name="title" required autoFocus placeholder="e.g. Sound system and technical crew" /></div>
            <div className="field-row"><div className="field"><label htmlFor="rfq-event">Linked event</label><select id="rfq-event" name="eventId" defaultValue=""><option value="">No event selected</option>{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></div><div className="field"><label htmlFor="rfq-category">Category *</label><select id="rfq-category" name="category" defaultValue="sound_av">{CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></div></div>
            <div className="field-row"><div className="field"><label htmlFor="rfq-needed">Needed by</label><input id="rfq-needed" name="neededBy" type="date" /></div><div className="field"><label htmlFor="rfq-ceiling">Budget ceiling (₹)</label><input id="rfq-ceiling" name="budgetCeilingInr" type="number" min="0" step="100" placeholder="500000" /></div></div>
            <div className="field"><label htmlFor="rfq-notes">Scope and notes</label><textarea id="rfq-notes" name="notes" rows={4} placeholder="Quantities, specifications, service levels and commercial requirements" /></div>
          </div>
          <div className="dialog-foot"><button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="btn primary" disabled={saving}>{saving ? "Creating…" : "Create draft RFQ"}</button></div>
        </form>
      </div>
    </>, document.body) : null}
  </>;
}
