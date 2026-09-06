import { resetPassword } from "../actions";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold mb-4">Choose a new password</h1>
      <form action={resetPassword} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <input name="password" type="password" required minLength={12}
          placeholder="New password"
          className="w-full rounded border px-3 py-2" />
        <p className="text-xs text-slate-500">Min 12 chars, one number, one symbol.</p>
        <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm">Update password</button>
      </form>
    </div>
  );
}
