import { UserRole, EventStatus } from "@prisma/client";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
};

export type Action =
  | "event.create"
  | "event.edit_brief"
  | "event.move_status.lead_to_confirmed"
  | "event.move_status.confirmed_to_completed"
  | "event.grant_access"
  | "budget.line.create"
  | "budget.line.edit"
  | "budget.approve"
  | "vendor.create"
  | "vendor.edit"
  | "rfq.create"
  | "rfq.send"
  | "rfq.award"
  | "task.create"
  | "task.edit"
  | "task.assign"
  | "comment.post"
  | "user.invite"
  | "user.deactivate"
  | "user.change_role"
  | "audit.view.all"
  | "audit.view.finance"
  | "view.overview"
  | "view.events"
  | "view.calendar"
  | "view.tasks"
  | "view.rfqs"
  | "view.vendors"
  | "view.budgets"
  | "view.teams"
  | "view.reputation"
  | "view.market"
  | "view.settings.users"
  | "view.settings.audit";

type Resource = {
  event?: { status: EventStatus; createdByUserId?: number | null };
};

export function can(user: SessionUser, action: Action, resource?: Resource): boolean {
  const r = user.role;
  switch (action) {
    // ---------- Events ----------
    case "event.create":
      return r === "ceo" || r === "sales" || r === "producer";
    case "event.edit_brief": {
      if (r === "ceo" || r === "producer") return true;
      if (r === "sales") {
        const s = resource?.event?.status;
        return s === "lead" || s === "proposed";
      }
      return false;
    }
    case "event.move_status.lead_to_confirmed":
      return r === "ceo" || r === "sales";
    case "event.move_status.confirmed_to_completed":
      return r === "ceo" || r === "producer";
    case "event.grant_access":
      return r === "ceo" || r === "producer";

    // ---------- Budgets ----------
    case "budget.line.create":
    case "budget.line.edit":
      return r === "ceo" || r === "producer" || r === "finance";
    case "budget.approve":
      return r === "ceo" || r === "finance";

    // ---------- Vendors / RFQs ----------
    case "vendor.create":
    case "vendor.edit":
    case "rfq.create":
    case "rfq.send":
    case "rfq.award":
      return r === "ceo" || r === "producer";

    // ---------- Tasks / comments (everyone; event visibility filters what they see later) ----------
    case "task.create":
    case "task.edit":
    case "task.assign":
    case "comment.post":
      return true;

    // ---------- User mgmt / audit ----------
    case "user.invite":
    case "user.deactivate":
    case "user.change_role":
    case "audit.view.all":
      return r === "ceo";
    case "audit.view.finance":
      return r === "ceo" || r === "finance";

    // ---------- Sidebar / page visibility ----------
    case "view.overview":
    case "view.events":
    case "view.calendar":
    case "view.tasks":
      return true;
    case "view.rfqs":
    case "view.vendors":
    case "view.teams":
      return r === "ceo" || r === "producer";
    case "view.budgets":
      return r === "ceo" || r === "producer" || r === "finance";
    case "view.reputation":
    case "view.market":
      return r === "ceo" || r === "sales";
    case "view.settings.users":
      return r === "ceo";
    case "view.settings.audit":
      return r === "ceo" || r === "finance";
  }
}

export function requireRole(
  user: SessionUser | null,
  ...allowed: UserRole[]
): asserts user is SessionUser {
  if (!user) throw new Error("UNAUTHORIZED");
  if (allowed.length && !allowed.includes(user.role)) throw new Error("FORBIDDEN");
}
