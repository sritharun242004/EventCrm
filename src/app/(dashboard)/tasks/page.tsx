import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { whereEventVisible } from "@/lib/visibility";
import { setTaskStatus, assignTask } from "./actions";
import { PageHead } from "@/components/ui/PageHead";
import { fmtDate } from "@/lib/dates";
import type { TaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
};

const STATUS_ORDER: TaskStatus[] = ["open", "in_progress", "blocked", "done", "cancelled"];

type Search = Promise<{ scope?: "mine" | "all" }>;

export default async function TasksPage({ searchParams }: { searchParams: Search }) {
  const me = await requireUser();
  const sp = await searchParams;
  const scope = sp.scope === "all" ? "all" : "mine";

  const eventScope = whereEventVisible(me);
  const tasks = await db.task.findMany({
    where: {
      event: eventScope,
      ...(scope === "mine" ? { assigneeUserId: me.id } : {}),
    },
    include: {
      event: { select: { id: true, code: true, name: true } },
      assignee: { select: { id: true, name: true, role: true } },
    },
    orderBy: [{ status: "asc" }, { dueOn: "asc" }, { createdAt: "desc" }],
  });

  // Only team members visible to this user, for the assignee dropdown.
  const teamCandidates = await db.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHead
        crumb="Programme"
        title="Tasks"
        subtitle={
          scope === "mine"
            ? `${tasks.length} task${tasks.length === 1 ? "" : "s"} assigned to you.`
            : `${tasks.length} task${tasks.length === 1 ? "" : "s"} across events you can see.`
        }
        actions={
          <>
            <Link href="/tasks?scope=mine" className={"btn " + (scope === "mine" ? "primary" : "")}>My tasks</Link>
            <Link href="/tasks?scope=all" className={"btn " + (scope === "all" ? "primary" : "")}>All visible</Link>
          </>
        }
      />

      {tasks.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
          Nothing here.{" "}
          {scope === "mine" ? "Nothing is assigned to you right now." : "No tasks visible under your scope."}
        </div>
      ) : (
        <table className="w-full text-sm mt-4">
          <thead className="text-left text-slate-500 border-b">
            <tr>
              <th className="py-2">Task</th>
              <th>Event</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Due</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-4">
                  <div>{t.title}</div>
                  {t.description && (
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</div>
                  )}
                </td>
                <td className="pr-4">
                  <Link href={`/events/${t.event.code}`} className="text-xs text-slate-700 hover:underline">
                    {t.event.name}
                  </Link>
                </td>
                <td className="pr-2">
                  <form action={setTaskStatus} className="inline">
                    <input type="hidden" name="id" value={t.id} />
                    <select
                      name="status"
                      defaultValue={t.status}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                    <button className="ml-1 text-xs text-slate-600 underline">save</button>
                  </form>
                </td>
                <td className="pr-2">
                  <form action={assignTask} className="inline">
                    <input type="hidden" name="id" value={t.id} />
                    <select name="userId" defaultValue={t.assigneeUserId ?? ""} className="rounded border px-2 py-1 text-xs">
                      <option value="">Unassigned</option>
                      {teamCandidates.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                      ))}
                    </select>
                    <button className="ml-1 text-xs text-slate-600 underline">save</button>
                  </form>
                </td>
                <td className="pr-2 text-xs text-slate-600 whitespace-nowrap">
                  {t.dueOn ? fmtDate(t.dueOn) : "—"}
                </td>
                <td className="pr-2">
                  <span
                    className="pill"
                    style={{
                      background:
                        t.priority === "urgent" ? "#fee2e2"
                        : t.priority === "high" ? "#fef3c7"
                        : "var(--container)",
                      color:
                        t.priority === "urgent" ? "#991b1b"
                        : t.priority === "high" ? "#78350f"
                        : "var(--ink-2)",
                    }}
                  >
                    {t.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
