import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  buildCreateSubscriptionBody,
  cancelRazorpaySubscription,
  createRazorpaySubscription,
  fetchRazorpaySubscription,
  findPlan,
  findPlanById,
  getRazorpayServerConfig,
  grantsPro,
  mapRazorpayStatus,
  parsePlansEnv,
  parseRazorpayWebhookEvent,
  razorpayKeyMode,
  statusForWebhookEvent,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../../lib/razorpay.ts";

const sign = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

// ═══════════════════════════════════════════════════════════════════════
// SECURITY REGRESSION TESTS — Razorpay billing (post-merge safety audit)
// These tests verify that the security properties documented in
// docs/razorpay-premerge-security-review.md hold. They do NOT contact
// the live Razorpay API.
// ═══════════════════════════════════════════════════════════════════════

describe("SECURITY: payment signature — replay / cross-binding attacks", () => {
  const secret = "test_secret";
  const paymentId = "pay_ABC123";
  const subscriptionId = "sub_XYZ789";
  const validSig = sign(secret, `${paymentId}|${subscriptionId}`);

  test("valid signature passes", () => {
    assert.equal(
      verifyPaymentSignature({ paymentId, subscriptionId, signature: validSig, keySecret: secret }),
      true,
    );
  });

  test("REPLAY: same payment_id with different subscription_id fails", () => {
    assert.equal(
      verifyPaymentSignature({
        paymentId,
        subscriptionId: "sub_DIFFERENT",
        signature: validSig,
        keySecret: secret,
      }),
      false,
    );
  });

  test("REPLAY: same subscription_id with different payment_id fails", () => {
    assert.equal(
      verifyPaymentSignature({
        paymentId: "pay_DIFFERENT",
        subscriptionId,
        signature: validSig,
        keySecret: secret,
      }),
      false,
    );
  });

  test("WRONG SECRET: valid signature with wrong secret fails", () => {
    assert.equal(
      verifyPaymentSignature({ paymentId, subscriptionId, signature: validSig, keySecret: "wrong" }),
      false,
    );
  });

  test("EMPTY FIELDS: missing payment_id / subscription_id / signature always fails", () => {
    assert.equal(verifyPaymentSignature({ paymentId: "", subscriptionId, signature: validSig, keySecret: secret }), false);
    assert.equal(verifyPaymentSignature({ paymentId, subscriptionId: "", signature: validSig, keySecret: secret }), false);
    assert.equal(verifyPaymentSignature({ paymentId, subscriptionId, signature: "", keySecret: secret }), false);
  });

  test("TRUNCATED: signature shorter than expected fails", () => {
    assert.equal(
      verifyPaymentSignature({ paymentId, subscriptionId, signature: validSig.slice(0, 32), keySecret: secret }),
      false,
    );
  });

  test("TIMING-SAFE: implementation uses timingSafeEqual (source-level guard)", () => {
    const src = readFileSync(new URL("../../lib/razorpay.ts", import.meta.url), "utf8");
    assert.match(src, /timingSafeEqual/, "signature comparison must use timingSafeEqual");
  });
});

