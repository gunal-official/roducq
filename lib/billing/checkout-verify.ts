/**
 * Verify a Razorpay Checkout completion (browser → server). Owner-only.
 *
 * Browser-reported success NEVER grants access. The server (1) checks the
 * payment-signature HMAC, (2) fetches the subscription from Razorpay, (3) checks
 * workspace notes and the server-owned plan, and only then (4) records the
 * state through the same atomic database function the webhook uses.
 */
import { findPlanById, mapRazorpayStatus, verifyPaymentSignature, type RazorpayPlanConfig, type RazorpaySubscription } from "../razorpay.ts";
import { resolveEntitlement } from "./entitlements.ts";
import type { ApplyEventArgs, ApplyEventResult, FetchSubscriptionResult } from "./webhook-processor.ts";

export interface VerifyInput {
  paymentId: string;
  subscriptionId: string;
  signature: string;
  workspaceId: string;
  role: string | null;
}

export interface VerifyDeps {
  keyId: string;
  keySecret: string;
  plans: RazorpayPlanConfig[];
  fetchSubscription: (subscriptionId: string) => Promise<FetchSubscriptionResult>;
  apply: (args: ApplyEventArgs) => Promise<ApplyEventResult>;
  now?: Date;
}

export interface VerifyResult { status: number; body: Record<string, unknown>; log?: string }

export async function verifyRazorpayCheckout(input: VerifyInput, deps: VerifyDeps): Promise<VerifyResult> {
  if (!input.paymentId || !input.subscriptionId || !input.signature) {
    return { status: 400, body: { error: "Missing Razorpay payment fields." } };
  }
  if (input.role !== "owner") return { status: 403, body: { error: "Only workspace owners can manage billing." } };
  if (!verifyPaymentSignature({ paymentId: input.paymentId, subscriptionId: input.subscriptionId, signature: input.signature, keySecret: deps.keySecret })) {
    return { status: 400, body: { error: "Payment signature verification failed." } };
  }

  const fetched = await deps.fetchSubscription(input.subscriptionId);
  if (!fetched.ok) return { status: 502, body: { error: fetched.error } };
  const sub: RazorpaySubscription = fetched.subscription;

  if (sub.notes?.workspace_id !== input.workspaceId) {
    return { status: 403, body: { error: "Subscription does not belong to this workspace." } };
  }
  const plan = findPlanById(deps.plans, sub.plan_id);
  if (!plan) return { status: 400, body: { error: "Subscription plan is not a configured RoduCQ plan." } };
  const status = mapRazorpayStatus(sub.status);
  if (!status) return { status: 502, body: { error: "Unknown subscription status." } };

  const applied = await deps.apply({
    eventKey: null,
    eventType: "verify.checkout",
    eventCreatedAt: null, // database clock: this is a fresh read of Razorpay's state
    subscriptionId: sub.id,
    workspaceId: input.workspaceId,
    status,
    customerId: sub.customer_id,
    paidThrough: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
    paidThroughSource: sub.current_end ? "razorpay_api" : null,
    currency: plan.currency,
    amount: plan.amount,
    onlyIfActive: false,
    bodySha256: null,
    razorpayEventId: null,
  });
  if (!applied.ok) return { status: 500, body: { error: "Could not record subscription." }, log: `[razorpay] checkout verify failed: ${applied.error}` };

  if (applied.outcome === "superseded") {
    return { status: 409, body: { error: "This workspace already has a subscription in progress. Contact support before starting another." } };
  }
  if (applied.outcome === "rejected") return { status: 403, body: { error: "Subscription does not belong to this workspace." } };
  if (applied.outcome === "unknown_workspace" || applied.outcome === "ignored") {
    return { status: 400, body: { error: "Could not match this subscription to a workspace." } };
  }
  if (applied.outcome !== "applied") return { status: 409, body: { error: "A newer billing update already recorded for this workspace." } };

  const entitlement = resolveEntitlement({ provider: "razorpay", status, paid_through: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null }, deps.now ?? new Date());
  return { status: 200, body: { received: true, status, plan: entitlement.plan } };
}
