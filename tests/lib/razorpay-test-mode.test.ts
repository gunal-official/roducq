import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  ALLOWED_RAZORPAY_MODES,
  DEFAULT_RAZORPAY_MODE,
  LIVE_PAYMENTS_DISABLED_MESSAGE,
  getRazorpayClientConfig,
  getRazorpayMode,
  getRazorpayServerConfig,
  isRazorpayModeAllowed,
  isRazorpayTestModeActive,
  parseRazorpayModeEnv,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../../lib/razorpay.ts";

// ═══════════════════════════════════════════════════════════════════════
// RAZORPAY TEST MODE MILESTONE — configuration + production safety gate.
//
// These are MOCKED/CONFIG tests: they exercise lib/razorpay.ts directly with
// synthetic env values. They do NOT contact the Razorpay API and are NOT a
// substitute for the real Test Mode checkout/webhook verification in
// docs/RAZORPAY_TEST_MODE_SETUP.md (Phase 11).
// ═══════════════════════════════════════════════════════════════════════

const sign = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

const TEST_KEY = "rzp_test_abc123";
const LIVE_KEY = "rzp_live_xyz789";
const PLANS = JSON.stringify([{ currency: "INR", planId: "plan_abc", amount: 1499 }]);

const KEYS = [
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_MODE",
  "RAZORPAY_PLANS",
  "RAZORPAY_WEBHOOK_SECRET",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
] as const;

const saved: Record<string, string | undefined> = {};
for (const k of KEYS) saved[k] = process.env[k];

function resetEnv() {
  for (const k of KEYS) delete process.env[k];
}

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("RAZORPAY_MODE parsing", () => {
  test("unset defaults to test — never live", () => {
    assert.deepEqual(parseRazorpayModeEnv(undefined), { ok: true, mode: "test" });
    assert.deepEqual(parseRazorpayModeEnv(""), { ok: true, mode: "test" });
    assert.deepEqual(parseRazorpayModeEnv("   "), { ok: true, mode: "test" });
    assert.equal(DEFAULT_RAZORPAY_MODE, "test");
  });

  test("'test' and 'live' are recognised (case/space insensitive)", () => {
    assert.deepEqual(parseRazorpayModeEnv("test"), { ok: true, mode: "test" });
    assert.deepEqual(parseRazorpayModeEnv("TEST"), { ok: true, mode: "test" });
    assert.deepEqual(parseRazorpayModeEnv(" live "), { ok: true, mode: "live" });
  });

  test("anything else is a configuration error, not a silent fallback", () => {
    const r = parseRazorpayModeEnv("sandbox");
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /RAZORPAY_MODE must be "test"/);
  });

  test("getRazorpayMode reads process.env", () => {
    resetEnv();
    assert.deepEqual(getRazorpayMode(), { ok: true, mode: "test" });
    process.env.RAZORPAY_MODE = "live";
    assert.deepEqual(getRazorpayMode(), { ok: true, mode: "live" });
    process.env.RAZORPAY_MODE = "nope";
    assert.equal(getRazorpayMode().ok, false);
  });
});

describe("PRODUCTION SAFETY GATE: Live Mode is refused", () => {
  test("only 'test' is an allowed payment mode", () => {
    assert.deepEqual([...ALLOWED_RAZORPAY_MODES], ["test"]);
    assert.equal(isRazorpayModeAllowed("test"), true);
    assert.equal(isRazorpayModeAllowed("live"), false);
  });

  test("RAZORPAY_MODE=live is refused even with a live key", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = LIVE_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_MODE = "live";
    const r = getRazorpayServerConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, LIVE_PAYMENTS_DISABLED_MESSAGE);
  });

  test("a live key with the default (unset) mode is refused", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = LIVE_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    const r = getRazorpayServerConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /RAZORPAY_MODE=test but RAZORPAY_KEY_ID is a live-mode key/);
  });

  test("a test key cannot be used to declare live mode", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_MODE = "live";
    const r = getRazorpayServerConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /RAZORPAY_MODE=live but RAZORPAY_KEY_ID is a test-mode key/);
  });

  test("there is no env var that enables live mode", () => {
    // The gate is a compile-time constant list, not configuration. Guard
    // against a future "RAZORPAY_ENABLE_LIVE"-style escape hatch.
    const src = readFileSync(new URL("../../lib/razorpay.ts", import.meta.url), "utf8");
    assert.match(src, /ALLOWED_RAZORPAY_MODES: readonly RazorpayMode\[\] = \["test"\]/);
    assert.doesNotMatch(src, /process\.env\.[A-Z_]*(LIVE|PRODUCTION|ENABLE)[A-Z_]*/);
  });
});

describe("Test Mode configuration is accepted", () => {
  test("test key + explicit RAZORPAY_MODE=test → ok", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_MODE = "test";
    const r = getRazorpayServerConfig();
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.mode, "test");
  });

  test("test key + unset RAZORPAY_MODE → ok (safe default)", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    assert.equal(getRazorpayServerConfig().ok, true);
  });
});

