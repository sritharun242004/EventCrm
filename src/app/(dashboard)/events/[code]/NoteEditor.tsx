"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEventNote } from "../actions";
import { toast } from "@/components/ui/Toast";

/**
 * Inline note editor on the event brief page. Displays the current highlight;
 * a small "Edit" toggle swaps it for a textarea + Save/Cancel row that calls
 * the saveEventNote server action.
 */
export function NoteEditor({ eventId, initial }: { eventId: number; initial: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [saving, startSaving] = useTransition();

  function save() {
    startSaving(async () => {
      const res = await saveEventNote({ eventId, note: value });
      if (res.ok) {
        toast("Note saved", "ok");
        setEditing(false);
        router.refresh();
      } else {
        toast(res.error, "err");
      }
    });
  }

  if (!editing) {
    return (
      <>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
          {initial || <span className="muted">No note yet.</span>}
        </p>
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            {initial ? "Edit note" : "Add note"}
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="field" style={{ margin: 0 }}>
      <textarea
        name="note"
        rows={3}
        value={value}
        maxLength={500}
        placeholder="One-line highlight for the pipeline card."
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <div className="subtle" style={{ marginTop: 4 }}>{value.length} / 500</div>
      <div className="flex" style={{ gap: 8, marginTop: 12 }}>
        <button type="button" className="btn" onClick={() => { setValue(initial ?? ""); setEditing(false); }}>
          Cancel
        </button>
        <button type="button" className="btn primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
}
