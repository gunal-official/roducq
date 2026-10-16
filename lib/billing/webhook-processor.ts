/**
 * Razorpay webhook processing — pure orchestration, dependency-injected so the
 * security rules are unit-testable without a database or the live Razorpay API.
 *
 * Order of operations (each step can reject before any state changes):
 *   1. server secret configured           → 500 if not
 *   2. HMAC over the RAW body (constant-time) → 400 if invalid
 *   3. payload parses to a known event    → 400 invalid / 200 ignored
 *   4. trusted Razorpay created_at present → 400 (no local-clock fallback)
 *   5. event key = X-Razorpay-Event-Id, else sha256(raw body)
 *   6. ONE atomic database call (apply_razorpay_subscription_event) that does
 *      idempotency claim + ordering + workspace binding + state change + ledger
 *      record in a single transaction.
 *   7. any database error → 500 so Razorpay retries (the transaction already
 *      rolled back, so the retry starts clean).
 *
 * No secret, signature, or raw payload is ever logged or returned.
 */
import { createHash } from "node:crypto";
import {
  parseRazorpayWebhookEvent,
  statusForWebhookEvent,
  verifyWebhookSignature,
  type BillingStatus,
  type RazorpayPlanConfig,
  type RazorpaySubscription,
} from "../razorpay.ts";

export interface ApplyEventArgs {
  eventKey: string | null;
  eventType: string;
  eventCreatedAt: string | null;
  subscriptionId: string | null;
  workspaceId: string | null;
  status: BillingStatus | null;
  customerId: string | null;
  paidThrough: string | null;
  paidThroughSource: "razorpay_webhook" | "razorpay_api" | null;
  currency: string | null;
  amount: number | null;
  onlyIfActive: boolean;
  bodySha256: string | null;
  razorpayEventId: string | null;
}

export type ApplyEventResult =
  | { ok: true; outcome: string; workspaceId: string | null }
  | { ok: false; error: string };

export type FetchSubscriptionResult =
  | { ok: true; subscription: RazorpaySubscription }
  | { ok: false; error: string };

export interface WebhookDeps {
  webhookSecret: string | undefined;
  plans: RazorpayPlanConfig[];
  apply: (args: ApplyEventArgs) => Promise<ApplyEventResult>;
  fetchSubscription: (subscriptionId: string) => Promise<FetchSubscriptionResult>;
}

export interface WebhookInput {
  raw: string;
  signature: string | null;
  /** X-Razorpay-Event-Id header, if present. */
  eventIdHeader: string | null;
}

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
  /** Server-side log line (no secrets, no payload). */
  log?: string;
}

const EVENT_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

export function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Stable event identity: Razorpay's event id when present, else the body hash. */
export function deriveEventKey(eventIdHeader: string | null, bodySha256: string): string {
  return eventIdHeader && EVENT_ID_PATTERN.test(eventIdHeader) ? eventIdHeader : bodySha256;
}

function isoFromUnixSeconds(seconds: number | null): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

export async function processRazorpayWebhook(input: WebhookInput, deps: WebhookDeps): Promise<WebhookResult> {
  if (!deps.webhookSecret) {
    return { status: 500, body: { error: "Billing webhooks are not configured (RAZORPAY_WEBHOOK_SECRET missing)." } };
  }
  if (!verifyWebhookSignature({ webhookSecret: deps.webhookSecret, signature: input.signature ?? "", raw: input.raw })) {
    return { status: 400, body: { error: "Invalid signature." } };
  }

  const event = parseRazorpayWebhookEvent(input.raw);
  if (event.kind === "invalid") return { status: 400, body: { error: "Unhandled payload shape." } };
  if (event.kind === "ignored") return { status: 200, body: { received: true, ignored: event.type } };

  if (event.createdAt === null) {
    return { status: 400, body: { error: "Missing Razorpay event timestamp." } };
  }

  const bodySha256 = sha256Hex(input.raw);
  const common = {
    eventKey: deriveEventKey(input.eventIdHeader, bodySha256),
    eventType: event.eventType,
    eventCreatedAt: new Date(event.createdAt * 1000).toISOString(),
    bodySha256,
    razorpayEventId: input.eventIdHeader && EVENT_ID_PATTERN.test(input.eventIdHeader) ? input.eventIdHeader : null,
  };

  if (event.kind === "payment_failed") {
    // A failed payment can only ever move an ACTIVE subscription to pending,
    // and only if it is newer than the state on file (enforced in the DB).
    const result = await deps.apply({
      ...common,
      subscriptionId: event.subscriptionId,
      workspaceId: null,
      status: "pending",
      customerId: null,
      paidThrough: null,
      paidThroughSource: null,
      currency: null,
      amount: null,
      onlyIfActive: true,
    });
    return respond(result, event.eventType);
  }

  const status = statusForWebhookEvent(event.eventType, event.razorpayStatus);
  if (!status) return { status: 200, body: { received: true, ignored: event.eventType } };

  // Server-owned plan: currency/amount come from RAZORPAY_PLANS, never the payload.
  const plan = event.planId ? deps.plans.find((p) => p.planId === event.planId) ?? null : null;

  // Paid-through: prefer the webhook's current_end; if absent for a state that
  // grants or preserves access, verify with Razorpay's API before deciding.
  let currentEnd = event.currentEnd;
  let paidThroughSource: "razorpay_webhook" | "razorpay_api" | null = currentEnd ? "razorpay_webhook" : null;
  if (currentEnd === null && (status === "active" || status === "canceled")) {
    const fetched = await deps.fetchSubscription(event.subscriptionId);
    if (!fetched.ok) {
      return {
        status: 500,
        body: { error: "Webhook handling failed." },
        log: "[razorpay] could not verify subscription paid-through date; Razorpay will retry",
      };
    }
    currentEnd = fetched.subscription.current_end;
    paidThroughSource = currentEnd ? "razorpay_api" : null;
  }

  const result = await deps.apply({
    ...common,
    subscriptionId: event.subscriptionId,
    workspaceId: event.workspaceId,
    status,
    customerId: event.customerId,
    paidThrough: isoFromUnixSeconds(currentEnd),
    paidThroughSource,
    currency: plan?.currency ?? null,
    amount: plan?.amount ?? null,
    onlyIfActive: false,
  });
  return respond(result, event.eventType);
}

function respond(result: ApplyEventResult, eventType: string): WebhookResult {
  if (!result.ok) {
    return {
      status: 500,
      body: { error: "Webhook handling failed." },
      // DB error text only — no payload, no signature, no secrets.
      log: `[razorpay] webhook handling failed (${eventType}): ${result.error}`,
    };
  }
  return { status: 200, body: { received: true, outcome: result.outcome } };
}
