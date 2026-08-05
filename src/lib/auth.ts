import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "eventbot_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function authConfig() {
  const email = process.env.AUTH_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!email || !password || !secret || secret.length < 32) {
    throw new Error("Authentication is not configured. Set AUTH_EMAIL, AUTH_PASSWORD, and a 32+ character AUTH_SECRET.");
  }
  return { email, password, secret };
}

function equal(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyCredentials(email: string, password: string) {
  const config = authConfig();
  return equal(email.trim().toLowerCase(), config.email) && equal(password, config.password);
}

export async function createSession(email: string) {
  const { secret } = authConfig();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ email: email.toLowerCase(), expiresAt })).toString("base64url");
  const token = `${payload}.${sign(payload, secret)}`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getSessionUser(): Promise<{ email: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { secret, email: allowedEmail } = authConfig();
    const [payload, signature] = token.split(".");
    if (!payload || !signature || !equal(signature, sign(payload, secret))) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; expiresAt?: number };
    if (session.email !== allowedEmail || !session.expiresAt || session.expiresAt <= Date.now() / 1000) return null;
    return { email: session.email };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
