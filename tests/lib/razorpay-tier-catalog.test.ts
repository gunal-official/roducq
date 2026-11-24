import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  findRazorpayTierPlan,
  findRazorpayTierPlanById,
  parseRazorpayTierCatalog,
  type RazorpayTierCatalogPlan,
} from "../../lib/razorpay.ts";

// Razorpay Test Mode is INR-only. Amounts mirror the provisioned plans:
// Starter ₹2,900 (290000 paise), Team ₹7,900 (790000 paise).
const starter = {
  tier: "starter",
  currency: "INR",
  marketingPriceMajor: 2900,
  amountMinor: 290000,
  includedSeats: 1,
  period: "monthly",
  interval: 1,
  planId: "plan_StarterINR01",
};
const team = {
  tier: "team",
  currency: "INR",
  marketingPriceMajor: 7900,
  amountMinor: 790000,
  includedSeats: 5,
  period: "monthly",
  interval: 1,
  planId: "plan_TeamINR001",
};
const encode = (entries: unknown) => JSON.stringify(entries);
const parseOne = (entry: unknown) => parseRazorpayTierCatalog(encode([entry]));

function parsedPlans(entries: unknown[] = [starter, team]): RazorpayTierCatalogPlan[] {
  const result = parseRazorpayTierCatalog(encode(entries));
  if (!result.ok) throw new Error(result.error);
  return result.plans;
}

describe("isolated Razorpay tier catalog", () => {
  test("accepts the approved Starter/INR catalog entry with explicit major and minor units", () => {
    const result = parseOne(starter);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.plans[0], {
      tier: "starter",
      currency: "INR",
      marketingPriceMajor: 2900,
      amountMinor: 290000,
      includedSeats: 1,
      period: "monthly",
      interval: 1,
      planId: "plan_StarterINR01",
    });
  });

  test("accepts the approved Team/INR catalog entry", () => {
    const result = parseOne(team);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.plans[0].marketingPriceMajor, 7900);
    assert.equal(result.plans[0].amountMinor, 790000);
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
      { tier: "starter", marketingPriceMajor: 2900, amountMinor: 290000, includedSeats: 1, period: "monthly", interval: 1 },
      { tier: "team", marketingPriceMajor: 7900, amountMinor: 790000, includedSeats: 5, period: "monthly", interval: 1 },
    ]);
  });

  test("resolves plans by exact tier/currency and exact provider Plan ID", () => {
    const plans = parsedPlans();
    assert.equal(findRazorpayTierPlan(plans, "starter", "INR")?.planId, starter.planId);
    assert.equal(findRazorpayTierPlan(plans, "team", "INR")?.planId, team.planId);
    assert.equal(findRazorpayTierPlanById(plans, starter.planId)?.tier, "starter");
    assert.equal(findRazorpayTierPlanById(plans, team.planId)?.tier, "team");
  });

  test("unknown Plan IDs, tiers, and currencies fail closed", () => {
    const plans = parsedPlans();
    assert.equal(findRazorpayTierPlanById(plans, "plan_unknown"), null);
    assert.equal(findRazorpayTierPlan(plans, "studio", "INR"), null);
    assert.equal(findRazorpayTierPlan(plans, "starter", "inr"), null);
    assert.equal(findRazorpayTierPlan(plans, "starter", "USD"), null);
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

  test("accepts INR and rejects every other currency", () => {
    // INR is the one sellable currency (Razorpay Test Mode is INR-only).
    assert.equal(parseOne({ ...starter, currency: "INR" }).ok, true);
    for (const currency of ["USD", "EUR", "inr", "IN", ""]) {
      assert.equal(parseOne({ ...starter, currency }).ok, false, currency);
    }
  });

  test("rejects incorrect marketing and provider amounts, including fractional minor units", () => {
    assert.equal(parseOne({ ...starter, marketingPriceMajor: 29 }).ok, false);
    assert.equal(parseOne({ ...starter, amountMinor: 2900 }).ok, false, "2900 is ₹29, not ₹2,900");
    assert.equal(parseOne({ ...starter, amountMinor: 290000.5 }).ok, false);
    assert.equal(parseOne({ ...starter, amountMinor: 29 }).ok, false);
    assert.equal(parseOne({ ...team, marketingPriceMajor: 2900 }).ok, false);
    assert.equal(parseOne({ ...team, amountMinor: 7900 }).ok, false, "7900 is ₹79, not ₹7,900");
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
    assert.equal(parseRazorpayTierCatalog(encode([starter, { ...starter, planId: "plan_StarterINR02" }])).ok, false);
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
