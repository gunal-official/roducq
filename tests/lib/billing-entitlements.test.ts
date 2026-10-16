/**
 * Entitlement policy regression tests (lib/billing/entitlements.ts).
 * Pure functions, no database, no network.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  canStartNewRazorpaySubscription,
  legacyBillingNotice,
  parseLegacyAccessUntil,
  RAZORPAY_ACTIVE_GRACE_MS,
  resolveEntitlement,
} from "../../lib/billing/entitlements.ts";

const NOW = new Date("2026-10-16T12:00:00Z");
const FUTURE = "2026-11-16T12:00:00Z";
const PAST = "2026-08-16T12:00:00Z";
const JUST_PAST = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString(); // 1h ago, inside grace
const LONG_PAST = new Date(NOW.getTime() - RAZORPAY_ACTIVE_GRACE_MS - 60_000).toISOString(); // beyond grace

const rzp = (status: string, paid_through: string | null) => ({ provider: "razorpay", status, paid_through });
const stripe = (status: string, paid_through: string | null) => ({ provider: "stripe", status, paid_through });

describe("Razorpay states", () => {
  test("active with a future verified paid-through grants Pro", () => {
    const e = resolveEntitlement(rzp("active", FUTURE), NOW);
    assert.equal(e.plan, "pro");
    assert.equal(e.reason, "razorpay_active");
    assert.equal(e.needsOperatorReconciliation, false);
  });

  test("active inside the short renewal grace window still grants Pro", () => {
    const e = resolveEntitlement(rzp("active", JUST_PAST), NOW);
    assert.equal(e.plan, "pro");
    assert.equal(e.reason, "razorpay_active_grace");
  });

  test("STALE active beyond the grace window does NOT grant indefinite Pro and flags reconciliation", () => {
    const e = resolveEntitlement(rzp("active", LONG_PAST), NOW);
    assert.equal(e.plan, "free");
    assert.equal(e.reason, "razorpay_stale_active");
    assert.equal(e.needsOperatorReconciliation, true);
  });

  test("active with a MISSING paid-through date fails closed and flags reconciliation", () => {
    const e = resolveEntitlement(rzp("active", null), NOW);
    assert.equal(e.plan, "free");
    assert.equal(e.reason, "razorpay_missing_paid_through");
    assert.equal(e.needsOperatorReconciliation, true);
  });

  test("canceled with remaining verified paid period keeps Pro until that date", () => {
    const e = resolveEntitlement(rzp("canceled", FUTURE), NOW);
    assert.equal(e.plan, "pro");
    assert.equal(e.reason, "razorpay_canceled_in_paid_period");
    assert.equal(e.paidThrough, new Date(FUTURE).toISOString());
  });

  test("canceled after the paid-through date is Free", () => {
    assert.equal(resolveEntitlement(rzp("canceled", PAST), NOW).plan, "free");
    assert.equal(resolveEntitlement(rzp("canceled", null), NOW).plan, "free");
  });

  test("pending (payment retrying), halted, paused, authenticated, created, completed, expired grant nothing", () => {
    for (const status of ["pending", "halted", "paused", "authenticated", "created", "completed", "expired"]) {
      const e = resolveEntitlement(rzp(status, FUTURE), NOW);
      assert.equal(e.plan, "free", `${status} must not grant Pro even with a future date`);
    }
  });

  test("an unknown status fails closed", () => {
    assert.equal(resolveEntitlement(rzp("bogus", FUTURE), NOW).plan, "free");
  });

  test("no row is Free (no_subscription)", () => {
    const e = resolveEntitlement(null, NOW);
    assert.equal(e.plan, "free");
    assert.equal(e.reason, "no_subscription");
  });
});

describe("Legacy Stripe subscriptions", () => {
  test("legacy Stripe subscriber with an operator-verified future date stays Pro for that period", () => {
    const e = resolveEntitlement(stripe("active", FUTURE), NOW);
    assert.equal(e.plan, "pro");
    assert.equal(e.reason, "legacy_stripe_verified_active");
    assert.equal(e.needsOperatorReconciliation, false);
  });

  test("legacy Stripe subscription whose verified period has ended is Free", () => {
    const e = resolveEntitlement(stripe("active", PAST), NOW);
    assert.equal(e.plan, "free");
    assert.equal(e.reason, "legacy_stripe_stale_active");
    assert.equal(e.needsOperatorReconciliation, true);
  });

  test("legacy Stripe cancellation with remaining paid period keeps Pro until the paid-through date", () => {
    const e = resolveEntitlement(stripe("canceled", FUTURE), NOW);
    assert.equal(e.plan, "pro");
    assert.equal(e.reason, "legacy_stripe_canceled_in_paid_period");
  });

  test("legacy Stripe cancellation after the paid period is Free", () => {
    const e = resolveEntitlement(stripe("canceled", PAST), NOW);
    assert.equal(e.plan, "free");
    assert.equal(e.reason, "legacy_stripe_expired");
    assert.equal(e.needsOperatorReconciliation, false);
  });

  test("STALE legacy active record without a verified date does NOT grant indefinite Pro", () => {
    const e = resolveEntitlement(stripe("active", null), NOW);
    assert.equal(e.plan, "free");
    assert.equal(e.reason, "legacy_stripe_unverified");
    assert.equal(e.needsOperatorReconciliation, true);
  });

  test("missing paid-through date is never invented: no period is assumed for legacy rows", () => {
    const e = resolveEntitlement(stripe("canceled", null), NOW);
    assert.equal(e.plan, "free");
    assert.equal(e.paidThrough, null);
    assert.equal(e.needsOperatorReconciliation, true);
  });

  test("operator bridge keeps an unverified legacy ACTIVE subscriber on Pro only until the bounded date", () => {
    const bridgeUntil = parseLegacyAccessUntil("2026-10-31");
    assert.ok(bridgeUntil);
    const inside = resolveEntitlement(stripe("active", null), NOW, bridgeUntil);
    assert.equal(inside.plan, "pro");
    assert.equal(inside.reason, "legacy_stripe_operator_bridge");
    assert.equal(inside.needsOperatorReconciliation, true, "bridge is never silent: still flagged");
    const after = resolveEntitlement(stripe("active", null), new Date("2026-11-01T00:00:00Z"), bridgeUntil);
    assert.equal(after.plan, "free", "bridge expires; it never extends itself");
  });

  test("operator bridge never covers a canceled or dateless-canceled legacy row", () => {
    const bridgeUntil = parseLegacyAccessUntil("2030-01-01");
    assert.equal(resolveEntitlement(stripe("canceled", null), NOW, bridgeUntil).plan, "free");
  });

  test("bridge does not apply when a verified date exists (verified data wins)", () => {
    const e = resolveEntitlement(stripe("active", PAST), NOW, parseLegacyAccessUntil("2030-01-01"));
    assert.equal(e.plan, "free");
  });
});

describe("Provider safety", () => {
  test("a stripe-provider row never gets Razorpay semantics and vice versa", () => {
    // A Razorpay-style 'active' with no date must not be treated as a verified legacy record.
    assert.equal(resolveEntitlement({ provider: "stripe", status: "halted", paid_through: FUTURE }, NOW).plan, "free");
  });

  test("unknown provider fails closed", () => {
    const e = resolveEntitlement({ provider: "paypal", status: "active", paid_through: FUTURE }, NOW);
    assert.equal(e.plan, "free");
    assert.equal(e.reason, "unknown_provider");
  });
});

describe("LEGACY_STRIPE_ACCESS_UNTIL parsing", () => {
  test("accepts a date and a timestamp", () => {
    assert.ok(parseLegacyAccessUntil("2026-12-31"));
    assert.ok(parseLegacyAccessUntil("2026-12-31T23:59:59Z"));
  });
  test("rejects unset, empty, junk and impossible dates (no bridge)", () => {
    assert.equal(parseLegacyAccessUntil(undefined), null);
    assert.equal(parseLegacyAccessUntil(""), null);
    assert.equal(parseLegacyAccessUntil("forever"), null);
    assert.equal(parseLegacyAccessUntil("2026-13-45"), null);
    assert.equal(parseLegacyAccessUntil("2026-12-31; DROP TABLE"), null);
  });
});

describe("Checkout gate mirrors the database takeover rules", () => {
  test("new workspace may start checkout", () => {
    assert.equal(canStartNewRazorpaySubscription(null, NOW), null);
  });
  test("live Razorpay subscription blocks a second checkout", () => {
    assert.notEqual(canStartNewRazorpaySubscription(rzp("active", FUTURE), NOW), null);
    assert.notEqual(canStartNewRazorpaySubscription(rzp("halted", null), NOW), null);
    assert.notEqual(canStartNewRazorpaySubscription(rzp("pending", FUTURE), NOW), null);
  });
  test("abandoned or ended Razorpay subscriptions may be replaced", () => {
    for (const s of ["created", "authenticated", "canceled", "completed", "expired"]) {
      assert.equal(canStartNewRazorpaySubscription(rzp(s, null), NOW), null, s);
    }
  });
  test("live legacy Stripe subscription blocks checkout (no double billing)", () => {
    assert.notEqual(canStartNewRazorpaySubscription(stripe("active", FUTURE), NOW), null);
    assert.notEqual(canStartNewRazorpaySubscription(stripe("active", null), NOW), null);
  });
  test("legacy canceled with an ended period may subscribe through Razorpay", () => {
    assert.equal(canStartNewRazorpaySubscription(stripe("canceled", PAST), NOW), null);
    assert.notEqual(canStartNewRazorpaySubscription(stripe("canceled", FUTURE), NOW), null);
  });
});

describe("Owner-facing legacy notices", () => {
  test("no notice for Razorpay rows", () => {
    assert.equal(legacyBillingNotice(resolveEntitlement(rzp("active", FUTURE), NOW)), null);
  });
  test("verified legacy subscriber gets a verified-through notice", () => {
    const n = legacyBillingNotice(resolveEntitlement(stripe("active", FUTURE), NOW));
    assert.match(n ?? "", /verified through/);
  });
  test("unverified legacy record asks for reconciliation and states nothing was cancelled", () => {
    const n = legacyBillingNotice(resolveEntitlement(stripe("active", null), NOW));
    assert.match(n ?? "", /reconciled/);
    assert.match(n ?? "", /Nothing has been cancelled or charged/);
  });
});
