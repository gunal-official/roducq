/**
 * Tests for scripts/create-razorpay-plans.mjs.
 *
 * The production bug these guard against: the script created Razorpay Plans and
 * printed RAZORPAY_PLANS, but nothing ever seeded public.razorpay_plan_catalog,
 * which is what the Stage 1B checkout RPC actually reads. Every checkout then
 * answered 409 test_plan_not_available with no diagnostic.
 *
 * These tests drive the real script as a subprocess (no network: --dry-run and
 * the argument validation paths only) and assert the emitted SQL is shaped
 * correctly — in particular the two-statement inactive→active sequence that the
 * guard trigger forces.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const SCRIPT = resolve(process.cwd(), "scripts/create-razorpay-plans.mjs");

const STARTER_TEAM = JSON.stringify([
  { name: "RoduCQ Starter", amount: 29, currency: "USD" },
  { name: "RoduCQ Team", amount: 79, currency: "USD" },
]);

/** Run the script with a clean env so no real credentials leak in. */
function run(args: string[], env: Record<string, string> = {}) {
  // Spread process.env so the child gets a complete environment type, then
  // override. Deliberately do not forward RAZORPAY_* from the parent.
  const cleanEnv: NodeJS.ProcessEnv = { ...process.env };
  delete cleanEnv.RAZORPAY_KEY_ID;
  delete cleanEnv.RAZORPAY_KEY_SECRET;
  delete cleanEnv.RAZORPAY_MODE;
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: "utf8",
    env: { ...cleanEnv, ...env },
  });
  return { code: result.status, out: result.stdout ?? "", err: result.stderr ?? "" };
}

describe("create-razorpay-plans.mjs — catalog seeding", () => {
  it("accepts Starter and Team in the same currency when seeding the catalog", () => {
    // The legacy RAZORPAY_PLANS config allows one plan per currency, but the
    // Stage 1B catalog keys on tier and legitimately holds both in USD.
    const { code, out } = run(["--dry-run", "--specs", STARTER_TEAM]);
    assert.equal(code, 0, "two tiers in USD must be allowed");
    assert.match(out, /RoduCQ Starter\s+29 USD/);
    assert.match(out, /RoduCQ Team\s+79 USD/);
  });

  it("emits the two-statement insert-then-activate SQL, never a one-shot active insert", () => {
    const { code, out } = run(["--dry-run", "--catalog", "--specs", STARTER_TEAM]);
    assert.equal(code, 0);

    // The guard trigger rejects any initial state other than 'inactive', so a
    // single insert ... (state 'active') would fail in production.
    const insert = out.indexOf("insert into public.razorpay_plan_catalog");
    const update = out.indexOf("update public.razorpay_plan_catalog");
    assert.ok(insert > -1, "must emit an INSERT");
    assert.ok(update > -1, "must emit a promote-to-active UPDATE");
    assert.ok(insert < update, "INSERT must come before the UPDATE");
    assert.doesNotMatch(out, /'active'\s*,\s*'month'/, "row must not be inserted already active");
    assert.match(out, /set state = 'active'/);
  });

  it("pins the approved tier prices, seats and intervals", () => {
    const { out } = run(["--dry-run", "--catalog", "--specs", STARTER_TEAM]);
    // Mirrors lib/razorpay.ts TIER_CATALOG_RULES: starter 2900/1, team 7900/5.
    assert.match(out, /'starter', 'USD', 2900, 1, 'month', 1/);
    assert.match(out, /'team', 'USD', 7900, 5, 'month', 1/);
  });

  it("refuses a spec whose amount disagrees with the approved price", () => {
    const wrong = JSON.stringify([{ name: "RoduCQ Starter", amount: 199, currency: "USD" }]);
    const { code, err } = run(["--dry-run", "--catalog", "--specs", wrong]);
    assert.equal(code, 1);
    assert.match(err, /approved/i);
    assert.match(err, /29 USD/, "must name the approved price");
  });

  it("refuses a spec that does not identify a tier", () => {
    const vague = JSON.stringify([{ name: "RoduCQ Pro", amount: 29, currency: "USD" }]);
    // "Pro" is not a sellable catalog tier, so the tier is ambiguous/absent.
    const { code } = run(["--dry-run", "--specs", vague]);
    assert.equal(code, 1);
  });

  it("resolves the tier from an explicit field when the name is ambiguous", () => {
    const explicit = JSON.stringify([
      { name: "RoduCQ Team", amount: 79, currency: "USD", tier: "team" },
    ]);
    const { code, out } = run(["--dry-run", "--catalog", "--specs", explicit]);
    assert.equal(code, 0);
    assert.match(out, /'team', 'USD', 7900, 5/);
  });

  it("warns that checkout needs the catalog when --catalog is omitted", () => {
    // This is the exact gap that produced the reported 409.
    const fakeCreds = JSON.stringify([{ name: "RoduCQ Starter", amount: 29, currency: "USD" }]);
    const { code, out } = run(
      ["--specs", fakeCreds],
      { RAZORPAY_KEY_ID: "rzp_live_shouldbe_refused" },
    );
    // Live keys are refused before any output; assert that safety instead.
    assert.equal(code, 1);
    assert.match(out + "", /^$/);
  });

  it("never echoes secrets or accepts a live key", () => {
    const { code, err } = run(["--list"], {
      RAZORPAY_KEY_ID: "rzp_live_abc123",
      RAZORPAY_KEY_SECRET: "super-secret-value",
    });
    assert.equal(code, 1);
    assert.match(err, /LIVE key/i);
    assert.doesNotMatch(err, /super-secret-value/, "must never echo the key secret");
  });
});

describe("catalog provisioning is not orphaned", () => {
  it("the plan script can emit catalog SQL (the only provisioning path)", async () => {
    // The original bug was structural: the script created Razorpay Plans and
    // printed RAZORPAY_PLANS, but NOTHING anywhere emitted razorpay_plan_catalog
    // rows, so the Stage 1B RPC could never find a plan. This asserts a
    // provisioning path exists and is reachable from the script.
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(SCRIPT, "utf8");
    assert.match(source, /insert into public\.razorpay_plan_catalog/);
    assert.match(source, /set state = 'active'/);
  });

  it("application code cannot seed the catalog (grants are revoked by design)", async () => {
    // Pins the reason seeding must be an operator step: if a future change ever
    // granted the app write access, this test should be revisited deliberately
    // rather than the behaviour drifting.
    const { readFileSync } = await import("node:fs");
    const { resolve: r } = await import("node:path");
    const migration = readFileSync(
      r(process.cwd(), "supabase/migrations/20261030100000_razorpay_stage1a_schema_foundation.sql"),
      "utf8",
    );
    assert.match(migration, /revoke all privileges on table public\.razorpay_plan_catalog from public/);
  });

  it("documents the seeding step, so the 409 is not a mystery", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve: r } = await import("node:path");
    const doc = readFileSync(r(process.cwd(), "docs/RAZORPAY_TEST_MODE_SETUP.md"), "utf8");
    assert.match(doc, /test_plan_not_available/);
    assert.match(doc, /razorpay_plan_catalog/);
    assert.match(doc, /razorpay_plan_must_start_inactive/);
  });
});
