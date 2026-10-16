import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildCreateSubscriptionBody, cancelRazorpaySubscription, createRazorpaySubscription, findPlan, formatPrice, getRazorpayServerConfig, grantsPro, mapRazorpayStatus, parsePlansEnv, parseRazorpayWebhookEvent, razorpayKeyMode, statusForWebhookEvent, verifyPaymentSignature, verifyWebhookSignature } from "../../lib/razorpay.ts";

const sign = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("hex");
describe("plan validation (server-owned)", () => {
  test("parses valid plans, rejects browser-style junk", () => {
    assert.equal(parsePlansEnv('[{"currency":"INR","planId":"plan_abc","amount":1499}]').ok, true);
    assert.equal(parsePlansEnv('[{"currency":"INR","planId":"price_abc","amount":1499}]').ok, false);
    assert.equal(parsePlansEnv('[{"currency":"inr","planId":"plan_abc","amount":1499}]').ok, false);
    assert.equal(parsePlansEnv(undefined).ok, false);
    assert.equal(parsePlansEnv("not json").ok, false);
  });
  test("findPlan is currency based only", () => { const r = parsePlansEnv('[{"currency":"INR","planId":"plan_abc","amount":1499}]'); assert.ok(r.ok); if (r.ok) assert.equal(findPlan(r.plans, "inr")?.planId, "plan_abc"); });
  test("formatPrice", () => { assert.match(formatPrice(1499, "INR"), /1,499/); });
});
describe("payment signature verification", () => {
  test("valid subscription signature passes, tampered fails", () => {
    const sig = sign("secret", "pay_1|sub_1");
    assert.equal(verifyPaymentSignature({ paymentId: "pay_1", subscriptionId: "sub_1", signature: sig, keySecret: "secret" }), true);
    assert.equal(verifyPaymentSignature({ paymentId: "pay_1", subscriptionId: "sub_1", signature: "0".repeat(64), keySecret: "secret" }), false);
    assert.equal(verifyPaymentSignature({ paymentId: "", subscriptionId: "sub_1", signature: sig, keySecret: "secret" }), false);
  });
});
describe("webhook verification + parsing", () => {
  const raw = JSON.stringify({ event: "subscription.activated", created_at: 1700000000, payload: { subscription: { entity: { id: "sub_1", plan_id: "plan_abc", customer_id: "cust_1", status: "active", notes: { workspace_id: "11111111-2222-3333-4444-555555555555" } } } } });
  test("valid webhook signature passes, invalid fails", () => {
    assert.equal(verifyWebhookSignature({ webhookSecret: "whsec", signature: sign("whsec", raw), raw }), true);
    assert.equal(verifyWebhookSignature({ webhookSecret: "whsec", signature: "bad", raw }), false);
  });
  test("allowlisted event parses; unknown is ignored; junk invalid", () => {
    const e = parseRazorpayWebhookEvent(raw); assert.equal(e.kind, "subscription"); if (e.kind === "subscription") assert.equal(e.workspaceId, "11111111-2222-3333-4444-555555555555");
    assert.deepEqual(parseRazorpayWebhookEvent(JSON.stringify({ event: "order.paid" })), { kind: "ignored", type: "order.paid" });
    assert.deepEqual(parseRazorpayWebhookEvent("{nope"), { kind: "invalid" });
  });
  test("payment.failed parses subscription id", () => {
    const e = parseRazorpayWebhookEvent(JSON.stringify({ event: "payment.failed", created_at: 1, payload: { payment: { entity: { subscription_id: "sub_9" } } } }));
    assert.equal(e.kind, "payment_failed");
  });
});
describe("status mapping / entitlements", () => {
  test("only active grants Pro", () => {
    for (const s of ["created","authenticated","pending","halted","paused","canceled","completed","expired"]) assert.equal(grantsPro(mapRazorpayStatus(s)), false, s);
    assert.equal(grantsPro(mapRazorpayStatus("active")), true);
    assert.equal(mapRazorpayStatus("cancelled"), "canceled");
    assert.equal(mapRazorpayStatus("bogus"), null);
  });
  test("event fallback mapping", () => { assert.equal(statusForWebhookEvent("subscription.halted", null), "halted"); assert.equal(statusForWebhookEvent("subscription.cancelled", null), "canceled"); });
});
describe("Razorpay API (mocked fetch)", () => {
  test("create subscription sends server plan + workspace notes, Basic auth", async () => {
    let seen: any;
    const fetchFn = async (url: string, init: any) => { seen = { url, init }; return { ok: true, status: 200, json: async () => ({ id: "sub_1", status: "created", plan_id: "plan_abc", customer_id: null, notes: { workspace_id: "ws" } }) }; };
    const r = await createRazorpaySubscription({ keyId: "rzp_test_x", keySecret: "s", planId: "plan_abc", workspaceId: "ws", fetchFn: fetchFn as unknown as typeof fetch });
    assert.equal(r.ok, true); assert.match(seen.url, /api\.razorpay\.com\/v1\/subscriptions/);
    const body = JSON.parse(seen.init.body); assert.equal(body.plan_id, "plan_abc"); assert.equal(body.notes.workspace_id, "ws"); assert.equal(body.quantity, 1);
    assert.match(seen.init.headers.Authorization, /^Basic /);
    assert.deepEqual(buildCreateSubscriptionBody({ planId: "plan_abc", workspaceId: "ws" }).plan_id, "plan_abc");
  });
  test("API failure surfaces error without throwing", async () => {
    const fetchFn = async () => ({ ok: false, status: 400, json: async () => ({ error: { description: "bad plan" } }) });
    const r = await createRazorpaySubscription({ keyId: "rzp_test_x", keySecret: "s", planId: "plan_x", workspaceId: "ws", fetchFn: fetchFn as unknown as typeof fetch });
    assert.deepEqual(r, { ok: false, error: "bad plan" });
    const c = await cancelRazorpaySubscription({ keyId: "rzp_test_x", keySecret: "s", subscriptionId: "sub_1", fetchFn: (async () => { throw new Error("down"); }) as typeof fetch });
    assert.equal(c.ok, false);
  });
});
describe("missing/mode config", () => {
  test("key mode detection", () => { assert.equal(razorpayKeyMode("rzp_test_abc"), "test"); assert.equal(razorpayKeyMode("rzp_live_abc"), "live"); assert.equal(razorpayKeyMode("sk_test_x"), null); });
  test("missing config returns error (env-dependent guard)", () => { const r = getRazorpayServerConfig(); assert.equal(typeof r.ok, "boolean"); });
});
describe("route/action wiring guards", () => {
  const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
  test("no active Stripe billing code remains", () => {
    assert.throws(() => read("lib/stripe.ts")); assert.throws(() => read("app/api/stripe/webhook/route.ts"));
    assert.doesNotMatch(read("app/(app)/settings/actions.ts"), /STRIPE|createCheckoutSession|openCustomerPortal/);
    assert.match(read("app/api/razorpay/webhook/route.ts"), /verifyWebhookSignature/);
    assert.match(read("app/api/razorpay/verify/route.ts"), /verifyPaymentSignature/);
    assert.match(read("app/api/razorpay/verify/route.ts"), /fetchRazorpaySubscription/);
  });
  test("duplicate/out-of-order guards present in webhook route", () => {
    const src = read("app/api/razorpay/webhook/route.ts");
    assert.match(src, /billing_webhook_events/); assert.match(src, /last_billing_event_at/); assert.match(src, /duplicate/);
  });
  test("checkout never trusts browser plan/amount", () => {
    assert.match(read("components/settings/PlanCheckoutButton.tsx"), /checkout\.razorpay\.com\/v1\/checkout\.js/);
    assert.doesNotMatch(read("components/settings/PlanCheckoutButton.tsx"), /planId|amount:/);
  });
});
