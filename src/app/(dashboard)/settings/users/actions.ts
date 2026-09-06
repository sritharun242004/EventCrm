"use server";
import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import type { UserRole } from "@prisma/client";

export type FormResult = { error?: string; ok?: boolean };

const ROLES: UserRole[] = ["ceo", "sales", "producer", "coordinator", "finance"];

function inviteUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/accept-invite/${token}`;
}

async function sendInviteEmail(to: string, name: string, role: UserRole, byName: string, url: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_missing") {
    // Graceful degrade: log to server console instead of sending.
    console.log(`[INVITE] to=${to} name=${name} role=${role} invited_by=${byName}`);
    console.log(`[INVITE] link (valid 24h): ${url}`);
    return;
  }
  const resend = new Resend(key);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "no-reply@localhost",
    to,
    subject: "You're invited to Eventbot",
    html: `<p>Hi ${name},</p>
           <p>${byName} invited you to Eventbot as <b>${role}</b>. The link below is valid for 24 hours:</p>
           <p><a href="${url}">${url}</a></p>`,
  });
}

export async function inviteUser(formData: FormData): Promise<FormResult> {
  const me = await getSessionUser();
  requireRole(me, "ceo");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Invalid email." };
  if (name.length < 2) return { error: "Name required." };
  if (!ROLES.includes(role)) return { error: "Invalid role." };

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with that email already exists." };

  const created = await db.user.create({
    data: { email, name, role, invitedByUserId: me.id, invitedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  await db.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  await sendInviteEmail(email, name, role, me.name, inviteUrl(token));
  revalidatePath("/settings/users");
  return { ok: true };
}

export async function deactivateUser(formData: FormData): Promise<void> {
  const me = await getSessionUser();
  requireRole(me, "ceo");
  const id = Number(formData.get("id"));
  if (id === me.id) throw new Error("Cannot deactivate yourself.");
  await db.user.update({ where: { id }, data: { active: false } });
  revalidatePath("/settings/users");
}

export async function reactivateUser(formData: FormData): Promise<void> {
  const me = await getSessionUser();
  requireRole(me, "ceo");
  const id = Number(formData.get("id"));
  await db.user.update({ where: { id }, data: { active: true } });
  revalidatePath("/settings/users");
}

export async function changeUserRole(formData: FormData): Promise<void> {
  const me = await getSessionUser();
  requireRole(me, "ceo");
  const id = Number(formData.get("id"));
  const role = String(formData.get("role")) as UserRole;
  if (!ROLES.includes(role)) throw new Error("Invalid role.");
  if (id === me.id && role !== "ceo") throw new Error("Cannot demote yourself.");
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath("/settings/users");
}
