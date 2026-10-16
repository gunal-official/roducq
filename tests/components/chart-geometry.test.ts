import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { proportionalWidth } from "../../components/workflow/chart-geometry.ts";

describe("financial chart geometry — never invent a minimum share", () => {
  it("draws exactly zero for zero buckets even when another bucket has money", () => {
    assert.equal(proportionalWidth(0, 142800, 276), 0);
    assert.equal(proportionalWidth(142800, 142800, 276), 276);
  });
  it("leaves empty/negative totals and values empty", () => {
    for (const [value, total] of [[0, 0], [100, 0], [100, -10], [-10, 100]]) {
      assert.equal(proportionalWidth(value, total), 0);
    }
  });
  it("keeps a tiny positive fraction proportional, not an 8px or 2% floor", () => {
    assert.ok(Math.abs(proportionalWidth(1, 10000, 276) - 0.0276) < Number.EPSILON);
    assert.equal(proportionalWidth(1, 10000), 0.01);
  });
  it("adds the three rails to one full track for valid data", () => {
    const values = [500, 1250, 250];
    const total = values.reduce((sum, value) => sum + value, 0);
    assert.equal(values.reduce((sum, value) => sum + proportionalWidth(value, total, 276), 0), 276);
  });
  it("bounds inconsistent/nonfinite presentation inputs without changing financial totals", () => {
    assert.equal(proportionalWidth(200, 100, 276), 276);
    assert.equal(proportionalWidth(NaN, 100), 0);
    assert.equal(proportionalWidth(100, Infinity), 0);
    assert.equal(proportionalWidth(100, 100, -1), 0);
  });
});
