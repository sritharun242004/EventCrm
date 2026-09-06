"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type LoginState = { error: string };

function safeReturnTo(returnTo: string): string {
  return returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/overview";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? "/overview"));
  try {
    await signIn("credentials", { email, password, redirectTo: returnTo });
    return { error: "" };
  } catch (e) {
    if (e instanceof AuthError && e.type === "CredentialsSignin") {
      return { error: "Invalid email address or password." };
    }
    throw e;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
