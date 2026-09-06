import Link from "next/link";
import { getSessionUser } from "@/lib/session";

const ROLE_LABEL: Record<string, string> = {
  ceo: "Owner",
  sales: "Sales",
  producer: "Producer",
  coordinator: "Coordinator",
  finance: "Finance",
};

export default async function ForbiddenPage() {
  const user = await getSessionUser();
  const roleLabel = user ? ROLE_LABEL[user.role] ?? user.role : "your role";

  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <div className="text-5xl font-semibold text-slate-400 mb-4">403</div>
      <h1 className="text-xl font-semibold mb-3">You don&apos;t have access to that page</h1>
      <p className="text-sm text-slate-600 mb-8">
        Your role ({roleLabel}) can&apos;t see this page or event. If you need it, ask the Owner to grant you access,
        or ask a Producer to add you to the specific event.
      </p>
      <Link href="/overview" className="rounded bg-slate-900 text-white px-4 py-2 text-sm">
        Back to overview
      </Link>
    </div>
  );
}
