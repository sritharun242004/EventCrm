import { requestReset } from "./actions";

export default function ResetRequestPage() {
  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-xl font-semibold mb-4">Reset password</h1>
      <p className="text-sm text-slate-600 mb-4">
        Enter your email — if an account exists, we&apos;ll send a reset link.
      </p>
      <form action={requestReset} className="space-y-3">
        <input name="email" type="email" required placeholder="you@company.com"
          className="w-full rounded border px-3 py-2" />
        <button className="rounded bg-slate-900 text-white px-4 py-2 text-sm">Send reset link</button>
      </form>
    </div>
  );
}
