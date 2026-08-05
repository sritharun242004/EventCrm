"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: "" };

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action} className="login-form">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="field">
        <label htmlFor="login-email">Email address</label>
        <input id="login-email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="login-password">Password</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error ? <p className="login-error" role="alert">{state.error}</p> : null}
      <button className="btn primary login-submit" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
