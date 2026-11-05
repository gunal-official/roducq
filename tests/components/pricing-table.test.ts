import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../components/billing/pricing-table.tsx", import.meta.url), "utf8");
const checkoutClient = readFileSync(new URL("../../lib/razorpay-client.ts", import.meta.url), "utf8");
const settingsPage = readFileSync(new URL("../../app/(app)/settings/page.tsx", import.meta.url), "utf8");
const billingPage = readFileSync(new URL("../../app/(app)/settings/billing/page.tsx", import.meta.url), "utf8");

describe("billing pricing table", () => {
  it("shows the three approved monthly tiers and seat allowances", () => {
    for (const detail of [
      'id: "starter"', 'price: "$29"', 'seats: "1 seat"',
      'id: "team"', 'price: "$79"', 'seats: "Up to 5 seats"',
      'id: "studio"', 'price: "$199"', 'seats: "Up to 15 seats"',
    ]) {
      assert.ok(source.includes(detail), `missing approved plan detail: ${detail}`);
    }
  });

  it("starts Starter and Team through the server checkout API with a tier slug", () => {
    assert.match(source, /fetch\("\/api\/billing\/checkout"/);
    assert.match(source, /planId,\s*tier: planId,\s*request_key: crypto\.randomUUID\(\)/);
    assert.match(source, /openRazorpayCheckout\(\{/);
    assert.match(source, /subscriptionId: payload\.subscriptionId/);
    assert.match(source, /keyId: payload\.keyId/);
    assert.match(source, /payload\.keyId\?\.startsWith\("rzp_test_"\)/);
  });

  it("keeps Studio contact-only and never passes Studio to checkout", () => {
    assert.match(source, /const isStudio = plan\.id === "studio"/);
    assert.match(source, /isStudio \? setContactOpen\(true\) : void startCheckout\(plan\.id\)/);
    assert.match(source, /mailto:contact@nanexi\.com\?subject=roducq%20Studio%20enquiry/);
    assert.match(source, /Studio is arranged with our team and does not start an online checkout/);
  });

  it("loads Checkout.js dynamically and only opens the subscription passed by the API", () => {
    assert.match(checkoutClient, /document\.createElement\("script"\)/);
    assert.match(checkoutClient, /https:\/\/checkout\.razorpay\.com\/v1\/checkout\.js/);
    assert.match(checkoutClient, /subscription_id: subscriptionId/);
    assert.match(checkoutClient, /key: keyId/);
  });

  it("renders the new pricing table in Settings instead of the legacy Pro roadmap card", () => {
    assert.match(settingsPage, /import \{ PricingTable \} from "@\/components\/billing\/pricing-table"/);
    assert.match(settingsPage, /<PricingTable workspaceName=\{workspace\.name\} userEmail=\{user\?\.email \?\? ""\} \/>/);
    assert.doesNotMatch(settingsPage, /<PlanCard/);
    assert.doesNotMatch(settingsPage, /Early access|Pro roadmap|PlanCheckoutButton/);
  });

  it("awaits the server Supabase client and falls back to Free when billing reads fail", () => {
    assert.match(billingPage, /const supabase = await createClient\(\)/);
    assert.match(billingPage, /try \{[\s\S]*canInviteMember\(workspace\.id\)[\s\S]*catch \(error\)/);
    assert.match(billingPage, /let seats = \{ allowed: false, currentCount: 1, limit: 1 \}/);
    assert.match(billingPage, /let billing: BillingSettingsRecord \| null = null/);
    assert.match(billingPage, /showing the Free-tier fallback/);
  });
});
