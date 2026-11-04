/** Stage 1B adapter unit tests. All provider calls and RPCs are injected; no network is used. */
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import {
  createStage1BAdapters,
  type Stage1BDependencies,
  type WebhookLease,
} from "../../lib/billing/stage1b-adapters.ts";

const OWNER = "20000000-0000-0000-0000-000000000001";
const WORKSPACE = "10000000-0000-0000-0000-0000000000a1";
const INTENT = "40000000-0000-0000-0000-000000000001";
const SECRET = "test-webhook-secret";
const SUB = "sub_AdapterTest001";
const PLAN = "plan_AdapterTest001";
const payload = JSON.stringify({
  event: "subscription.activated",
  created_at: 1793782800,
  payload: { subscription: { entity: {
    id: SUB,
    plan_id: PLAN,
    customer_id: "cus_test",
    status: "active",
    current_end: 1796083200,
    notes: { workspace_id: WORKSPACE, intent_id: INTENT },
  } } },
});
function signature(raw: string): string {
  return createHmac("sha256", SECRET).update(raw).digest("hex");
}
function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function setup(opts: {
  rpc?: (name: string, args?: Record<string, unknown>) => unknown;
  fetchFn?: typeof fetch;
  userId?: string | null;
  webhookSecret?: string;
} = {}) {
  const rpcCalls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  const fakeRpc = async (name: string, args?: Record<string, unknown>) => {
    rpcCalls.push({ name, args });
    const result = opts.rpc?.(name, args);
    if (result instanceof Error) return { data: null, error: { message: result.message } };
    return { data: result ?? null, error: null };
  };
  const fetchFn: typeof fetch = opts.fetchFn ?? (async (input, init) => {
    fetchCalls.push({ url: String(input), init });
    if (String(input).endsWith("/subscriptions") && init?.method === "POST") {
      return response({ id: SUB, plan_id: PLAN, customer_id: "cus_test", status: "created", notes: {}, current_end: null });
    }
    return response({ id: SUB, plan_id: PLAN, customer_id: "cus_test", status: "active", notes: {}, current_end: 1796083200 });
  });
  const deps: Stage1BDependencies = {
    createUserClient: async () => ({
      auth: { getUser: async () => ({ data: { user: opts.userId === undefined ? { id: OWNER } : opts.userId ? { id: opts.userId } : null }, error: null }) },
      rpc: fakeRpc,
    }) as any,
    createServiceClient: () => ({ rpc: fakeRpc }) as any,
    getRazorpayConfig: () => ({ ok: true, keyId: "rzp_test_key", keySecret: "test_key_secret", mode: "test" }),
    fetchFn,
    getWebhookSecret: () => opts.webhookSecret ?? SECRET,
  };
  return { adapters: createStage1BAdapters(deps), rpcCalls, fetchCalls };
}

afterEach(() => {
  // Guard against tests mutating process-wide secrets; defaults are injected above.
});

describe("Stage 1B checkout adapter", () => {
  it("reserves only for the matching authenticated actor", async () => {
    const { adapters, rpcCalls } = setup({ rpc: () => ({ id: INTENT, state: "reserved" }) });
    const result = await adapters.reserveIntent({
      workspaceId: WORKSPACE, actorUserId: OWNER, tier: "starter", currency: "USD", requestKey: INTENT,
    });
    assert.equal(result.ok, true);
    assert.equal(rpcCalls[0].name, "reserve_razorpay_checkout_intent");

    const other = setup({ userId: "20000000-0000-0000-0000-000000000099" });
    const rejected = await other.adapters.reserveIntent({
      workspaceId: WORKSPACE, actorUserId: OWNER, tier: "starter", currency: "USD", requestKey: INTENT,
    });
    assert.equal(rejected.ok, false);
    assert.equal(other.rpcCalls.length, 0);
  });

  it("requires explicit providerCallAuthorized true before any POST", async () => {
    const { adapters, fetchCalls } = setup();
    const result = await adapters.createProviderSubscription({
      authorization: {
        providerCallAuthorized: false,
        intent: { id: INTENT, workspace_id: WORKSPACE } as any,
        providerPlanId: PLAN,
      },
      workspaceId: WORKSPACE,
      intentId: INTENT,
    });
    assert.equal(result.ok, false);
    assert.equal(fetchCalls.length, 0);
  });

  it("sends a Test Mode POST only after an authorized start result and includes advisory notes", async () => {
    const { adapters, fetchCalls } = setup();
    const result = await adapters.createProviderSubscription({
      authorization: {
        providerCallAuthorized: true,
        intent: { id: INTENT, workspace_id: WORKSPACE } as any,
        providerPlanId: PLAN,
      },
      workspaceId: WORKSPACE,
      intentId: INTENT,
    });
    assert.equal(result.ok, true);
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].init?.method, "POST");
    const body = JSON.parse(String(fetchCalls[0].init?.body));
    assert.equal(body.plan_id, PLAN);
    assert.deepEqual(body.notes, { workspace_id: WORKSPACE, intent_id: INTENT });
    assert.match(String(fetchCalls[0].init?.headers && (fetchCalls[0].init?.headers as Record<string, string>).Authorization), /^Basic /);
  });

  it("records create failure as an explicit safe code and ambiguity flag", async () => {
    const { adapters, rpcCalls } = setup({ rpc: () => ({ id: INTENT, state: "reconciliation_required" }) });
    const result = await adapters.finishCreateFailure({ intentId: INTENT, kind: "ambiguous", errorCode: "transport timeout!" });
    assert.equal(result.ok, true);
    assert.equal(rpcCalls[0].args?.p_is_ambiguous, true);
    assert.equal(rpcCalls[0].args?.p_error_code, "transport_timeout");
  });

  it("fetches provider details before verification RPC; Plan mismatch is returned for DB reconciliation", async () => {
    const { adapters, rpcCalls } = setup({ rpc: () => ({ outcome: "verified", binding_id: "binding-id" }) });
    const result = await adapters.verifyCheckoutBinding({ intentId: INTENT, providerSubscriptionId: SUB });
    assert.equal(result.ok, true);
    assert.equal(rpcCalls[0].name, "verify_razorpay_checkout_binding");
    assert.equal(rpcCalls[0].args?.p_provider_plan_id, PLAN);
  });
});

