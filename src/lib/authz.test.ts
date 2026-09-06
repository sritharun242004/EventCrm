import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { can, requireRole, type SessionUser } from "./authz.ts";

const roles = ["ceo", "sales", "producer", "coordinator", "finance"] as const;
const u = (role: (typeof roles)[number]): SessionUser => ({
  id: 1,
  email: `${role}@ex.co`,
  name: role,
  role,
});

describe("can(user, action)", () => {
  test("event.create: ceo/sales/producer allowed", () => {
    assert.equal(can(u("ceo"), "event.create"), true);
    assert.equal(can(u("sales"), "event.create"), true);
    assert.equal(can(u("producer"), "event.create"), true);
    assert.equal(can(u("coordinator"), "event.create"), false);
    assert.equal(can(u("finance"), "event.create"), false);
  });

  test("event.edit_brief: sales limited to lead/proposed", () => {
    assert.equal(can(u("sales"), "event.edit_brief", { event: { status: "lead" } }), true);
    assert.equal(can(u("sales"), "event.edit_brief", { event: { status: "proposed" } }), true);
    assert.equal(can(u("sales"), "event.edit_brief", { event: { status: "confirmed" } }), false);
    assert.equal(can(u("producer"), "event.edit_brief", { event: { status: "in_production" } }), true);
    assert.equal(can(u("coordinator"), "event.edit_brief", { event: { status: "live" } }), false);
  });

  test("event.move_status.lead_to_confirmed: ceo + sales", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "event.move_status.lead_to_confirmed"), r === "ceo" || r === "sales");
    }
  });

  test("event.move_status.confirmed_to_completed: ceo + producer", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "event.move_status.confirmed_to_completed"), r === "ceo" || r === "producer");
    }
  });

  test("event.grant_access: ceo + producer", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "event.grant_access"), r === "ceo" || r === "producer");
    }
  });

  test("budget.line.create/edit: ceo + producer + finance", () => {
    for (const r of roles) {
      const expect = r === "ceo" || r === "producer" || r === "finance";
      assert.equal(can(u(r), "budget.line.create"), expect);
      assert.equal(can(u(r), "budget.line.edit"), expect);
    }
  });

  test("budget.approve: ceo + finance only", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "budget.approve"), r === "ceo" || r === "finance");
    }
  });

  test("vendor + rfq mutations: ceo + producer only", () => {
    for (const r of roles) {
      const expect = r === "ceo" || r === "producer";
      assert.equal(can(u(r), "vendor.create"), expect);
      assert.equal(can(u(r), "vendor.edit"), expect);
      assert.equal(can(u(r), "rfq.create"), expect);
      assert.equal(can(u(r), "rfq.send"), expect);
      assert.equal(can(u(r), "rfq.award"), expect);
    }
  });

  test("task/comment: everyone", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "task.create"), true);
      assert.equal(can(u(r), "task.edit"), true);
      assert.equal(can(u(r), "task.assign"), true);
      assert.equal(can(u(r), "comment.post"), true);
    }
  });

  test("user.invite/deactivate/change_role + audit.view.all: ceo only", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "user.invite"), r === "ceo");
      assert.equal(can(u(r), "user.deactivate"), r === "ceo");
      assert.equal(can(u(r), "user.change_role"), r === "ceo");
      assert.equal(can(u(r), "audit.view.all"), r === "ceo");
    }
  });

  test("audit.view.finance: ceo + finance", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "audit.view.finance"), r === "ceo" || r === "finance");
    }
  });

  test("view.settings.users: ceo only; view.settings.audit: ceo + finance", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "view.settings.users"), r === "ceo");
      assert.equal(can(u(r), "view.settings.audit"), r === "ceo" || r === "finance");
    }
  });

  test("view.overview/events/calendar/tasks: everyone", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "view.overview"), true);
      assert.equal(can(u(r), "view.events"), true);
      assert.equal(can(u(r), "view.calendar"), true);
      assert.equal(can(u(r), "view.tasks"), true);
    }
  });

  test("view.proposals: ceo + sales + producer", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "view.proposals"), r === "ceo" || r === "sales" || r === "producer");
    }
  });

  test("view.rfqs/vendors/teams: ceo + producer", () => {
    for (const r of roles) {
      const expect = r === "ceo" || r === "producer";
      assert.equal(can(u(r), "view.rfqs"), expect);
      assert.equal(can(u(r), "view.vendors"), expect);
      assert.equal(can(u(r), "view.teams"), expect);
    }
  });

  test("view.budgets: ceo + producer + finance", () => {
    for (const r of roles) {
      assert.equal(can(u(r), "view.budgets"), r === "ceo" || r === "producer" || r === "finance");
    }
  });

  test("view.reputation + view.market: ceo + sales", () => {
    for (const r of roles) {
      const expect = r === "ceo" || r === "sales";
      assert.equal(can(u(r), "view.reputation"), expect);
      assert.equal(can(u(r), "view.market"), expect);
    }
  });
});

describe("requireRole", () => {
  test("throws UNAUTHORIZED on null user", () => {
    assert.throws(() => requireRole(null, "ceo"), /UNAUTHORIZED/);
  });
  test("throws FORBIDDEN on wrong role", () => {
    assert.throws(() => requireRole(u("sales"), "ceo"), /FORBIDDEN/);
  });
  test("passes for allowed role", () => {
    assert.doesNotThrow(() => requireRole(u("ceo"), "ceo"));
  });
  test("passes for one-of-many allowed", () => {
    assert.doesNotThrow(() => requireRole(u("producer"), "ceo", "producer"));
  });
  test("no allowed list = any authenticated user OK", () => {
    assert.doesNotThrow(() => requireRole(u("coordinator")));
  });
});
