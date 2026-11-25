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
      'id: "starter"', 'price: "₹2,900"', 'seats: "1 seat"',
      'id: "team"', 'price: "₹7,900"', 'seats: "Up to 5 seats"',
      'id: "studio"', 'price: "Contact us"', 'seats: "Up to 15 seats"',
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
    // Assert the wiring, not the formatting: the component must receive the
    // workspace name, the owner email, and the resolved current plan.
    assert.match(settingsPage, /<PricingTable/);
    assert.match(settingsPage, /workspaceName=\{workspace\.name\}/);
    assert.match(settingsPage, /userEmail=\{user\?\.email \?\? ""\}/);
    assert.match(settingsPage, /current=\{currentSubscription\}/);
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

describe("checkout failure messages are actionable", () => {
  const adapters = readFileSync(
    new URL("../../lib/billing/stage1b-adapters.ts", import.meta.url),
    "utf8",
  );
  const handler = readFileSync(
    new URL("../../lib/billing/checkout-handler.ts", import.meta.url),
    "utf8",
  );

  /** Failure kinds the reserve path can hand back as the 409 `code`. */
  function reservedCodes(): string[] {
    const fromClassifier = [...adapters.matchAll(/kind: "([a-z_]+)"/g)].map((m) => m[1]);
    const fromFail = [...adapters.matchAll(/fail\("([a-z_]+)"/g)].map((m) => m[1]);
    const fromHandler = [...handler.matchAll(/"[a-z]+(?:_[a-z]+)+"/g)].map((m) => m[0].slice(1, -1));
    return [...new Set([...fromClassifier, ...fromFail, ...fromHandler])].sort();
  }

  it("maps every code the server can return to specific guidance", () => {
    const block = source.slice(
      source.indexOf("const RESERVATION_FIXES"),
      source.indexOf("export function PricingTable"),
    );
    const mapped = new Set([...block.matchAll(/^\s{2}([a-z_]+):/gm)].map((m) => m[1]));

    // Everything classifyRpcFailure() can return reaches the caller as `code`,
    // because reserveIntent() turns that bucket straight into fail(kind).
    const classify = adapters.slice(
      adapters.indexOf("export function classifyRpcFailure"),
      adapters.indexOf("function toIsoFromUnix"),
    );
    const reservationPath = [...classify.matchAll(/kind: "([a-z_]+)"/g)].map((m) => m[1]);
    assert.ok(reservationPath.length >= 9, "classifier extraction failed");
    for (const code of new Set(reservationPath)) {
      assert.ok(mapped.has(code), `no operator guidance for reservation code: ${code}`);
    }
    for (const code of ["plan_not_available", "function_missing", "schema_cache_stale",
      "intent_already_open", "subscription_exists", "permission_denied", "database_error"]) {
      assert.ok(mapped.has(code), `missing guidance for ${code}`);
    }
  });

  it("renders the code next to the guidance", () => {
    assert.ok(source.includes("RESERVATION_FIXES[noticeCode]"), "notice must look up the fix");
    assert.ok(source.includes("({noticeCode})"), "notice must show the raw code for support");
  });

  it("sets the code from the API payload and clears it between attempts", () => {
    assert.ok(source.includes("code?: string"), "payload type must carry the code");
    assert.ok(source.includes("setNoticeCode(payload?.code ?? null)"), "code must be captured");
    assert.ok(source.includes("setNoticeCode(null)"), "code must reset between attempts");
  });

  it("the API actually returns the code on a reservation refusal", () => {
    assert.ok(handler.includes('code: reason'), "handler must expose the reason code");
    assert.ok(!handler.includes("Could not reserve checkout.\" }, "),
      "the generic error must always travel with its code");
  });
});

describe("the active plan is shown, not re-sold", () => {
  const settingsPage = readFileSync(
    new URL("../../app/(app)/settings/page.tsx", import.meta.url),
    "utf8",
  );

  it("the settings page resolves the workspace's plan", () => {
    // Regression: /settings rendered PricingTable with no billing state, so a
    // workspace with a live subscription still saw three "Choose plan"
    // buttons and no indication of what it was paying for.
    assert.ok(settingsPage.includes("billing_subscriptions"), "must read the subscription");
    assert.ok(settingsPage.includes("effectiveSeatPlan"), "must reuse the shared policy");
    assert.ok(settingsPage.includes("current={currentSubscription}"), "must pass it down");
  });

  it("renders a current-plan banner with status and paid-through", () => {
    assert.ok(source.includes("Current plan: {planLabel(current.planId)}"));
    assert.ok(source.includes("formatPaidThrough(current.paidThrough)"));
    assert.ok(source.includes('current.status === "canceled" ? "· cancelled" : "· active"'));
  });

  it("disables checkout for the plan already in force", () => {
    // Buying the same plan twice would create a second Razorpay subscription;
    // the reserve RPC would then answer subscription_exists, which reads as an
    // error rather than "you already have this".
    assert.match(source, /const isCurrent = current\?\.planId === plan\.id/);
    assert.match(source, /disabled=\{Boolean\(loadingPlan\) \|\| \(isCurrent && isEntitled\)\}/);
    assert.ok(source.includes('"Current plan"'));
    assert.ok(source.includes("Your plan"));
  });

  it("treats a lapsed subscription as not entitled", () => {
    // isEntitled requires active or canceled-with-paid-time via effectiveSeatPlan;
    // a stale row must not keep the button disabled.
    assert.match(source, /const isEntitled = Boolean\(current\) && \(current\?\.status === "active" \|\| current\?\.status === "canceled"\)/);
  });
});

describe("the billing dialog cannot re-sell an active plan", () => {
  const dialog = readFileSync(
    new URL("../../components/billing/change-plan-dialog.tsx", import.meta.url),
    "utf8",
  );
  const billingPage = readFileSync(
    new URL("../../app/(app)/settings/billing/page.tsx", import.meta.url),
    "utf8",
  );

  it("forwards the resolved subscription into PricingTable", () => {
    // /settings#plan was fixed to pass `current`; the /settings/billing dialog
    // rendered the same component without it, so it would happily offer a plan
    // the workspace already pays for and fail with subscription_exists.
    assert.ok(dialog.includes("current?: CurrentSubscription | null"));
    assert.ok(dialog.includes("current={current}"));
  });

  it("derives it from effective.plan, never the legacy pro display tier", () => {
    // currentPlan can be "pro" for legacy rows; pro has no Razorpay plan, so it
    // must never mark a card as "your plan".
    assert.ok(billingPage.includes("effective.plan === \"free\""));
    assert.ok(billingPage.includes("planId: effective.plan"));
    assert.doesNotMatch(billingPage, /planId: currentPlan/);
  });
});