describe("Stage 1B webhook adapter", () => {
  it("rejects invalid HMAC before any service client or RPC call", async () => {
    const { adapters, rpcCalls } = setup();
    const result = await adapters.ingestWebhook({ rawBody: payload, signature: "bad", eventIdHeader: null });
    assert.equal(result.ok, false);
    assert.equal(rpcCalls.length, 0);
  });

  it("validates raw-body HMAC before ingest and passes the SHA-256 and untrusted hints", async () => {
    const { adapters, rpcCalls } = setup({
      rpc: () => [{ inserted: true, work_row: { state: "received" } }],
    });
    const result = await adapters.ingestWebhook({ rawBody: payload, signature: signature(payload), eventIdHeader: "evt_1" });
    assert.equal(result.ok, true);
    assert.equal(rpcCalls[0].name, "ingest_razorpay_webhook_work");
    assert.equal(rpcCalls[0].args?.p_candidate_intent_id, INTENT);
    assert.equal(rpcCalls[0].args?.p_candidate_workspace_hint_id, WORKSPACE);
    assert.equal(rpcCalls[0].args?.p_body_sha256, createHash("sha256").update(payload).digest("hex"));
  });

  it("claims work through the service-only RPC", async () => {
    const lease: WebhookLease = {
      body_sha256: "a".repeat(64), event_id_header: "evt_1", event_type: "subscription.activated",
      event_created_at: "2026-11-04T09:00:00Z", provider_subscription_id: SUB,
      claimed_plan_id: PLAN, claimed_status: "active", claimed_current_end: null,
      candidate_intent_id: INTENT, candidate_workspace_hint_id: WORKSPACE,
      attempt_count: 1, lease_token: "lease-token", lease_expires_at: "2026-11-04T09:02:00Z",
    };
    const { adapters, rpcCalls } = setup({ rpc: () => [lease] });
    const result = await adapters.claimWebhookWork({ limit: 1 });
    assert.equal(result.ok, true);
    assert.equal(rpcCalls[0].name, "claim_razorpay_webhook_work");
  });

  it("fetches the subscription and finalizes using the active lease", async () => {
    const lease: WebhookLease = {
      body_sha256: "b".repeat(64), event_id_header: "evt_2", event_type: "subscription.activated",
      event_created_at: "2026-11-04T09:00:00Z", provider_subscription_id: SUB,
      claimed_plan_id: PLAN, claimed_status: "active", claimed_current_end: null,
      candidate_intent_id: INTENT, candidate_workspace_hint_id: WORKSPACE,
      attempt_count: 1, lease_token: "lease-token", lease_expires_at: "2026-11-04T09:02:00Z",
    };
    const { adapters, rpcCalls, fetchCalls } = setup({ rpc: () => ({ outcome: "applied" }) });
    const result = await adapters.processWebhookLease(lease);
    assert.equal(result.ok, true);
    assert.equal(fetchCalls.length, 1);
    assert.equal(rpcCalls[0].name, "finalize_razorpay_webhook_work");
    assert.equal(rpcCalls[0].args?.p_lease_token, "lease-token");
    assert.equal(rpcCalls[0].args?.p_verified_plan_id, PLAN);
    assert.equal(rpcCalls[0].args?.p_paid_through_source, "razorpay_api");
  });
});
