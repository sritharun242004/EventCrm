import "server-only";
import NextAuth from "next-auth";
import { redirect } from "next/navigation";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";
import { loginAttemptAllowed, recordLoginFailure, recordLoginSuccess } from "@/lib/rate-limit";

const SESSION_MAX_AGE = 60 * 60 * 12;

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  throw new Error("AUTH_SECRET must be set to a 32+ character string.");
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const gate = loginAttemptAllowed(email);
        if (!gate.allowed) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.active || !user.passwordHash) {
          recordLoginFailure(email);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          recordLoginFailure(email);
          return null;
        }

        recordLoginSuccess(email);
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
    Resend({
      from: process.env.EMAIL_FROM ?? "no-reply@localhost",
      apiKey: process.env.RESEND_API_KEY ?? "re_missing",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; role: UserRole; email?: string | null; name?: string | null };
        token.sub = String(u.id);
        (token as { role?: UserRole }).role = u.role;
        if (u.name) token.name = u.name;
        if (u.email) token.email = u.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = String(token.sub);
        (session.user as { role?: UserRole }).role = (token as { role?: UserRole }).role;
      }
      return session;
    },
  },
});

// ---- Backwards-compat shims for callers that pre-dated Auth.js v5 wiring ----
// Kept minimal and re-export the new primitives. New code should import from
// @/lib/session directly instead.

export { getSessionUser } from "@/lib/session";

export async function requireUser(): Promise<{ id: number; email: string; name: string; role: UserRole }> {
  const { getSessionUser } = await import("@/lib/session");
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

