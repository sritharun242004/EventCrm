import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { can } from "@/lib/authz";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?returnTo=/settings/profile");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <div className="grid grid-cols-[180px_1fr] gap-8">
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/settings/profile" className="px-2 py-1 rounded hover:bg-slate-100">Profile</Link>
          {can(user, "view.settings.users") && (
            <Link href="/settings/users" className="px-2 py-1 rounded hover:bg-slate-100">Users</Link>
          )}
          {can(user, "view.settings.audit") && (
            <Link href="/settings/audit" className="px-2 py-1 rounded hover:bg-slate-100">Audit log</Link>
          )}
          {can(user, "view.settings.playbooks") && (
            <Link href="/settings/playbooks" className="px-2 py-1 rounded hover:bg-slate-100">Playbooks</Link>
          )}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
