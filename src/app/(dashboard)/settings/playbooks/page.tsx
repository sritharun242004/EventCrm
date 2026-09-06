import { guardPage } from "@/lib/guard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlaybooksPage() {
  await guardPage("view.settings.playbooks");
  const playbooks = await db.taskPlaybook.findMany({
    include: { items: { orderBy: { orderIdx: "asc" } }, runs: true },
    orderBy: [{ trigger: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Task playbooks</h2>
        <div className="text-xs text-slate-500">
          Auto-create tasks when events hit a trigger status. {playbooks.length} playbook{playbooks.length === 1 ? "" : "s"} defined.
        </div>
      </div>
      {playbooks.length === 0 ? (
        <p className="text-sm text-slate-400 italic">
          No playbooks yet. Seed the starter set with{" "}
          <code className="text-xs bg-slate-100 rounded px-1">pnpm db:seed:playbooks</code>.
        </p>
      ) : (
        <ul className="space-y-4">
          {playbooks.map((pb) => (
            <li key={pb.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{pb.name}</div>
                  <div className="text-xs text-slate-500">
                    Trigger: <span className="font-mono">{pb.trigger}</span>
                    {pb.eventType && <> · Event type: {pb.eventType}</>}
                    {" · "}
                    {pb.active ? "active" : "paused"}
                    {" · "}
                    Ran on {pb.runs.length} event{pb.runs.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              <table className="w-full mt-3 text-xs">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1">#</th>
                    <th>Title</th>
                    <th>Default assignee</th>
                    <th>Priority</th>
                    <th>Due (days from event start)</th>
                  </tr>
                </thead>
                <tbody>
                  {pb.items.map((it, i) => (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="py-1 text-slate-400">{i + 1}</td>
                      <td>{it.title}</td>
                      <td className="text-slate-500">{it.defaultAssigneeRole ?? "—"}</td>
                      <td className="text-slate-500">{it.priority}</td>
                      <td className="text-slate-500">{it.offsetDaysFromEvent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">
        Manual playbook management UI (create / edit / pause / add items) ships in a follow-up. For now, seed
        the starter set and edit the seed script to iterate.
      </p>
    </div>
  );
}
