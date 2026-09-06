"use client";

import { useState } from "react";
import { createTask, setTaskStatus, deleteTask } from "../../tasks/actions";

type Assignee = { id: number; name: string; role: string };

type TaskRow = {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee: { id: number; name: string; role: string } | null;
  dueOn: string | null;
};

type Props = {
  eventId: number;
  tasks: TaskRow[];
  candidates: Assignee[];
};

export function TaskDrawer({ eventId, tasks, candidates }: Props) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const openCount = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        Tasks · {openCount}/{tasks.length}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-lg p-6 w-[720px] max-h-[85vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Tasks for this event</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowCreate(!showCreate)} className="text-sm text-slate-700 underline">
                  {showCreate ? "Cancel" : "+ New task"}
                </button>
                <button onClick={() => setOpen(false)} className="text-slate-500 text-sm">Close</button>
              </div>
            </div>

            {showCreate && (
              <form
                action={async (fd) => {
                  fd.set("eventId", String(eventId));
                  await createTask(fd);
                  setShowCreate(false);
                }}
                className="mb-6 border border-slate-200 rounded-lg p-4 space-y-3"
              >
                <input
                  name="title"
                  required
                  minLength={2}
                  placeholder="Task title"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Description (optional)"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-3 gap-3">
                  <select name="priority" defaultValue="normal" className="rounded border px-2 py-2 text-sm">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <select name="assigneeUserId" defaultValue="" className="rounded border px-2 py-2 text-sm">
                    <option value="">Unassigned</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                    ))}
                  </select>
                  <input name="dueOn" type="date" className="rounded border px-2 py-2 text-sm" />
                </div>
                <button className="rounded bg-slate-900 text-white px-3 py-1.5 text-sm">Create task</button>
              </form>
            )}

            {tasks.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No tasks yet.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-sm">{t.title}</div>
                        {t.description && (
                          <div className="text-xs text-slate-500 mt-1">{t.description}</div>
                        )}
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
                          <span>Priority: {t.priority}</span>
                          <span>Assignee: {t.assignee?.name ?? "Unassigned"}</span>
                          {t.dueOn && <span>Due: {new Date(t.dueOn).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <form action={setTaskStatus} className="inline">
                          <input type="hidden" name="id" value={t.id} />
                          <select
                            name="status"
                            defaultValue={t.status}
                            className="rounded border px-2 py-1 text-xs"
                            onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="done">Done</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </form>
                        <form action={deleteTask}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className="text-xs text-red-600">Delete</button>
                        </form>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
