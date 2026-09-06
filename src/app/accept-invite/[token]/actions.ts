"use server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";

export async function acceptInvite(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 12 || !/\d/.test(password) || !/[^\w\s]/.test(password)) {
    throw new Error("Password must be 12+ chars with a number and a symbol.");
  }
  const row = await db.verificationToken.findUnique({ where: { token } });
  if (!row || row.expires < new Date()) throw new Error("This invite has expired.");

  const user = await db.user.findUnique({ where: { email: row.identifier } });
  if (!user) throw new Error("Invite target user missing.");

  const passwordHash = await bcrypt.hash(password, 12);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash, acceptedAt: new Date() } }),
    db.verificationToken.delete({ where: { token } }),
  ]);

  // signIn with redirectTo throws a Next.js redirect — it never returns.
  await signIn("credentials", { email: user.email, password, redirectTo: "/overview" });
}
