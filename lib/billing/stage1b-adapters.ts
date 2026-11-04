import "server-only";

import { createHash } from "node:crypto";
import { createServiceClient } from "../supabase/service.ts";
import {
  RAZORPAY_API_BASE,
  SUBSCRIPTION_TOTAL_COUNT,
  getRazorpayServerConfig,
  mapRazorpayStatus,
  parseRazorpayWebhookEvent,
  statusForWebhookEvent,
  verifyWebhookSignature,
  type BillingStatus,
} from "../razorpay.ts";

export type Stage1BTier = "pro" | "starter" | "team";
export type Stage1BStatus = BillingStatus;

type RpcResult = { data: any; error: { message: string } | null };
type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResult> };
type AuthClient = RpcClient & { auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }> } };

export interface CheckoutIntent {
  id: string;
  workspace_id: string;
  initiating_owner_id: string;
  plan_catalog_id: string;
  request_key: string;
  state: "reserved" | "provider_create_started" | "provider_created" | "verified" |
    "reconciliation_required" | "failed" | "expired";
  reservation_expires_at: string;
}

export type AdapterResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; retryable: boolean; certainty?: "definitive" | "ambiguous" };

export interface ReserveIntentInput {
  workspaceId: string;
  actorUserId: string;
  tier: Stage1BTier;
  currency: string;
  requestKey: string;
}

export interface CheckoutCreateAuthorization {
  providerCallAuthorized: boolean;
  intent: CheckoutIntent;
  providerPlanId: string | null;
}

export interface CreatedSubscription {
  id: string;
  plan_id: string;
  customer_id: string | null;
  status: string;
  notes: Record<string, string>;
  current_end: number | null;
}

export interface WebhookLease {
  body_sha256: string;
  event_id_header: string | null;
  event_type: string;
  event_created_at: string;
  provider_subscription_id: string | null;
  claimed_plan_id: string | null;
  claimed_status: Stage1BStatus | null;
  claimed_current_end: string | null;
  candidate_intent_id: string | null;
  candidate_workspace_hint_id: string | null;
  attempt_count: number;
  lease_token: string;
  lease_expires_at: string;
}

export interface Stage1BDependencies {
  createUserClient: () => Promise<AuthClient>;
  createServiceClient: () => RpcClient;
  getRazorpayConfig: typeof getRazorpayServerConfig;
  fetchFn: typeof fetch;
  getWebhookSecret: () => string | undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
const PLAN_ID_RE = /^plan_[A-Za-z0-9]{1,80}$/;
const SUBSCRIPTION_ID_RE = /^sub_[A-Za-z0-9]{1,80}$/;
const SAFE_CODE_RE = /^[a-z0-9_]{1,80}$/;

function ok<T>(value: T): AdapterResult<T> { return { ok: true, value }; }
function fail<T = never>(code: string, retryable = false, certainty?: "definitive" | "ambiguous"): AdapterResult<T> {
  return { ok: false, code, retryable, ...(certainty ? { certainty } : {}) };
}
function rpcErrorCode(message: string): string {
  const match = message.match(/[a-z][a-z0-9_]{2,79}/i);
  return match?.[0]?.toLowerCase() ?? "database_rpc_failed";
}
function toIsoFromUnix(seconds: number | null): string | null {
  return seconds !== null && Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : null;
}
function validUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}
function safeCode(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return SAFE_CODE_RE.test(normalized) ? normalized : "provider_error";
}
function parseSubscription(value: any): CreatedSubscription | null {
  if (!value || typeof value.id !== "string" || !SUBSCRIPTION_ID_RE.test(value.id)
      || typeof value.plan_id !== "string" || !PLAN_ID_RE.test(value.plan_id)) return null;
  return {
    id: value.id,
    plan_id: value.plan_id,
    customer_id: typeof value.customer_id === "string" ? value.customer_id : null,
    status: typeof value.status === "string" ? value.status : "",
    notes: value.notes && typeof value.notes === "object" ? value.notes as Record<string, string> : {},
    current_end: typeof value.current_end === "number" && Number.isFinite(value.current_end) ? value.current_end : null,
  };
}

const defaultDependencies: Stage1BDependencies = {
  createUserClient: async () => {
    const { createClient } = await import("../supabase/server.ts");
    return await createClient() as unknown as AuthClient;
  },
  createServiceClient: () => createServiceClient() as unknown as RpcClient,
  getRazorpayConfig: getRazorpayServerConfig,
  fetchFn: fetch,
  getWebhookSecret: () => process.env.RAZORPAY_WEBHOOK_SECRET,
};

/**
 * Server-only Stage 1B adapter factory. It is deliberately not imported by
 * checkout pages, actions, or webhook routes in this implementation.
 */
