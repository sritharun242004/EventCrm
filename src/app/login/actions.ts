"use server";

import { redirect } from "next/navigation";
import { clearSession, createSession, verifyCredentials } from "@/lib/auth";

export type LoginState = { error: string };

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/overview");
  if (!verifyCredentials(email, password)) return { error: "Invalid email address or password." };
  await createSession(email);
  redirect(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/overview");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}
