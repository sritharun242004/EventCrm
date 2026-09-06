import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { can, type Action, type SessionUser } from "@/lib/authz";

/**
 * Page-level guard. Redirects to /login if unauthenticated, or to /overview
 * if the user is authenticated but lacks the required view action. Returns
 * the SessionUser so pages can render for their role.
 */
export async function guardPage(action: Action): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user, action)) redirect("/overview");
  return user;
}