export function createStage1BAdapters(deps: Stage1BDependencies = defaultDependencies) {
  const service = () => deps.createServiceClient();

  async function reserveIntent(input: ReserveIntentInput): Promise<AdapterResult<CheckoutIntent>> {
    if (!UUID_RE.test(input.workspaceId) || !UUID_RE.test(input.actorUserId)
        || !UUID_RE.test(input.requestKey) || !/^[A-Z]{3}$/.test(input.currency)
        || !["pro", "starter", "team"].includes(input.tier)) {
      return fail("invalid_checkout_request");
    }
    try {
      const client = await deps.createUserClient();
      const auth = await client.auth.getUser();
      if (auth.error || auth.data.user?.id !== input.actorUserId) return fail("authentication_required");
      const { data, error } = await client.rpc("reserve_razorpay_checkout_intent", {
        p_workspace_id: input.workspaceId,
        p_tier: input.tier,
        p_currency: input.currency,
        p_request_key: input.requestKey,
      });
      if (error) return fail(rpcErrorCode(error.message));
      return data ? ok(data as CheckoutIntent) : fail("reservation_not_returned");
    } catch {
      return fail("reservation_unavailable", true);
    }
  }

  async function startCheckoutCreate(input: {
    intentId: string;
    workspaceId: string;
    initiatingOwnerId: string;
  }): Promise<AdapterResult<CheckoutCreateAuthorization>> {
    try {
      const userClient = await deps.createUserClient();
      const auth = await userClient.auth.getUser();
      if (auth.error || auth.data.user?.id !== input.initiatingOwnerId) return fail("authentication_required");
      const { data, error } = await service().rpc("start_razorpay_checkout_create", {
        p_intent_id: input.intentId,
        p_workspace_id: input.workspaceId,
        p_initiating_owner_id: input.initiatingOwnerId,
      });
      if (error) return fail(rpcErrorCode(error.message));
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.intent_row) return fail("create_authorization_not_returned");
      return ok({
        providerCallAuthorized: row.provider_call_authorized === true,
        intent: row.intent_row as CheckoutIntent,
        providerPlanId: typeof row.provider_plan_id === "string" ? row.provider_plan_id : null,
      });
    } catch {
      return fail("create_authorization_unavailable", true);
    }
  }

  async function createProviderSubscription(input: {
    authorization: CheckoutCreateAuthorization;
    workspaceId: string;
    intentId: string;
  }): Promise<AdapterResult<CreatedSubscription>> {
    // This explicit proof check must precede config access and every network POST.
    if (input.authorization.providerCallAuthorized !== true
        || input.authorization.intent.id !== input.intentId
        || input.authorization.intent.workspace_id !== input.workspaceId
        || !input.authorization.providerPlanId
        || !PLAN_ID_RE.test(input.authorization.providerPlanId)) {
      return fail("provider_call_not_authorized", false, "definitive");
    }
    const config = deps.getRazorpayConfig();
    if (!config.ok || config.mode !== "test") return fail("test_mode_unavailable", false, "definitive");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await deps.fetchFn(`${RAZORPAY_API_BASE}/subscriptions`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: input.authorization.providerPlanId,
          total_count: SUBSCRIPTION_TOTAL_COUNT,
          quantity: 1,
          customer_notify: true,
          notes: { workspace_id: input.workspaceId, intent_id: input.intentId },
        }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      const subscription = parseSubscription(body);
      if (!response.ok) {
        const definitive = response.status >= 400 && response.status < 500;
        return fail(`razorpay_http_${response.status}`, !definitive, definitive ? "definitive" : "ambiguous");
      }
      if (!subscription) return fail("invalid_provider_response", true, "ambiguous");
      // A mismatched Plan still contains a real provider subscription ID. Return
      // it to the caller so recordCreatedSubscription can put the intent into
      // reconciliation_required instead of incorrectly closing it as failed.
      return ok(subscription);
    } catch {
      return fail("razorpay_create_transport_error", true, "ambiguous");
    } finally {
      clearTimeout(timeout);
    }
  }

  async function recordCreatedSubscription(input: {
    intentId: string;
    providerSubscriptionId: string;
    providerPlanId: string;
  }): Promise<AdapterResult<{ outcome: string; bindingId?: string }>> {
    try {
      const { data, error } = await service().rpc("record_razorpay_subscription_created", {
        p_intent_id: input.intentId,
        p_provider_subscription_id: input.providerSubscriptionId,
        p_provider_plan_id: input.providerPlanId,
      });
      if (error) return fail(rpcErrorCode(error.message));
      if (!data || typeof data.outcome !== "string") return fail("create_record_not_returned");
      return ok({ outcome: data.outcome, bindingId: typeof data.binding_id === "string" ? data.binding_id : undefined });
    } catch {
      return fail("create_record_unavailable", true);
    }
  }

  async function finishCreateFailure(input: {
    intentId: string;
    kind: "definitive" | "ambiguous";
    errorCode: string;
  }): Promise<AdapterResult<CheckoutIntent>> {
    try {
      const { data, error } = await service().rpc("finish_razorpay_checkout_create_failure", {
        p_intent_id: input.intentId,
        p_is_ambiguous: input.kind === "ambiguous",
        p_error_code: safeCode(input.errorCode),
      });
      if (error) return fail(rpcErrorCode(error.message));
      return data ? ok(data as CheckoutIntent) : fail("failure_transition_not_returned");
    } catch {
      return fail("failure_transition_unavailable", true);
    }
  }

  async function fetchProviderSubscription(subscriptionId: string): Promise<AdapterResult<CreatedSubscription>> {
    if (!SUBSCRIPTION_ID_RE.test(subscriptionId)) return fail("invalid_subscription_id");
    const config = deps.getRazorpayConfig();
    if (!config.ok || config.mode !== "test") return fail("test_mode_unavailable");
    try {
      const response = await deps.fetchFn(`${RAZORPAY_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}` },
        signal: AbortSignal.timeout(15_000),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) return fail(`razorpay_fetch_http_${response.status}`, response.status >= 500);
      const subscription = parseSubscription(body);
      if (!subscription || subscription.id !== subscriptionId) return fail("invalid_provider_response", true);
      return ok(subscription);
    } catch {
      return fail("razorpay_fetch_transport_error", true);
    }
  }

  async function verifyCheckoutBinding(input: {
    intentId: string;
    providerSubscriptionId: string;
  }): Promise<AdapterResult<{ outcome: string; bindingId?: string }>> {
    const fetched = await fetchProviderSubscription(input.providerSubscriptionId);
    if (!fetched.ok) return fetched;
    try {
      const { data, error } = await service().rpc("verify_razorpay_checkout_binding", {
        p_intent_id: input.intentId,
        p_provider_subscription_id: fetched.value.id,
        p_provider_plan_id: fetched.value.plan_id,
      });
      if (error) return fail(rpcErrorCode(error.message));
      return data ? ok({ outcome: data.outcome, bindingId: data.binding_id }) : fail("binding_verification_not_returned");
    } catch {
      return fail("binding_verification_unavailable", true);
    }
  }

  async function ingestWebhook(input: {
    rawBody: string;
    signature: string | null;
    eventIdHeader: string | null;
  }): Promise<AdapterResult<{ inserted: boolean; bodySha256: string; state: string }>> {
    const webhookSecret = deps.getWebhookSecret();
    // HMAC of the exact raw request bytes is checked before parsing, hashing,
    // client creation, or any database call.
    if (!webhookSecret || !verifyWebhookSignature({
      webhookSecret,
      signature: input.signature ?? "",
      raw: input.rawBody,
    })) return fail("invalid_webhook_signature");

    const event = parseRazorpayWebhookEvent(input.rawBody);
    if (event.kind === "invalid") return fail("invalid_webhook_payload");
    if (event.kind === "ignored") return ok({ inserted: false, bodySha256: createHash("sha256").update(input.rawBody).digest("hex"), state: "ignored" });
    if (event.createdAt === null) return fail("missing_event_timestamp");

    const bodySha256 = createHash("sha256").update(input.rawBody).digest("hex");
    const isPaymentFailed = event.kind === "payment_failed";
    const planId = event.kind === "subscription" ? event.planId : null;
    const status = isPaymentFailed
      ? "pending"
      : statusForWebhookEvent(event.eventType, event.razorpayStatus);
    const currentEnd = event.kind === "subscription" ? event.currentEnd : null;
    let intentHint: string | null = null;
    if (event.kind === "subscription") {
      try {
        const parsed = JSON.parse(input.rawBody) as { payload?: { subscription?: { entity?: { notes?: Record<string, unknown> } } } };
        intentHint = validUuid(parsed.payload?.subscription?.entity?.notes?.intent_id);
      } catch {
        // parseRazorpayWebhookEvent has already validated JSON; absent or malformed hints are ignored.
      }
    }
    const eventId = input.eventIdHeader && EVENT_ID_RE.test(input.eventIdHeader) ? input.eventIdHeader : null;
    const result = await service().rpc("ingest_razorpay_webhook_work", {
      p_body_sha256: bodySha256,
      p_event_id_header: eventId,
      p_event_type: event.eventType,
      p_event_created_at: new Date(event.createdAt * 1000).toISOString(),
      p_provider_subscription_id: event.subscriptionId,
      p_claimed_plan_id: planId,
      p_claimed_status: status,
      p_claimed_current_end: toIsoFromUnix(currentEnd),
      p_candidate_intent_id: intentHint,
      p_candidate_workspace_hint_id: event.kind === "subscription" ? validUuid(event.workspaceId) : null,
    });
    if (result.error) return fail(rpcErrorCode(result.error.message), true);
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row?.work_row) return fail("webhook_ingest_not_returned", true);
    return ok({ inserted: row.inserted === true, bodySha256, state: row.work_row.state });
  }

  async function claimWebhookWork(input: { limit?: number } = {}): Promise<AdapterResult<WebhookLease[]>> {
    try {
      const { data, error } = await service().rpc("claim_razorpay_webhook_work", { p_limit: input.limit ?? 20 });
      if (error) return fail(rpcErrorCode(error.message), true);
      return ok(Array.isArray(data) ? data as WebhookLease[] : []);
    } catch {
      return fail("webhook_claim_unavailable", true);
    }
  }

  async function processWebhookLease(lease: WebhookLease): Promise<AdapterResult<{ outcome: string }>> {
    const finalize = async (args: Record<string, unknown>) => {
      const { data, error } = await service().rpc("finalize_razorpay_webhook_work", args);
      if (error) return fail<{ outcome: string }>(rpcErrorCode(error.message), true);
      return data && typeof data.outcome === "string"
        ? ok({ outcome: data.outcome })
        : fail<{ outcome: string }>("webhook_finalize_not_returned", true);
    };
    if (!lease.provider_subscription_id) {
      return finalize({
        p_body_sha256: lease.body_sha256,
        p_lease_token: lease.lease_token,
        p_resolution: "ready",
        p_resolution_code: "subscription_id_missing",
      });
    }
    const fetched = await fetchProviderSubscription(lease.provider_subscription_id);
    if (!fetched.ok) {
      return finalize({
        p_body_sha256: lease.body_sha256,
        p_lease_token: lease.lease_token,
        p_resolution: fetched.retryable ? "retryable" : "unresolved",
        p_resolution_code: safeCode(fetched.code),
      });
    }

    const subscription = fetched.value;
    if (subscription.id !== lease.provider_subscription_id) {
      return finalize({
        p_body_sha256: lease.body_sha256,
        p_lease_token: lease.lease_token,
        p_resolution: "rejected",
        p_resolution_code: "provider_subscription_id_mismatch",
      });
    }
    if (lease.claimed_plan_id && lease.claimed_plan_id !== subscription.plan_id) {
      return finalize({
        p_body_sha256: lease.body_sha256,
        p_lease_token: lease.lease_token,
        p_resolution: "ready",
        p_resolution_code: "ready",
        p_verified_plan_id: subscription.plan_id,
        p_verified_customer_id: subscription.customer_id,
        p_verified_status: "created",
        p_verified_current_end: toIsoFromUnix(subscription.current_end),
        p_paid_through_source: subscription.current_end ? "razorpay_api" : null,
      });
    }

    const status = lease.event_type === "payment.failed"
      ? "pending"
      : statusForWebhookEvent(lease.event_type, mapRazorpayStatus(lease.claimed_status ?? subscription.status));
    if (!status) {
      return finalize({
        p_body_sha256: lease.body_sha256,
        p_lease_token: lease.lease_token,
        p_resolution: "unresolved",
        p_resolution_code: "provider_status_unavailable",
      });
    }
    const currentEnd = lease.claimed_current_end ?? toIsoFromUnix(subscription.current_end);
    return finalize({
      p_body_sha256: lease.body_sha256,
      p_lease_token: lease.lease_token,
      p_resolution: "ready",
      p_resolution_code: "ready",
      p_verified_plan_id: subscription.plan_id,
      p_verified_customer_id: subscription.customer_id,
      p_verified_status: status,
      p_verified_current_end: currentEnd,
      p_paid_through_source: currentEnd
        ? (lease.claimed_current_end ? "razorpay_webhook" : "razorpay_api")
        : null,
    });
  }

  return {
    reserveIntent,
    startCheckoutCreate,
    createProviderSubscription,
    recordCreatedSubscription,
    finishCreateFailure,
    verifyCheckoutBinding,
    ingestWebhook,
    claimWebhookWork,
    processWebhookLease,
  };
}

// Export a lazy default instance for server callers; construction does not make
// a network request or instantiate service credentials until a method runs.
const defaultAdapters = createStage1BAdapters();
export const reserveIntent = defaultAdapters.reserveIntent;
export const startCheckoutCreate = defaultAdapters.startCheckoutCreate;
export const createProviderSubscription = defaultAdapters.createProviderSubscription;
export const recordCreatedSubscription = defaultAdapters.recordCreatedSubscription;
export const finishCreateFailure = defaultAdapters.finishCreateFailure;
export const verifyCheckoutBinding = defaultAdapters.verifyCheckoutBinding;
export const ingestWebhook = defaultAdapters.ingestWebhook;
export const claimWebhookWork = defaultAdapters.claimWebhookWork;
export const processWebhookLease = defaultAdapters.processWebhookLease;
