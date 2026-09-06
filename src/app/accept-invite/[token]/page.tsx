import { acceptInvite } from "./actions";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold mb-4">Set your password</h1>
      <form action={acceptInvite} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <label className="block text-sm">New password
          <input name="password" type="password" required minLength={12}
            className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <p className="text-xs text-slate-500">Min 12 chars, at least one number and one symbol.</p>
        <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm">
          Set password &amp; sign in
        </button>
      </form>
    </div>
  );
}
