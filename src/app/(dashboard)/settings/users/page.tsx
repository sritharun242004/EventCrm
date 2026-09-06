import { guardPage } from "@/lib/guard";
import { db } from "@/lib/db";
import { InviteDrawer } from "./InviteDrawer";
import { RoleSelect } from "./RoleSelect";
import { deactivateUser, reactivateUser } from "./actions";

export default async function UsersPage() {
  const me = await guardPage("view.settings.users");
  const users = await db.user.findMany({ orderBy: [{ active: "desc" }, { createdAt: "asc" }] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Users</h2>
        <InviteDrawer />
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr>
            <th className="py-2">Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last login</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t align-middle">
              <td className="py-2">{u.name}</td>
              <td className="text-slate-700">{u.email}</td>
              <td>
                <RoleSelect userId={u.id} currentRole={u.role} disabled={u.id === me.id} />
              </td>
              <td className="text-slate-600">
                {u.active ? "Active" : "Inactive"}
                {!u.acceptedAt && u.invitedAt ? " · invited" : ""}
              </td>
              <td className="text-slate-500">
                {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}
              </td>
              <td className="text-right">
                {u.active ? (
                  <form action={deactivateUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className="text-red-600 text-xs">Deactivate</button>
                  </form>
                ) : (
                  <form action={reactivateUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <button className="text-slate-700 text-xs">Reactivate</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
