import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { whereEventVisible } from "./visibility.ts";
import type { SessionUser } from "./authz.ts";

const u = (role: SessionUser["role"], id = 42): SessionUser => ({
  id,
  email: `${role}@ex.co`,
  name: role,
  role,
});

describe("whereEventVisible", () => {
  test("ceo → {} (no filter, sees all)", () => {
    assert.deepEqual(whereEventVisible(u("ceo")), {});
  });

  test("sales → status lead/proposed/confirmed OR createdBy OR grants", () => {
    const w = whereEventVisible(u("sales", 7));
    assert.ok(Array.isArray(w.OR));
    assert.deepEqual(w.OR![0], { status: { in: ["lead", "proposed", "confirmed"] } });
    assert.deepEqual(w.OR![1], { createdByUserId: 7 });
    assert.deepEqual(w.OR![2], { grants: { some: { userId: 7 } } });
  });

  test("producer → status confirmed..wrap_up OR createdBy OR grants", () => {
    const w = whereEventVisible(u("producer", 9));
    assert.deepEqual(w.OR![0], {
      status: { in: ["confirmed", "in_production", "live", "wrap_up"] },
    });
    assert.deepEqual(w.OR![1], { createdByUserId: 9 });
    assert.deepEqual(w.OR![2], { grants: { some: { userId: 9 } } });
  });

  test("finance → totalBudgetCents > 0 OR grants", () => {
    const w = whereEventVisible(u("finance", 11));
    assert.equal(w.OR!.length, 2);
    assert.deepEqual(w.OR![0], { totalBudgetCents: { gt: 0 } });
    assert.deepEqual(w.OR![1], { grants: { some: { userId: 11 } } });
  });

  test("coordinator → status in_production/live/wrap_up OR grants (NO createdBy)", () => {
    const w = whereEventVisible(u("coordinator", 13));
    assert.equal(w.OR!.length, 2);
    assert.deepEqual(w.OR![0], {
      status: { in: ["in_production", "live", "wrap_up"] },
    });
    assert.deepEqual(w.OR![1], { grants: { some: { userId: 13 } } });
  });
});