describe("SECURITY: webhook signature — raw-body requirement", () => {
  const secret = "whsec_test";
  const payload = JSON.stringify({ event: "subscription.activated", payload: { subscription: { entity: { id: "sub_1" } } } });

  test("valid signature over raw body passes", () => {
    assert.equal(verifyWebhookSignature({ webhookSecret: secret, signature: sign(secret, payload), raw: payload }), true);
  });

  test("REPLAY: same signature with different payload fails", () => {
    const sig = sign(secret, payload);
    const modified = payload.replace("sub_1", "sub_EVIL");
    assert.equal(verifyWebhookSignature({ webhookSecret: secret, signature: sig, raw: modified }), false);
  });

  test("WRONG SECRET: valid signature with wrong secret fails", () => {
    assert.equal(verifyWebhookSignature({ webhookSecret: "wrong", signature: sign(secret, payload), raw: payload }), false);
  });

  test("EMPTY signature always fails", () => {
    assert.equal(verifyWebhookSignature({ webhookSecret: secret, signature: "", raw: payload }), false);
  });

  test("source: webhook route uses raw request.text() for signature verification", () => {
    const src = readFileSync(new URL("../../app/api/razorpay/webhook/route.ts", import.meta.url), "utf8");
    assert.match(src, /await request\.text\(\)/, "webhook must read raw body for HMAC");
    assert.match(readFileSync(new URL("../../lib/billing/webhook-processor.ts", import.meta.url), "utf8"), /verifyWebhookSignature\(\{/, "webhook must verify signature over the raw body");
  });
});

describe("SECURITY: cross-workspace subscription binding", () => {
  test("verify route checks workspace_id in subscription notes against requesting workspace", () => {
    const src = readFileSync(new URL("../../app/api/razorpay/verify/route.ts", import.meta.url), "utf8") + readFileSync(new URL("../../lib/billing/checkout-verify.ts", import.meta.url), "utf8");
    assert.match(src, /sub\.notes\?\.workspace_id/, "verify must check subscription notes workspace_id");
    assert.match(src, /context\.id/, "verify must compare against requesting workspace");
    assert.match(src, /does not belong to this workspace/, "verify must reject cross-workspace subscription");
  });

  test("verify route fetches subscription server-side (not trusting browser)", () => {
    const src = readFileSync(new URL("../../app/api/razorpay/verify/route.ts", import.meta.url), "utf8") + readFileSync(new URL("../../lib/billing/checkout-verify.ts", import.meta.url), "utf8");
    assert.match(src, /fetchRazorpaySubscription/, "verify must fetch subscription from Razorpay API");
  });

  test("verify route checks plan_id against configured plans", () => {
    const src = readFileSync(new URL("../../app/api/razorpay/verify/route.ts", import.meta.url), "utf8") + readFileSync(new URL("../../lib/billing/checkout-verify.ts", import.meta.url), "utf8");
    assert.match(src, /findPlanById/, "verify must check plan against server config");
    assert.match(src, /not a configured RoduCQ plan/, "verify must reject unknown plans");
  });

  test("verify route requires owner role", () => {
    const src = readFileSync(new URL("../../app/api/razorpay/verify/route.ts", import.meta.url), "utf8") + readFileSync(new URL("../../lib/billing/checkout-verify.ts", import.meta.url), "utf8");
    assert.match(src, /owner/, "verify must check owner role");
  });
});

describe("SECURITY: browser never supplies plan IDs or amounts", () => {
  test("checkout action resolves plan from server env, not browser", () => {
    const src = readFileSync(new URL("../../app/(app)/settings/actions.ts", import.meta.url), "utf8");
    assert.match(src, /findPlan\(plansConfig\.plans, currency\)/, "plan must be resolved from server config");
  });

  test("PlanCheckoutButton sends only currency to server action", () => {
    const src = readFileSync(new URL("../../components/settings/PlanCheckoutButton.tsx", import.meta.url), "utf8");
    assert.match(src, /createRazorpayCheckout\(chosen\.currency\)/, "button sends only currency");
    assert.doesNotMatch(src, /planId.*:|plan_id.*:/, "button must not send plan_id");
  });
});

describe("SECURITY: subscription states — only 'active' grants Pro", () => {
  test("ALL Razorpay states are mapped", () => {
    const states = ["created", "authenticated", "active", "pending", "halted", "paused", "cancelled", "canceled", "completed", "expired"];
    for (const s of states) {
      const mapped = mapRazorpayStatus(s);
      assert.ok(mapped, `${s} should map to a BillingStatus`);
    }
  });

  test("ONLY 'active' grants Pro — every other status denies", () => {
    const denyStates = ["created", "authenticated", "pending", "halted", "paused", "canceled", "completed", "expired"];
    for (const s of denyStates) {
      assert.equal(grantsPro(s), false, `${s} must NOT grant Pro`);
    }
    assert.equal(grantsPro("active"), true, "active must grant Pro");
  });

  test("'cancelled' (British spelling) maps to 'canceled' and does NOT grant Pro", () => {
    assert.equal(mapRazorpayStatus("cancelled"), "canceled");
    assert.equal(grantsPro("cancelled"), false);
  });

  test("unknown status returns null and does NOT grant Pro", () => {
    assert.equal(mapRazorpayStatus("unknown_state"), null);
    assert.equal(grantsPro("unknown_state"), false);
    assert.equal(grantsPro(null), false);
    assert.equal(grantsPro(undefined), false);
    assert.equal(grantsPro(""), false);
  });

  test("payment_failed does NOT grant Pro (conservative)", () => {
    assert.equal(grantsPro("pending"), false, "pending (post-failure) must not grant Pro");
    assert.equal(grantsPro("halted"), false, "halted (retries exhausted) must not grant Pro");
  });
});

describe("SECURITY: webhook event allowlist", () => {
  test("only allowlisted events are processed", () => {
    const allowed = [
      "subscription.authenticated", "subscription.activated", "subscription.charged",
      "subscription.pending", "subscription.halted", "subscription.paused",
      "subscription.resumed", "subscription.cancelled", "subscription.completed",
      "subscription.updated", "payment.failed",
    ];
    for (const evt of allowed) {
      const payload = evt === "payment.failed"
        ? JSON.stringify({ event: evt, payload: { payment: { entity: { subscription_id: "sub_1" } } } })
        : JSON.stringify({ event: evt, payload: { subscription: { entity: { id: "sub_1", status: "active" } } } });
      const parsed = parseRazorpayWebhookEvent(payload);
      assert.notEqual(parsed.kind, "ignored", `${evt} must be processed`);
      assert.notEqual(parsed.kind, "invalid", `${evt} must be valid`);
    }
  });

  test("non-allowlisted events are ignored (not processed, not invalid)", () => {
    const ignored = ["order.paid", "refund.processed", "payment.authorized", "payment.captured"];
    for (const evt of ignored) {
      const parsed = parseRazorpayWebhookEvent(JSON.stringify({ event: evt }));
      assert.equal(parsed.kind, "ignored", `${evt} must be ignored`);
    }
  });

  test("malformed JSON returns invalid", () => {
    assert.equal(parseRazorpayWebhookEvent("{bad json").kind, "invalid");
    assert.equal(parseRazorpayWebhookEvent("").kind, "invalid");
  });

  test("missing event field returns invalid", () => {
    assert.equal(parseRazorpayWebhookEvent(JSON.stringify({ data: "no event field" })).kind, "invalid");
  });
});

describe("SECURITY: atomic webhook processing (single transaction)", () => {
  test("webhook route no longer performs separate ledger and billing writes", () => {
    const src = readFileSync(new URL("../../app/api/razorpay/webhook/route.ts", import.meta.url), "utf8") + readFileSync(new URL("../../lib/billing/webhook-processor.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /billing_webhook_events"\)\.insert/, "no standalone ledger insert");
    assert.doesNotMatch(src, /billing_subscriptions"\)\.upsert/, "no standalone billing upsert");
    assert.doesNotMatch(src, /billing_subscriptions"\)\.update/, "no standalone billing update");
  });

  test("state change and ledger record happen in ONE database function call", () => {
    const src = readFileSync(new URL("../../lib/billing/webhook-processor.ts", import.meta.url), "utf8") + readFileSync(new URL("../../app/api/razorpay/webhook/route.ts", import.meta.url), "utf8");
    assert.match(src, /apply_razorpay_subscription_event/, "the atomic function is the only write path");
    const mig = readFileSync(new URL("../../supabase/migrations/20261016120000_razorpay_atomic_ledger_entitlements.sql", import.meta.url), "utf8");
    assert.match(mig, /language plpgsql[\s\S]*security definer/i, "function is SECURITY DEFINER");
    assert.match(mig, /set search_path = public, pg_temp/, "fixed search_path");
    assert.match(mig, /on conflict do nothing/, "idempotency claim is atomic");
  });

  test("ledger claim precedes state change inside the function, so a failure rolls back both", () => {
    const mig = readFileSync(new URL("../../supabase/migrations/20261016120000_razorpay_atomic_ledger_entitlements.sql", import.meta.url), "utf8");
    const claim = mig.indexOf("on conflict do nothing");
    const write = mig.indexOf("insert into public.billing_subscriptions");
    const update = mig.indexOf("update public.billing_subscriptions set");
    assert.ok(claim > 0 && write > claim && update > claim, "claim must come before the state write");
  });

  test("the security comment documents the atomic design and the failure mode", () => {
    const src = readFileSync(new URL("../../app/api/razorpay/webhook/route.ts", import.meta.url), "utf8");
    assert.match(src, /SECURITY/, "must have a SECURITY comment");
    assert.match(src, /ONE database transaction/, "must document the single-transaction design");
  });
});

describe("SECURITY: out-of-order event guard", () => {
  test("ordering uses Razorpay created_at and the stored last_billing_event_at (database function)", () => {
    const mig = readFileSync(new URL("../../supabase/migrations/20261016120000_razorpay_atomic_ledger_entitlements.sql", import.meta.url), "utf8");
    assert.match(mig, /last_billing_event_at/, "must check event timestamps");
    assert.match(mig, /'stale'/, "must return stale for out-of-order events");
    assert.match(readFileSync(new URL("../../lib/billing/webhook-processor.ts", import.meta.url), "utf8"), /eventCreatedAt: new Date\(event\.createdAt \* 1000\)/, "event time comes from Razorpay created_at");
  });

  test("payment_failed is conditional on the stored state and subject to the same ordering", () => {
    const proc = readFileSync(new URL("../../lib/billing/webhook-processor.ts", import.meta.url), "utf8");
    assert.match(proc, /onlyIfActive: true/, "payment failures only downgrade an active subscription");
    assert.match(readFileSync(new URL("../../supabase/migrations/20261016120000_razorpay_atomic_ledger_entitlements.sql", import.meta.url), "utf8"), /p_only_if_active and v_row\.status <> 'active'/, "database enforces the active-only rule");
  });

  test("statusForWebhookEvent provides fallback when payload status is absent", () => {
    assert.equal(statusForWebhookEvent("subscription.activated", null), "active");
    assert.equal(statusForWebhookEvent("subscription.cancelled", null), "canceled");
    assert.equal(statusForWebhookEvent("subscription.halted", null), "halted");
    assert.equal(statusForWebhookEvent("subscription.completed", null), "completed");
    assert.equal(statusForWebhookEvent("subscription.unknown", null), null);
  });
});

describe("SECURITY: legacy Stripe entitlements are provider-aware (not blocked, not granted blindly)", () => {
  test("settings page no longer filters billing by provider='razorpay' (that hid legacy paid periods)", () => {
    const src = readFileSync(new URL("../../app/(app)/settings/page.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(src, /\.eq\("provider",\s*"razorpay"\)/, "provider filter must not hide legacy rows");
    assert.match(src, /resolveEntitlement\(billing/, "entitlement comes from the shared policy");
  });

  test("settings page never grants Pro from status alone", () => {
    const src = readFileSync(new URL("../../app/(app)/settings/page.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(src, /billing\?\.status === "active" \? "pro"/, "status-only grant removed");
  });

  test("migration preserves Stripe columns (non-destructive)", () => {
    const migration = readFileSync(new URL("../../supabase/migrations/20261016000000_razorpay_billing.sql", import.meta.url), "utf8");
    assert.doesNotMatch(migration, /DROP\s+COLUMN/i, "migration must not drop columns");
    assert.doesNotMatch(migration, /DELETE\s+FROM/i, "migration must not delete data");
    assert.match(migration, /add column if not exists razorpay/i, "migration adds Razorpay columns");
    assert.ok(
      /check\s*\(provider\s+in/.test(migration) && /stripe/.test(migration) && /razorpay/.test(migration),
      "migration adds provider check constraint",
    );
  });

  test("migration sets provider default to 'stripe' for legacy rows", () => {
    const migration = readFileSync(new URL("../../supabase/migrations/20261016000000_razorpay_billing.sql", import.meta.url), "utf8");
    assert.match(migration, /default\s+'stripe'/i, "existing rows default to 'stripe' provider");
  });
});

describe("SECURITY: cancellation authorization", () => {
  test("cancel action requires owner role", () => {
    const src = readFileSync(new URL("../../app/(app)/settings/actions.ts", import.meta.url), "utf8");
    assert.match(src, /cancelRazorpaySubscription/, "cancel action exists");
    assert.match(src, /role !== "owner"/, "cancel must check owner role");
  });

  test("cancel action fetches subscription from DB by workspace_id (not browser-supplied)", () => {
    const src = readFileSync(new URL("../../app/(app)/settings/actions.ts", import.meta.url), "utf8");
    const cancelIdx = src.indexOf("async function cancelRazorpaySubscription");
    const cancelFn = src.slice(cancelIdx);
    assert.match(cancelFn, /\.select\("razorpay_subscription_id"\)/, "cancel reads subscription from DB");
    assert.match(cancelFn, /\.eq\("workspace_id",\s*membership\.workspace_id\)/, "cancel scopes to workspace");
  });

  test("cancel uses cancel_at_cycle_end (non-destructive)", () => {
    const src = readFileSync(new URL("../../app/(app)/settings/actions.ts", import.meta.url), "utf8");
    assert.match(src, /cancelAtCycleEnd:\s*true/, "cancel must use cycle-end, not immediate");
  });
});

describe("SECURITY: Razorpay API failure handling", () => {
  test("create subscription handles API error gracefully", async () => {
    const fetchFn = async () => ({ ok: false, status: 500, json: async () => ({ error: { description: "Internal error" } }) });
    const result = await createRazorpaySubscription({ keyId: "rzp_test_x", keySecret: "s", planId: "plan_x", workspaceId: "ws", fetchFn: fetchFn as unknown as typeof fetch });
    assert.equal(result.ok, false);
    assert.match((result as { error: string }).error, /Internal error/);
  });

  test("fetch subscription handles network failure", async () => {
    const fetchFn = async () => { throw new Error("ECONNRESET"); };
    const result = await fetchRazorpaySubscription({ keyId: "rzp_test_x", keySecret: "s", subscriptionId: "sub_1", fetchFn: fetchFn as unknown as typeof fetch });
    assert.equal(result.ok, false);
    assert.match((result as { error: string }).error, /Could not reach Razorpay/);
  });

  test("cancel subscription handles network failure", async () => {
    const fetchFn = async () => { throw new Error("ECONNRESET"); };
    const result = await cancelRazorpaySubscription({ keyId: "rzp_test_x", keySecret: "s", subscriptionId: "sub_1", fetchFn: fetchFn as unknown as typeof fetch });
    assert.equal(result.ok, false);
    assert.match((result as { error: string }).error, /Could not reach Razorpay/);
  });

  test("API calls use AbortSignal.timeout (no hanging requests)", () => {
    const src = readFileSync(new URL("../../lib/razorpay.ts", import.meta.url), "utf8");
    assert.match(src, /AbortSignal\.timeout/, "API calls must have timeouts");
  });

  test("API calls use HTTPS (not HTTP)", () => {
    const src = readFileSync(new URL("../../lib/razorpay.ts", import.meta.url), "utf8");
    assert.match(src, /https:\/\/api\.razorpay\.com/, "API base must be HTTPS");
  });
});

describe("SECURITY: configuration validation", () => {
  test("missing RAZORPAY_PLANS returns error (no silent fallback)", () => {
    const r = parsePlansEnv(undefined);
    assert.equal(r.ok, false);
  });

  test("plan IDs must start with 'plan_' (rejects Stripe-style price_ ids)", () => {
    const r = parsePlansEnv('[{"currency":"INR","planId":"price_abc","amount":1499}]');
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /plan_/);
  });

  test("currency must be uppercase ISO-4217 (3 letters)", () => {
    assert.equal(parsePlansEnv('[{"currency":"inr","planId":"plan_a","amount":1}]').ok, false);
    assert.equal(parsePlansEnv('[{"currency":"US","planId":"plan_a","amount":1}]').ok, false);
    assert.equal(parsePlansEnv('[{"currency":"TOOLONG","planId":"plan_a","amount":1}]').ok, false);
    assert.equal(parsePlansEnv('[{"currency":"INR","planId":"plan_a","amount":1}]').ok, true);
  });

  test("amount must be positive (rejects zero / negative)", () => {
    assert.equal(parsePlansEnv('[{"currency":"INR","planId":"plan_a","amount":0}]').ok, false);
    assert.equal(parsePlansEnv('[{"currency":"INR","planId":"plan_a","amount":-1}]').ok, false);
  });

  test("duplicate currencies are rejected", () => {
    const r = parsePlansEnv(JSON.stringify([
      { currency: "INR", planId: "plan_a", amount: 100 },
      { currency: "INR", planId: "plan_b", amount: 200 },
    ]));
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /twice/);
  });

  test("findPlan returns null for unconfigured currency", () => {
    const r = parsePlansEnv('[{"currency":"INR","planId":"plan_a","amount":1499}]');
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(findPlan(r.plans, "USD"), null);
      assert.equal(findPlan(r.plans, "EUR"), null);
    }
  });

  test("findPlanById returns null for unknown plan ID", () => {
    const r = parsePlansEnv('[{"currency":"INR","planId":"plan_a","amount":1499}]');
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(findPlanById(r.plans, "plan_unknown"), null);
    }
  });
});

describe("SECURITY: key mode detection prevents test/live confusion", () => {
  test("rzp_test_ keys are detected as test mode", () => {
    assert.equal(razorpayKeyMode("rzp_test_abc123"), "test");
  });

  test("rzp_live_ keys are detected as live mode", () => {
    assert.equal(razorpayKeyMode("rzp_live_xyz789"), "live");
  });

  test("unknown key prefix is rejected", () => {
    assert.equal(razorpayKeyMode("sk_test_abc"), null);
    assert.equal(razorpayKeyMode("key_abc"), null);
    assert.equal(razorpayKeyMode(""), null);
  });

  test("getRazorpayServerConfig rejects unknown key prefixes", () => {
    const saved = process.env.RAZORPAY_KEY_ID;
    const savedSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_ID = "bad_prefix_abc";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    try {
      const r = getRazorpayServerConfig();
      assert.equal(r.ok, false);
      if (!r.ok) assert.match(r.error, /rzp_test_|rzp_live_/);
    } finally {
      if (saved) process.env.RAZORPAY_KEY_ID = saved; else delete process.env.RAZORPAY_KEY_ID;
      if (savedSecret) process.env.RAZORPAY_KEY_SECRET = savedSecret; else delete process.env.RAZORPAY_KEY_SECRET;
    }
  });
});

describe("SECURITY: no secrets are logged", () => {
  test("webhook route does not log signature material", () => {
    const src = readFileSync(new URL("../../app/api/razorpay/webhook/route.ts", import.meta.url), "utf8");
    assert.match(src, /console\.error\(result\.log\)/, "must log only the processor's sanitized log line");
    assert.doesNotMatch(src, /console\.log.*signature|console\.log.*secret|console\.log.*key/i, "must not log secrets");
  });

  test("verify route does not log signature material", () => {
    const src = readFileSync(new URL("../../app/api/razorpay/verify/route.ts", import.meta.url), "utf8") + readFileSync(new URL("../../lib/billing/checkout-verify.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /console\.log.*signature|console\.log.*secret|console\.log.*key/i, "must not log secrets");
  });

  test("lib/razorpay.ts does not log secrets", () => {
    const src = readFileSync(new URL("../../lib/razorpay.ts", import.meta.url), "utf8");
    assert.doesNotMatch(src, /console\.log.*secret|console\.log.*key/i, "must not log secrets");
  });
});

describe("SECURITY: subscription creation sends workspace notes", () => {
  test("buildCreateSubscriptionBody includes workspace_id in notes", () => {
    const body = buildCreateSubscriptionBody({ planId: "plan_abc", workspaceId: "11111111-2222-3333-4444-555555555555" });
    assert.equal(body.notes.workspace_id, "11111111-2222-3333-4444-555555555555");
    assert.equal(body.plan_id, "plan_abc");
    assert.equal(body.quantity, 1);
    assert.ok(body.total_count > 0, "must have a billing cycle count");
  });
});
