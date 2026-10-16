/**
 * Plan & billing — Razorpay Test Mode indicator.
 *
 * Source-level, like the rest of tests/components (node:test, zero test
 * deps). These guards exist because a billing screen that lies is worse than
 * one that is blank: the indicator must appear ONLY in Test Mode, must use
 * the exact operator-approved wording, and the card must never claim a
 * payment succeeded on the strength of the browser alone.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const planCard = read("components/settings/PlanCard.tsx");
const settingsPage = read("app/(app)/settings/page.tsx");

describe("Razorpay Test Mode indicator — copy", () => {
  it("uses the exact required title", () => {
    assert.match(planCard, /TEST_MODE_TITLE = "Razorpay Test Mode"/);
  });

  it("uses the exact required supporting text", () => {
    assert.match(planCard, /TEST_MODE_TEXT =/);
    assert.match(
      planCard,
      /"Payments are currently being tested\. No live Razorpay charges will be processed\."/,
    );
  });

  it("renders both strings from the named constants (no drift)", () => {
    assert.match(planCard, /\{TEST_MODE_TITLE\}/);
    assert.match(planCard, /\{TEST_MODE_TEXT\}/);
    // The literal copy must appear exactly once each — a second hardcoded
    // copy is how wording drifts out of sync with the constants.
    assert.equal(planCard.match(/Razorpay Test Mode"/g)?.length, 1);
  });
});

describe("Razorpay Test Mode indicator — conditional rendering", () => {
  it("renders only when razorpayTestMode is true", () => {
    assert.match(planCard, /\{razorpayTestMode \?\s*\(/);
  });

  it("the prop is optional and documented", () => {
    assert.match(planCard, /razorpayTestMode\?: boolean;/);
    assert.match(planCard, /isRazorpayTestModeActive/);
  });

  it("the settings page derives it from isRazorpayTestModeActive, not from raw env", () => {
    assert.match(settingsPage, /const razorpayTestMode = isRazorpayTestModeActive\(\);/);
    assert.match(settingsPage, /razorpayTestMode=\{razorpayTestMode\}/);
    // The badge must not be wired to a bare env check, which could be true
    // while the mode gate is refusing the configuration.
    assert.doesNotMatch(
      settingsPage,
      /razorpayTestMode=\{Boolean\(process\.env/,
    );
  });

  it("the indicator is machine-findable for automated checks", () => {
    assert.match(planCard, /data-testid="razorpay-test-mode"/);
  });
});

describe("Billing UI honesty", () => {
  it("never shows Pro/Active from checkout alone — the plan comes from resolveEntitlement", () => {
    assert.match(settingsPage, /resolveEntitlement\(billing, new Date\(\)/);
    assert.match(settingsPage, /const plan = entitlement\.plan;/);
  });

  it("surfaces payment failure instead of a success message", () => {
    assert.match(planCard, /did not complete — Pro stays off until a payment succeeds/);
  });

  it("introduces no fake transaction history", () => {
    assert.doesNotMatch(planCard, /payment_history|transactions|billing_history/i);
  });

  it("shows the real subscription status when a subscription exists", () => {
    assert.match(planCard, /billing\.status/);
    assert.match(planCard, /Payment needs attention/);
  });

  it("checkout tells the truth about when the plan actually updates", () => {
    const checkout = read("components/settings/PlanCheckoutButton.tsx");
    assert.match(checkout, /your plan will update here shortly/);
    assert.doesNotMatch(checkout, /Payment successful — you are now on Pro/i);
  });

  it("dismissal and failure are reported honestly", () => {
    const checkout = read("components/settings/PlanCheckoutButton.tsx");
    assert.match(checkout, /Checkout closed — nothing was charged\./);
    assert.match(checkout, /Payment failed — nothing was charged\./);
  });

  it("the upgrade button cannot double-submit (duplicate-click prevention)", () => {
    const checkout = read("components/settings/PlanCheckoutButton.tsx");
    assert.match(checkout, /disabled=\{pending \|\| !selected\}/);
    assert.match(checkout, /useTransition/);
  });
});
