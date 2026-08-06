"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBudgetLine } from "../events/actions";
import { toast } from "@/components/ui/Toast";

const CATEGORIES = [
  "Sound & AV", "Stage", "Decor", "Lighting", "F&B", "Water",
  "Contractors", "Security", "Ticketing", "Marketing", "Team Cost", "Contingency",
];

export function BudgetActions({
  eventId,
  eventName,
}: {
  eventId: number;
  eventName: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

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
      const res = await addBudgetLine({
        eventId,
        category: String(form.get("category") ?? ""),
        plannedInr: Number(form.get("plannedInr") ?? 0),
        actualInr: form.get("actualInr") ? Number(form.get("actualInr")) : undefined,
        notes: String(form.get("notes") ?? ""),
      });
      if (res.ok) {
        toast("Budget line added", "ok");
        setOpen(false);
        router.refresh();
      } else {
        toast(res.error, "err");
      }
    });
  }

  return (
    <>
      <button className="btn">Export CSV</button>
      <button className="btn primary" onClick={() => setOpen(true)} aria-label="Open add budget line dialog">
        Add line
      </button>

      {open && (
        <>
          <div className="vendor-scrim open" onClick={() => setOpen(false)} aria-hidden="true" />
          <div ref={ref} className="vendor-dialog open" role="dialog" aria-modal="true" aria-label="Add budget line">
            <div className="vendor-dialog-head">
              <h3>Add budget line</h3>
              <button type="button" className="drawer-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            <div style={{ padding: "0 20px", marginTop: -8, marginBottom: 8 }}>
              <span className="subtle">on <b style={{ color: "var(--ink)" }}>{eventName}</b></span>
            </div>
            <form action={submit} className="vendor-form">
              <div className="field-row">
                <div className="field">
                  <label htmlFor="bl-category">Category *</label>
                  <select id="bl-category" name="category" required defaultValue="">
                    <option value="" disabled>Select…</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="bl-planned">Planned (₹) *</label>
                  <input id="bl-planned" name="plannedInr" type="number" min={0} step={100} required />
                </div>
              </div>
              <div className="field">
                <label htmlFor="bl-actual">Actual (₹, optional)</label>
                <input id="bl-actual" name="actualInr" type="number" min={0} step={100} placeholder="0" />
              </div>
              <div className="field">
                <label htmlFor="bl-notes">Notes</label>
                <input id="bl-notes" name="notes" placeholder="e.g. Two-camera setup + drone" />
              </div>
              <div className="vendor-form-foot">
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? "Saving…" : "Add line"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
