import { getSessionUser } from "@/lib/session";
import { updateProfileName, changePassword } from "./actions";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) return null;
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-medium mb-4">Profile</h2>
        <form action={updateProfileName} className="space-y-3 max-w-md">
          <label className="block text-sm">Email
            <input value={user.email} disabled className="mt-1 w-full rounded border px-3 py-2 bg-slate-50" />
          </label>
          <label className="block text-sm">Name
            <input name="name" defaultValue={user.name} required minLength={2}
              className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm">Role
            <input value={user.role} disabled className="mt-1 w-full rounded border px-3 py-2 bg-slate-50" />
          </label>
          <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm">Save name</button>
        </form>
      </section>
      <section>
        <h2 className="text-lg font-medium mb-4">Change password</h2>
        <form action={changePassword} className="space-y-3 max-w-md">
          <label className="block text-sm">Current password
            <input name="current" type="password" required className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm">New password (min 12, 1 number, 1 symbol)
            <input name="next" type="password" required minLength={12} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm">Update password</button>
        </form>
      </section>
    </div>
  );
}
