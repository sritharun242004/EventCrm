"use server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { db } from "@/lib/db";

function resetUrl(token: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/reset-password/${token}`;
}

async function sendResetEmail(to: string, url: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_missing") {
    console.log(`[RESET] to=${to} link (valid 60min): ${url}`);
    return;
  }
  const resend = new Resend(key);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "no-reply@localhost",
    to,
    subject: "Reset your Eventbot password",
    html: `<p>Click below to reset your password (valid 60 min):</p><p><a href="${url}">${url}</a></p>`,
  });
}

import { redirect } from "next/navigation";

export async function requestReset(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  // Always redirect the same way — do not leak whether the email exists.
  if (user && user.active) {
    const token = randomBytes(32).toString("hex");
    await db.verificationToken.create({
      data: { identifier: email, token, expires: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await sendResetEmail(email, resetUrl(token));
  }
  redirect("/login?reset=sent");
}

export async function resetPassword(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 12 || !/\d/.test(password) || !/[^\w\s]/.test(password)) {
    throw new Error("Password must be 12+ chars with a number and a symbol.");
  }
  const row = await db.verificationToken.findUnique({ where: { token } });
  if (!row || row.expires < new Date()) throw new Error("Reset link expired.");
  const user = await db.user.findUnique({ where: { email: row.identifier } });
  if (!user) throw new Error("User not found.");
  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.verificationToken.delete({ where: { token } }),
  ]);
  redirect("/login?reset=ok");
}
