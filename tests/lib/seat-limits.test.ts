import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  calculateSeatAvailability,
  effectiveSeatPlan,
  seatLimitForPlan,
} from "../../lib/billing/seat-limit-policy.ts";

const NOW = new Date("2026-11-05T10:00:00.000Z");

describe("workspace seat limits", () => {
  it("maps Free and Starter to one seat, Team to five, and Studio to fifteen", () => {
    assert.equal(seatLimitForPlan("free"), 1);
    assert.equal(seatLimitForPlan("starter"), 1);
    assert.equal(seatLimitForPlan("team"), 5);
    assert.equal(seatLimitForPlan("studio"), 15);
    assert.equal(seatLimitForPlan("unknown"), 1, "unknown plans fail closed");
  });

  it("requires an active or canceled paid period with a future paid-through date", () => {
    assert.deepEqual(effectiveSeatPlan({ plan_name: "team", status: "active", paid_through: "2026-12-01T00:00:00Z" }, NOW), {
      plan: "team", limit: 5,
    });
    assert.deepEqual(effectiveSeatPlan({ plan_name: "studio", status: "canceled", paid_through: "2026-12-01T00:00:00Z" }, NOW), {
      plan: "studio", limit: 15,
    });
    for (const record of [
      { plan_name: "team", status: "pending", paid_through: "2026-12-01T00:00:00Z" },
      { plan_name: "team", status: "past_due", paid_through: "2026-12-01T00:00:00Z" },
      { plan_name: "team", status: "active", paid_through: "2026-11-04T00:00:00Z" },
      { plan_name: "team", status: "active", paid_through: null },
      null,
    ]) {
      assert.deepEqual(effectiveSeatPlan(record, NOW), { plan: "free", limit: 1 });
    }
  });

  it("counts both active members and live pending invites toward capacity", () => {
    assert.deepEqual(calculateSeatAvailability(3, 2, { plan: "team", limit: 5 }), {
      allowed: false, currentCount: 5, limit: 5,
    });
    assert.deepEqual(calculateSeatAvailability(2, 2, { plan: "team", limit: 5 }), {
      allowed: true, currentCount: 4, limit: 5,
    });
    assert.deepEqual(calculateSeatAvailability(1, 0, { plan: "free", limit: 1 }), {
      allowed: false, currentCount: 1, limit: 1,
    });
    assert.deepEqual(calculateSeatAvailability(14, 0, { plan: "studio", limit: 15 }), {
      allowed: true, currentCount: 14, limit: 15,
    });
  });
});
