"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createEvent } from "../actions";
import { toast } from "@/components/ui/Toast";

type VenueOpt = { id: number; name: string; city: string | null };
type ClientOpt = { id: number; name: string; company: string | null };

export function NewEventForm({
  initialDate,
  venues,
  clients,
}: {
  initialDate: string;
  venues: VenueOpt[];
  clients: ClientOpt[];
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

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
        router.push("/calendar");
      } else {
        toast(res.error, "err");
      }
    });
  }

  return (
    <div className="card new-event-card">
      <form action={onSubmit}>
        <div className="field">
          <label htmlFor="ev-name">Title *</label>
          <input
            id="ev-name"
            name="name"
            placeholder="e.g. Skyline Live: The Local Train"
            required
            autoFocus
          />
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
            <label htmlFor="ev-date">Date *</label>
            <input id="ev-date" name="date" type="date" defaultValue={initialDate} required />
          </div>
          <div className="field-row" style={{ margin: 0 }}>
            <div className="field">
              <label htmlFor="ev-start">Start time *</label>
              <input id="ev-start" name="startTime" type="time" defaultValue="18:00" required />
            </div>
            <div className="field">
              <label htmlFor="ev-end">End time *</label>
              <input id="ev-end" name="endTime" type="time" defaultValue="22:00" required />
            </div>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="ev-venue">Venue</label>
            <select id="ev-venue" name="venueId" defaultValue="">
              <option value="">Not decided</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.city ? ` — ${v.city}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-client">Client</label>
            <select id="ev-client" name="clientId" defaultValue="">
              <option value="">Not decided</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company ?? c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="ev-notes">Notes</label>
          <textarea
            id="ev-notes"
            name="notes"
            rows={3}
            placeholder="One-line highlight for the pipeline card."
          />
        </div>

        <div className="form-foot">
          <button
            type="button"
            className="btn"
            onClick={() => router.push("/calendar")}
          >
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? "Saving…" : "Create event"}
          </button>
        </div>
      </form>
    </div>
  );
}
