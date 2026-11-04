import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { handleBillingCheckout, type CheckoutHandlerDependencies } from "../../lib/billing/checkout-handler.ts";

const USER = "20000000-0000-0000-0000-000000000001";
const WORKSPACE = "10000000-0000-0000-0000-0000000000a1";
const INTENT = "40000000-0000-0000-0000-000000000001";
const KEY = "50000000-0000-0000-0000-000000000001";

function setup(opts: {
  context?: { id: string; userId: string; role: "owner" | "member" | "viewer" } | null;
  config?: { ok: true; keyId: string; mode: "test" | "live" } | { ok: false; error: string };
  liveModeEnabled?: boolean;
  createFailure?: boolean;
  authFlag?: boolean;
} = {}) {
  const calls: string[] = [];
  const seen: Record<string, unknown> = {};
  const deps: CheckoutHandlerDependencies = {
    getContext: async () => opts.context === undefined ? { id: WORKSPACE, userId: USER, role: "owner" } : opts.context,
    getConfig: () => opts.config ?? { ok: true, keyId: "rzp_test_checkout", mode: "test" },
    liveModeEnabled: opts.liveModeEnabled ?? false,
    adapters: {
      reserveIntent: async (input) => {
        calls.push("reserve"); seen.reservation = input;
        return { ok: true, value: { id: INTENT, workspace_id: WORKSPACE } };
      },
      startCheckoutCreate: async (input) => {
        calls.push("authorize"); seen.authorization = input;
        return { ok: true, value: {
          providerCallAuthorized: opts.authFlag ?? true,
          intent: { id: INTENT, workspace_id: WORKSPACE },
          providerPlanId: "plan_TestPlan001",
        } };
      },
      createProviderSubscription: async (input) => {
        calls.push("provider"); seen.provider = input;
        if (opts.createFailure) return { ok: false, code: "razorpay_create_transport_error", retryable: true, certainty: "ambiguous" };
        return { ok: true, value: { id: "sub_TestSubscription001", plan_id: "plan_TestPlan001" } };
      },
      recordCreatedSubscription: async (input) => {
        calls.push("record"); seen.record = input;
        return { ok: true, value: { outcome: "recorded" } };
      },
      finishCreateFailure: async (input) => {
        calls.push("finishFailure"); seen.failure = input;
        return { ok: true, value: {} };
      },
    },
  };
  return { deps, calls, seen };
}
const request = (body: unknown) => new Request("https://example.test/api/billing/checkout", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
});

describe("POST /api/billing/checkout", () => {
  it("reserves, authorizes, creates in Test Mode, then records the provider subscription", async () => {
    const { deps, calls, seen } = setup();
    const response = await handleBillingCheckout(request({ tier: "team", request_key: KEY }), deps);
    assert.equal(response.status, 201);
    assert.deepEqual(calls, ["reserve", "authorize", "provider", "record"]);
    assert.deepEqual(seen.reservation, {
      workspaceId: WORKSPACE, actorUserId: USER, tier: "team", currency: "USD", requestKey: KEY,
    });
    assert.deepEqual(seen.provider, {
      authorization: {
        providerCallAuthorized: true,
        intent: { id: INTENT, workspace_id: WORKSPACE },
        providerPlanId: "plan_TestPlan001",
      },
      workspaceId: WORKSPACE,
      intentId: INTENT,
    });
    assert.deepEqual(await response.json(), {
      intentId: INTENT, subscriptionId: "sub_TestSubscription001", state: "recorded",
    });
  });

  it("rejects studio as contact-only and all tiers outside starter/team before database work", async () => {
    for (const tier of ["studio", "pro", "unknown"]) {
      const { deps, calls } = setup();
      const response = await handleBillingCheckout(request({ tier }), deps);
      assert.equal(response.status, 400);
      assert.deepEqual(calls, []);
    }
  });

  it("requires authenticated active workspace ownership", async () => {
    const unauth = setup({ context: null });
    assert.equal((await handleBillingCheckout(request({ tier: "starter" }), unauth.deps)).status, 401);
    assert.deepEqual(unauth.calls, []);

    const member = setup({ context: { id: WORKSPACE, userId: USER, role: "member" } });
    assert.equal((await handleBillingCheckout(request({ tier: "starter" }), member.deps)).status, 403);
    assert.deepEqual(member.calls, []);
  });

  it("fails closed if Live Mode is enabled or the configured key is not a Test key", async () => {
    for (const options of [
      { liveModeEnabled: true },
      { config: { ok: true as const, keyId: "rzp_live_checkout", mode: "live" as const } },
      { config: { ok: true as const, keyId: "unknown_key", mode: "test" as const } },
    ]) {
      const { deps, calls } = setup(options);
      assert.equal((await handleBillingCheckout(request({ tier: "starter" }), deps)).status, 503);
      assert.deepEqual(calls, []);
    }
  });

  it("finishes provider-create failures and returns 500 without proceeding to record", async () => {
    const { deps, calls, seen } = setup({ createFailure: true });
    const response = await handleBillingCheckout(request({ tier: "starter" }), deps);
    assert.equal(response.status, 500);
    assert.deepEqual(calls, ["reserve", "authorize", "provider", "finishFailure"]);
    assert.deepEqual(seen.failure, { intentId: INTENT, kind: "ambiguous", errorCode: "razorpay_create_transport_error" });
  });

  it("does not call Razorpay without the Stage 1B create authorization", async () => {
    const { deps, calls } = setup({ authFlag: false });
    assert.equal((await handleBillingCheckout(request({ tier: "team" }), deps)).status, 409);
    assert.deepEqual(calls, ["reserve", "authorize"]);
  });
});
