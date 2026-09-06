"use client";

import { useState } from "react";
import { createProposal, sendProposal, supersedeProposal } from "./proposal-actions";

type ProposalRow = {
  id: number;
  version: number;
  status: string;
  title: string;
  amountInr: number | null;
  publicToken: string;
  sentAt: string | null;
  firstViewedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
};

type Props = {
  eventId: number;
  proposals: ProposalRow[];
  publicBase: string;
};

export function ProposalDrawer({ eventId, proposals, publicBase }: Props) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const active = proposals.filter((p) => p.status !== "superseded" && p.status !== "declined").length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        Proposals · {active}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-lg p-6 w-[720px] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Proposals for this event</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowCreate(!showCreate)} className="text-sm text-slate-700 underline">
                  {showCreate ? "Cancel" : "+ New proposal"}
                </button>
                <button onClick={() => setOpen(false)} className="text-slate-500 text-sm">Close</button>
              </div>
            </div>

            {showCreate && (
              <form
                action={async (fd) => {
                  fd.set("eventId", String(eventId));
                  await createProposal(fd);
                  setShowCreate(false);
                }}
                className="mb-6 border border-slate-200 rounded-lg p-4 space-y-3"
              >
                <input name="title" required minLength={2} placeholder="Proposal title" className="w-full rounded border px-3 py-2 text-sm" />
                <textarea name="bodyMarkdown" required minLength={5} rows={6} placeholder="Proposal body (Markdown)" className="w-full rounded border px-3 py-2 text-sm font-mono" />
                <input name="amountInr" type="number" min="0" step="0.01" placeholder="Amount (₹)" className="w-full rounded border px-3 py-2 text-sm" />
                <button className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm">Save draft</button>
              </form>
            )}

            {proposals.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No proposals yet.</p>
            ) : (
              <ul className="space-y-3">
                {proposals.map((p) => {
                  const url = `${publicBase}/p/${p.publicToken}`;
                  return (
                    <li key={p.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className="font-medium">v{p.version}</span> · {p.title}
                          </div>
                          {p.amountInr != null && (
                            <div className="text-xs text-slate-600">₹{p.amountInr.toLocaleString("en-IN")}</div>
                          )}
                          <div className="text-xs text-slate-500 mt-2 flex flex-wrap items-center gap-3">
                            <span>Status: <span className="font-mono">{p.status}</span></span>
                            {p.sentAt && <span>Sent {new Date(p.sentAt).toLocaleDateString()}</span>}
                            {p.firstViewedAt && <span>Viewed {new Date(p.firstViewedAt).toLocaleDateString()}</span>}
                            {p.acceptedAt && <span className="text-green-700">Accepted {new Date(p.acceptedAt).toLocaleDateString()}</span>}
                          </div>
                          <div className="mt-2">
                            <a href={url} target="_blank" rel="noopener" className="text-xs text-blue-700 underline">
                              Public link ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(url)}
                              className="ml-2 text-xs text-slate-500 underline"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {p.status === "draft" && (
                            <form action={sendProposal}>
                              <input type="hidden" name="id" value={p.id} />
                              <button className="rounded bg-slate-900 text-white px-2 py-1 text-xs">Send</button>
                            </form>
                          )}
                          {p.status !== "superseded" && p.status !== "declined" && (
                            <form action={supersedeProposal}>
                              <input type="hidden" name="id" value={p.id} />
                              <button className="text-xs text-red-600">Supersede</button>
                            </form>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