describe("Missing / invalid configuration fails closed with clear errors", () => {
  test("no credentials → 'not configured', never an exception", () => {
    resetEnv();
    const r = getRazorpayServerConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET/);
  });

  test("secret missing → not configured", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    assert.equal(getRazorpayServerConfig().ok, false);
  });

  test("unknown key prefix → rejected", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = "sk_test_abc";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    const r = getRazorpayServerConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /rzp_test_|rzp_live_/);
  });

  test("invalid RAZORPAY_MODE blocks billing even with valid test keys", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_MODE = "staging";
    const r = getRazorpayServerConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /RAZORPAY_MODE must be "test"/);
  });
});

describe("NEXT_PUBLIC_RAZORPAY_KEY_ID cross-check", () => {
  test("unset public key → server key is used", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    const r = getRazorpayClientConfig();
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.keyId, TEST_KEY);
      assert.equal(r.mode, "test");
    }
  });

  test("matching public key → ok", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = TEST_KEY;
    assert.equal(getRazorpayClientConfig().ok, true);
  });

  test("mismatched public key is refused before checkout opens", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_different";
    const r = getRazorpayClientConfig();
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /does not match RAZORPAY_KEY_ID/);
  });

  test("a live public key can never be exposed via the test path", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = LIVE_KEY;
    assert.equal(getRazorpayClientConfig().ok, false);
  });

  test("client config inherits the server gate (live keys blocked here too)", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = LIVE_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_MODE = "live";
    assert.equal(getRazorpayClientConfig().ok, false);
  });
});

describe("Test Mode indicator (isRazorpayTestModeActive)", () => {
  test("true only when keys + plans are all valid test-mode config", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_MODE = "test";
    process.env.RAZORPAY_PLANS = PLANS;
    assert.equal(isRazorpayTestModeActive(), true);
  });

  test("false when billing is unconfigured", () => {
    resetEnv();
    assert.equal(isRazorpayTestModeActive(), false);
  });

  test("false when RAZORPAY_PLANS is missing", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    assert.equal(isRazorpayTestModeActive(), false);
  });

  test("false for live-mode credentials (indicator can never mislabel live)", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = LIVE_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_MODE = "live";
    process.env.RAZORPAY_PLANS = PLANS;
    assert.equal(isRazorpayTestModeActive(), false);
  });

  test("false when the public key mismatches", () => {
    resetEnv();
    process.env.RAZORPAY_KEY_ID = TEST_KEY;
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_PLANS = PLANS;
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_other";
    assert.equal(isRazorpayTestModeActive(), false);
  });
});

describe("Test Mode gate is enforced at every billing entry point", () => {
  const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

  test("checkout, cancel, verify and webhook all go through the gated config", () => {
    assert.match(read("app/(app)/settings/actions.ts"), /getRazorpayServerConfig\(\)/);
    assert.match(read("app/(app)/settings/actions.ts"), /getRazorpayClientConfig\(\)/);
    assert.match(read("app/api/razorpay/verify/route.ts"), /getRazorpayServerConfig\(\)/);
    assert.match(read("app/api/razorpay/webhook/route.ts"), /getRazorpayServerConfig\(\)/);
  });

  test("the public checkout key is resolved before any subscription is created", () => {
    const src = read("app/(app)/settings/actions.ts");
    const clientAt = src.indexOf("getRazorpayClientConfig()");
    const createAt = src.indexOf("await createRazorpaySubscription(");
    assert.ok(clientAt > 0 && createAt > 0, "both calls must exist");
    assert.ok(clientAt < createAt, "client key check must precede subscription creation");
  });

  test("no credential is hardcoded anywhere in the billing surface", () => {
    for (const f of [
      "lib/razorpay.ts",
      "lib/billing/checkout-verify.ts",
      "lib/billing/webhook-processor.ts",
      "app/(app)/settings/actions.ts",
      "app/api/razorpay/verify/route.ts",
      "app/api/razorpay/webhook/route.ts",
      "components/settings/PlanCheckoutButton.tsx",
    ]) {
      assert.doesNotMatch(read(f), /rzp_(test|live)_[A-Za-z0-9]{6,}/, `${f} must not embed a real key`);
    }
  });

  test("no committed env file carries a secret value", () => {
    const env = readFileSync(new URL("../../.env.local.example", import.meta.url), "utf8");
    assert.doesNotMatch(env, /RAZORPAY_KEY_SECRET=.+\S/, "example must not contain a real secret");
    assert.match(env, /RAZORPAY_MODE=test/, "example documents the test-mode default");
  });
});

describe("Test Mode does not weaken signature verification", () => {
  test("webhook signature still requires an exact HMAC over the raw body", () => {
    const raw = JSON.stringify({ event: "subscription.activated" });
    const good = sign("whsec", raw);
    assert.equal(verifyWebhookSignature({ webhookSecret: "whsec", signature: good, raw }), true);
    assert.equal(verifyWebhookSignature({ webhookSecret: "whsec", signature: good.toUpperCase(), raw }), false);
    assert.equal(verifyWebhookSignature({ webhookSecret: "whsec", signature: good, raw: raw + " " }), false);
    assert.equal(verifyWebhookSignature({ webhookSecret: "whsec", signature: "", raw }), false);
    assert.equal(
      verifyPaymentSignature({ paymentId: "pay_1", subscriptionId: "sub_1", signature: sign("k", "pay_1|sub_1"), keySecret: "k" }),
      true,
    );
  });
});
