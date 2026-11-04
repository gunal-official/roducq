import { randomUUID } from "node:crypto";

export interface CheckoutContext {
  id: string;
  userId: string;
  role: "owner" | "member" | "viewer";
}

type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; retryable?: boolean; certainty?: "definitive" | "ambiguous" };

export interface CheckoutFlowAdapters {
  reserveIntent(input: {
    workspaceId: string;
    actorUserId: string;
    tier: "starter" | "team";
    currency: "USD";
    requestKey: string;
  }): Promise<Result<{ id: string; workspace_id: string }>>;
  startCheckoutCreate(input: {
    intentId: string;
    workspaceId: string;
    initiatingOwnerId: string;
  }): Promise<Result<{
    providerCallAuthorized: boolean;
    intent: { id: string; workspace_id: string };
    providerPlanId: string | null;
  }>>;
  createProviderSubscription(input: {
    authorization: {
      providerCallAuthorized: boolean;
      intent: { id: string; workspace_id: string };
      providerPlanId: string | null;
    };
    workspaceId: string;
    intentId: string;
  }): Promise<Result<{ id: string; plan_id: string }>>;
  recordCreatedSubscription(input: {
    intentId: string;
    providerSubscriptionId: string;
    providerPlanId: string;
  }): Promise<Result<{ outcome: string }>>;
  finishCreateFailure(input: {
    intentId: string;
    kind: "definitive" | "ambiguous";
    errorCode: string;
  }): Promise<Result<unknown>>;
}

export interface CheckoutHandlerDependencies {
  getContext(): Promise<CheckoutContext | null>;
  getConfig(): { ok: true; keyId: string; mode: "test" | "live" } | { ok: false; error: string };
  liveModeEnabled: boolean;
  adapters: CheckoutFlowAdapters;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: Record<string, unknown>, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** HTTP orchestration for Stage 1C checkout. Every provider POST follows the
 * database reservation and the explicit create-authorization RPC. */
export async function handleBillingCheckout(
  request: Request,
  deps: CheckoutHandlerDependencies,
): Promise<Response> {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Invalid checkout request." }, 400);
  }
  if (body.tier === "studio") {
    return json({ error: "Studio is contact-only. Please contact sales." }, 400);
  }
  if (body.tier !== "starter" && body.tier !== "team") {
    return json({ error: "Choose the Starter or Team plan." }, 400);
  }
  const requestKey = body.request_key === undefined ? randomUUID() : body.request_key;
  if (typeof requestKey !== "string" || !UUID_RE.test(requestKey)) {
    return json({ error: "Invalid checkout request key." }, 400);
  }

  const context = await deps.getContext();
  if (!context) return json({ error: "Authentication required." }, 401);
  if (context.role !== "owner") return json({ error: "Only workspace owners can start billing." }, 403);

  const config = deps.getConfig();
  if (!config.ok || config.mode !== "test" || !config.keyId.startsWith("rzp_test_") || deps.liveModeEnabled) {
    return json({ error: "Test Mode billing is unavailable." }, 503);
  }

  const reserved = await deps.adapters.reserveIntent({
    workspaceId: context.id,
    actorUserId: context.userId,
    tier: body.tier,
    currency: "USD",
    requestKey,
  });
  if (!reserved.ok || reserved.value.workspace_id !== context.id) {
    return json({ error: "Could not reserve checkout." }, 409);
  }

  const authorized = await deps.adapters.startCheckoutCreate({
    intentId: reserved.value.id,
    workspaceId: context.id,
    initiatingOwnerId: context.userId,
  });
  if (!authorized.ok) return json({ error: "Could not authorize checkout creation." }, 409);
  if (authorized.value.intent.id !== reserved.value.id
      || authorized.value.intent.workspace_id !== context.id
      || !authorized.value.providerPlanId) {
    return json({ error: "Checkout authorization did not match the reservation." }, 409);
  }
  if (!authorized.value.providerCallAuthorized) {
    return json({ error: "Checkout creation was not authorized." }, 409);
  }

  const created = await deps.adapters.createProviderSubscription({
    authorization: authorized.value,
    workspaceId: context.id,
    intentId: authorized.value.intent.id,
  });
  if (!created.ok) {
    await deps.adapters.finishCreateFailure({
      intentId: authorized.value.intent.id,
      kind: created.certainty === "ambiguous" || created.retryable ? "ambiguous" : "definitive",
      errorCode: created.code,
    }).catch(() => undefined);
    return json({ error: "Razorpay could not create the subscription." }, 500);
  }

  const recorded = await deps.adapters.recordCreatedSubscription({
    intentId: authorized.value.intent.id,
    providerSubscriptionId: created.value.id,
    providerPlanId: created.value.plan_id,
  });
  if (!recorded.ok || !["recorded", "already_recorded"].includes(recorded.value.outcome)) {
    return json({ error: "Subscription created but needs reconciliation." }, 500);
  }

  return json({
    intentId: authorized.value.intent.id,
    subscriptionId: created.value.id,
    state: recorded.value.outcome,
  }, 201);
}
