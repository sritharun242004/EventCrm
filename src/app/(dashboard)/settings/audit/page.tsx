import { guardPage } from "@/lib/guard";
import { db } from "@/lib/db";
import { FINANCE_ACTIONS } from "@/lib/activity";
import { can } from "@/lib/authz";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function formatDiff(d: Prisma.JsonValue | null): string {
  if (d === null || d === undefined) return "—";
  try {
    return JSON.stringify(d);
  } catch {
    return String(d);
  }
}

export default async function AuditPage() {
  const me = await guardPage("view.settings.audit");
  const seeAll = can(me, "audit.view.all");

  const rows = await db.activityLog.findMany({
    where: seeAll
      ? {}
      : { action: { startsWith: "" }, AND: [{ OR: FINANCE_ACTIONS.map((a) => ({ action: a })) }] },
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Audit log</h2>
        <div className="text-xs text-slate-500">
          Showing latest 200 · {seeAll ? "all activity" : "finance-scope only"}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No activity recorded yet.</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-left text-slate-500 border-b">
            <tr>
              <th className="py-2">When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-2 whitespace-nowrap text-slate-500">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="pr-2 whitespace-nowrap">
                  {r.actor ? `${r.actor.name} (${r.actor.role})` : "system"}
                </td>
                <td className="pr-2 whitespace-nowrap font-mono">{r.action}</td>
                <td className="pr-2 whitespace-nowrap text-slate-500">
                  {r.entityType}#{r.entityId}
                </td>
                <td className="pr-2 text-slate-500 font-mono break-all">{formatDiff(r.diff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
