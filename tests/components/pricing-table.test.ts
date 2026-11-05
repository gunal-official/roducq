import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../components/billing/pricing-table.tsx", import.meta.url), "utf8");
const checkoutClient = readFileSync(new URL("../../lib/razorpay-client.ts", import.meta.url), "utf8");

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
});
