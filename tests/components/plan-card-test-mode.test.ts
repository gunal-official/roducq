/** Regression coverage for the authenticated billing settings surfaces. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const settingsPage = read("app/(app)/settings/page.tsx");
const billingPage = read("app/(app)/settings/billing/page.tsx");
const pricingTable = read("components/billing/pricing-table.tsx");
const seatLimits = read("lib/billing/seat-limits.ts");

describe("Settings billing rendering", () => {
  it("uses the new pricing table and no longer renders the legacy Free/Pro roadmap card", () => {
    assert.match(settingsPage, /<PricingTable workspaceName=\{workspace\.name\} userEmail=\{user\?\.email \?\? ""\} \/>/);
    assert.match(settingsPage, /workspace && isOwner \?/);
    assert.doesNotMatch(settingsPage, /<PlanCard/);
    assert.doesNotMatch(settingsPage, /Early access|Pro roadmap/);
    assert.match(settingsPage, /href="\/settings\/billing"/);
  });

  it("keeps Starter/Team checkout in Test Mode and Studio contact-only", () => {
    assert.match(pricingTable, /Razorpay Test Mode/);
    assert.match(pricingTable, /Studio is arranged with our team and does not start an online checkout/);
    assert.match(pricingTable, /mailto:contact@nanexi\.com/);
    assert.match(pricingTable, /payload\.keyId\?\.startsWith\("rzp_test_"\)/);
  });
});

describe("Billing settings runtime resilience", () => {
  it("awaits createClient and catches subscription/seat reads with a Free fallback", () => {
    assert.match(billingPage, /const supabase = await createClient\(\)/);
    assert.match(billingPage, /try \{[\s\S]*canInviteMember\(workspace\.id\)[\s\S]*catch \(error\)/);
    assert.match(billingPage, /let billing: BillingSettingsRecord \| null = null/);
    assert.match(billingPage, /let seats = \{ allowed: false, currentCount: 1, limit: 1 \}/);
    assert.match(billingPage, /showing the Free-tier fallback/);
  });

  it("derives the current billing plan from server data and never from Checkout.js success", () => {
    assert.match(billingPage, /effectiveSeatPlan\(billing\)/);
    assert.match(billingPage, /resolveEntitlement\(\s*billing/);
    assert.match(billingPage, /planLabel\(currentPlan\)/);
    assert.doesNotMatch(billingPage, /razorpay_payment_id|checkout_success/);
  });

  it("shows actual payment states and paid-through date without fabricated history", () => {
    assert.match(billingPage, /Payment past due/);
    assert.match(billingPage, /Paid through/);
    assert.match(billingPage, /formatDate\(billing\?\.paid_through\)/);
    assert.doesNotMatch(billingPage, /payment_history|transactions|billing_history/i);
  });

  it("seat lookups count both active members and unexpired pending invitations", () => {
    assert.match(seatLimits, /from\("workspace_members"\)/);
    assert.match(seatLimits, /from\("team_invites"\)/);
    assert.match(seatLimits, /\.is\("accepted_at", null\)/);
    assert.match(seatLimits, /\.is\("revoked_at", null\)/);
    assert.match(seatLimits, /\.gt\("expires_at"/);
  });
});
