"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function updateProfileName(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated.");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) throw new Error("Name must be at least 2 characters.");
  await db.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/settings/profile");
}

export async function changePassword(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated.");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 12) throw new Error("New password must be at least 12 characters.");
  if (!/\d/.test(next) || !/[^\w\s]/.test(next)) throw new Error("Include at least one number and one symbol.");

  const row = await db.user.findUnique({ where: { id: user.id } });
  if (!row?.passwordHash) throw new Error("Account has no password set.");
  const ok = await bcrypt.compare(current, row.passwordHash);
  if (!ok) throw new Error("Current password is incorrect.");

  const passwordHash = await bcrypt.hash(next, 12);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  revalidatePath("/settings/profile");
}
