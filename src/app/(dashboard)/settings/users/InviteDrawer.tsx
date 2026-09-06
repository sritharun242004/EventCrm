"use client";
import { useState } from "react";
import { inviteUser } from "./actions";

export function InviteDrawer() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        onClick={() => { setError(null); setOpen(true); }}
        className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm"
      >
        Invite user
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-lg p-6 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-4">Invite user</h3>
            <form
              action={async (fd) => {
                const res = await inviteUser(fd);
                if (res?.error) setError(res.error);
                else { setError(null); setOpen(false); }
              }}
              className="space-y-3"
            >
              <label className="block text-sm">Email
                <input name="email" type="email" required className="mt-1 w-full rounded border px-3 py-2" />
              </label>
              <label className="block text-sm">Name
                <input name="name" required minLength={2} className="mt-1 w-full rounded border px-3 py-2" />
              </label>
              <label className="block text-sm">Role
                <select name="role" required defaultValue="coordinator" className="mt-1 w-full rounded border px-3 py-2">
                  <option value="sales">Sales</option>
                  <option value="producer">Producer</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="finance">Finance</option>
                  <option value="ceo">CEO / Owner</option>
                </select>
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="text-sm">Cancel</button>
                <button className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm">Send invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
