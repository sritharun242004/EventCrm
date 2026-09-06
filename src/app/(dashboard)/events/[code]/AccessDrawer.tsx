"use client";

import { useState } from "react";
import { grantAccess, revokeAccess } from "./access-actions";

type CandidateUser = { id: number; name: string; email: string; role: string };
type Grantee = { userId: number; name: string; role: string; grantedByName: string };

type Props = {
  eventId: number;
  grantees: Grantee[];
  candidates: CandidateUser[];
};

export function AccessDrawer({ eventId, grantees, candidates }: Props) {
  const [open, setOpen] = useState(false);
  const [pickerUserId, setPickerUserId] = useState<string>("");

  const grantedIds = new Set(grantees.map((g) => g.userId));
  const notYetGranted = candidates.filter((c) => !grantedIds.has(c.id));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        Grant access · {grantees.length}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-lg p-6 w-[520px] max-h-[80vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Grant event access</h3>
              <button onClick={() => setOpen(false)} className="text-slate-500 text-sm">Close</button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              People below can see this event even if their role default hides it. Removing access reverts them to their
              role default.
            </p>

            <div className="mb-6">
              <h4 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Currently granted</h4>
              {grantees.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No explicit grants yet.</p>
              ) : (
                <ul className="space-y-1">
                  {grantees.map((g) => (
                    <li key={g.userId} className="flex items-center justify-between border-b border-slate-100 py-1.5">
                      <div>
                        <div className="text-sm">{g.name}</div>
                        <div className="text-xs text-slate-500">{g.role} · granted by {g.grantedByName}</div>
                      </div>
                      <form action={revokeAccess}>
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="userId" value={g.userId} />
                        <button className="text-xs text-red-600">Revoke</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Add someone</h4>
              {notYetGranted.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Every active user already has access.</p>
              ) : (
                <form
                  action={async (fd) => {
                    if (!pickerUserId) return;
                    fd.set("userId", pickerUserId);
                    await grantAccess(fd);
                    setPickerUserId("");
                  }}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="eventId" value={eventId} />
                  <select
                    value={pickerUserId}
                    onChange={(e) => setPickerUserId(e.target.value)}
                    className="flex-1 rounded border px-3 py-2 text-sm"
                  >
                    <option value="">Pick a user…</option>
                    {notYetGranted.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role}) — {c.email}
                      </option>
                    ))}
                  </select>
                  <button className="rounded bg-slate-900 text-white px-3 py-2 text-sm" disabled={!pickerUserId}>
                    Grant
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
