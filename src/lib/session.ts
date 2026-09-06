import "server-only";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/authz";
import type { UserRole } from "@prisma/client";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user as
    | { id?: string; email?: string | null; name?: string | null; role?: UserRole }
    | undefined;
  if (!u?.id || !u.email || !u.role) return null;
  return {
    id: Number(u.id),
    email: u.email,
    name: u.name ?? u.email,
    role: u.role,
  };
}
