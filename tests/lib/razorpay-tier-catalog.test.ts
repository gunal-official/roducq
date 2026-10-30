import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  findRazorpayTierPlan,
  findRazorpayTierPlanById,
  parseRazorpayTierCatalog,
  type RazorpayTierCatalogPlan,
} from "../../lib/razorpay.ts";

const starter = {
  tier: "starter",
  currency: "USD",
  marketingPriceMajor: 29,
  amountMinor: 2900,
  includedSeats: 1,
  period: "monthly",
  interval: 1,
  planId: "plan_StarterUSD01",
};
const team = {
  tier: "team",
  currency: "USD",
  marketingPriceMajor: 79,
  amountMinor: 7900,
  includedSeats: 5,
  period: "monthly",
  interval: 1,
  planId: "plan_TeamUSD001",
};
const encode = (entries: unknown) => JSON.stringify(entries);
const parseOne = (entry: unknown) => parseRazorpayTierCatalog(encode([entry]));

function parsedPlans(entries: unknown[] = [starter, team]): RazorpayTierCatalogPlan[] {
  const result = parseRazorpayTierCatalog(encode(entries));
  if (!result.ok) throw new Error(result.error);
  return result.plans;
}

describe("isolated Razorpay tier catalog", () => {
  test("accepts the approved Starter/USD catalog entry with explicit major and minor units", () => {
    const result = parseOne(starter);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.plans[0], {
      tier: "starter",
      currency: "USD",
      marketingPriceMajor: 29,
      amountMinor: 2900,
      includedSeats: 1,
      period: "monthly",
      interval: 1,
      planId: "plan_StarterUSD01",
    });
  });

  test("accepts the approved Team/USD catalog entry", () => {
    const result = parseOne(team);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.plans[0].marketingPriceMajor, 79);
    assert.equal(result.plans[0].amountMinor, 7900);
    assert.equal(result.plans[0].includedSeats, 5);
  });

  test("accepts Starter and Team together with exact approved prices and one-month intervals", () => {
    const result = parseRazorpayTierCatalog(encode([starter, team]));
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.plans.length, 2);
    assert.deepEqual(result.plans.map(({ tier, marketingPriceMajor, amountMinor, includedSeats, period, interval }) => ({
      tier, marketingPriceMajor, amountMinor, includedSeats, period, interval,
    })), [
      { tier: "starter", marketingPriceMajor: 29, amountMinor: 2900, includedSeats: 1, period: "monthly", interval: 1 },
      { tier: "team", marketingPriceMajor: 79, amountMinor: 7900, includedSeats: 5, period: "monthly", interval: 1 },
    ]);
  });

  test("resolves plans by exact tier/currency and exact provider Plan ID", () => {
    const plans = parsedPlans();
    assert.equal(findRazorpayTierPlan(plans, "starter", "USD")?.planId, starter.planId);
    assert.equal(findRazorpayTierPlan(plans, "team", "USD")?.planId, team.planId);
    assert.equal(findRazorpayTierPlanById(plans, starter.planId)?.tier, "starter");
    assert.equal(findRazorpayTierPlanById(plans, team.planId)?.tier, "team");
  });

  test("unknown Plan IDs, tiers, and currencies fail closed", () => {
    const plans = parsedPlans();
    assert.equal(findRazorpayTierPlanById(plans, "plan_unknown"), null);
    assert.equal(findRazorpayTierPlan(plans, "studio", "USD"), null);
    assert.equal(findRazorpayTierPlan(plans, "starter", "usd"), null);
    assert.equal(findRazorpayTierPlan(plans, "starter", "INR"), null);
  });

  test("does not require environment configuration or call fetch/database APIs", () => {
    const savedFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (async () => {
      fetchCalls++;
      throw new Error("tier catalog parser must not make network requests");
    }) as typeof fetch;
    try {
      assert.equal(parseOne(starter).ok, true);
      assert.equal(fetchCalls, 0);
    } finally {
      globalThis.fetch = savedFetch;
    }

    const source = readFileSync(new URL("../../lib/razorpay.ts", import.meta.url), "utf8");
    const parserStart = source.indexOf("export function parseRazorpayTierCatalog");
    const resolverStart = source.indexOf("/** Resolve only exact values", parserStart);
    assert.notEqual(parserStart, -1);
    assert.notEqual(resolverStart, -1);
    const parserSource = source.slice(parserStart, resolverStart);
    assert.doesNotMatch(parserSource, /process\.env|fetch\s*\(|\.rpc\s*\(|createClient/);
  });

  test("rejects malformed JSON, blank input, non-arrays, and empty arrays", () => {
    for (const raw of ["{bad", "", "   ", "{}", "null", "[]"]) {
      assert.equal(parseRazorpayTierCatalog(raw).ok, false, JSON.stringify(raw));
    }
  });

  test("rejects null, primitive, and array entries", () => {
    for (const entry of [null, "starter", 1, true, [starter]]) {
      assert.equal(parseOne(entry).ok, false, String(entry));
    }
  });

  test("rejects unsupported currencies, including INR", () => {
    for (const currency of ["INR", "EUR", "usd", "US", ""]) {
      assert.equal(parseOne({ ...starter, currency }).ok, false, currency);
    }
  });

  test("rejects incorrect marketing and provider amounts, including fractional minor units", () => {
    assert.equal(parseOne({ ...starter, marketingPriceMajor: 30 }).ok, false);
    assert.equal(parseOne({ ...starter, amountMinor: 3000 }).ok, false);
    assert.equal(parseOne({ ...starter, amountMinor: 2900.5 }).ok, false);
    assert.equal(parseOne({ ...starter, amountMinor: 29 }).ok, false);
    assert.equal(parseOne({ ...team, marketingPriceMajor: 29 }).ok, false);
    assert.equal(parseOne({ ...team, amountMinor: 7900.25 }).ok, false);
  });

  test("rejects non-integer and incorrect seat counts", () => {
    assert.equal(parseOne({ ...starter, includedSeats: 2 }).ok, false);
    assert.equal(parseOne({ ...starter, includedSeats: 1.5 }).ok, false);
    assert.equal(parseOne({ ...team, includedSeats: 1 }).ok, false);
  });

  test("accepts only monthly billing with a one-month interval", () => {
    assert.equal(parseOne({ ...starter, period: "annual" }).ok, false);
    assert.equal(parseOne({ ...starter, period: "yearly" }).ok, false);
    assert.equal(parseOne({ ...starter, interval: 12 }).ok, false);
    assert.equal(parseOne({ ...starter, interval: 1.5 }).ok, false);
    assert.equal(parseOne({ ...starter, interval: 0 }).ok, false);
  });

  test("rejects Studio and unknown tiers", () => {
    assert.equal(parseOne({ ...starter, tier: "studio", marketingPriceMajor: 199, amountMinor: 19900, includedSeats: 15 }).ok, false);
    assert.equal(parseOne({ ...starter, tier: "enterprise" }).ok, false);
  });

  test("rejects duplicate tier/currency pairs and globally duplicate Plan IDs", () => {
    assert.equal(parseRazorpayTierCatalog(encode([starter, { ...starter, planId: "plan_StarterUSD02" }])).ok, false);
    assert.equal(parseRazorpayTierCatalog(encode([starter, { ...team, planId: starter.planId }])).ok, false);
  });

  test("rejects missing, malformed, and unsupported Plan IDs", () => {
    const { planId: _planId, ...withoutPlanId } = starter;
    assert.equal(parseOne(withoutPlanId).ok, false);
    for (const planId of ["", "plan_", "plan_has space", "price_StarterUSD01", "plan_" + "x".repeat(81)]) {
      assert.equal(parseOne({ ...starter, planId }).ok, false, planId);
    }
  });

  test("rejects missing required fields and unexpected fields", () => {
    const { amountMinor: _amountMinor, ...withoutAmount } = starter;
    assert.equal(parseOne(withoutAmount).ok, false);
    assert.equal(parseOne({ ...starter, quantity: 1 }).ok, false);
    assert.equal(parseOne({ ...starter, notes: { workspace_id: "workspace" } }).ok, false);
  });
});
