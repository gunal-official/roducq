/**
 * Razorpay billing — RoduCQ's ONLY payment provider for new/active billing.
 *
 * No SDK dependency: server calls use fetch + HTTP Basic auth
 * (key_id:key_secret) against https://api.razorpay.com/v1, mirroring the
 * codebase's zero-dependency style. Secrets are server-only and never logged.
 *
 * Trust rules:
 *  - Plan IDs / amounts come ONLY from server env (RAZORPAY_PLANS); the
 *    browser may name a currency, never a plan id or amount.
 *  - Paid access is granted ONLY after (a) HMAC payment-signature
 *    verification AND (b) a server-side fetch of the Razorpay subscription
 *    confirming plan + workspace + an entitlement-granting status, or a
 *    verified Razorpay webhook. Checkout.js success alone grants nothing.
 *  - TEST MODE ONLY: getRazorpayServerConfig refuses Live Mode outright
 *    (ALLOWED_RAZORPAY_MODES). Production payments cannot be turned on by
 *    environment configuration — see the PRODUCTION SAFETY GATE below and
 *    docs/RAZORPAY_TEST_MODE_SETUP.md.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";
/** Billing cycles created for an open-ended monthly subscription. */
export const SUBSCRIPTION_TOTAL_COUNT = 120;

export interface RazorpayPlanConfig {
  currency: string; // uppercase ISO-4217
  planId: string; // Razorpay Plan id, e.g. plan_...
  amount: number; // display amount in MAJOR units; must match the Razorpay Plan
}
export type PlansParse = { ok: true; plans: RazorpayPlanConfig[]; prices: RazorpayPlanConfig[] } | { ok: false; error: string };

export function parsePlansEnv(raw: string | undefined): PlansParse {
  if (!raw?.trim()) return { ok: false, error: "RAZORPAY_PLANS is not set." };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch {
    return { ok: false, error: 'RAZORPAY_PLANS is not valid JSON — expected [{"currency":"INR","planId":"plan_...","amount":1499}].' };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return { ok: false, error: "RAZORPAY_PLANS must be a non-empty array." };
  const plans: RazorpayPlanConfig[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const e = parsed[i] as Record<string, unknown>;
    if (typeof e !== "object" || e === null || Array.isArray(e)) return { ok: false, error: `RAZORPAY_PLANS[${i}] is not an object.` };
    if (typeof e.currency !== "string" || !/^[A-Z]{3}$/.test(e.currency)) return { ok: false, error: `RAZORPAY_PLANS[${i}].currency must be an uppercase 3-letter ISO-4217 code.` };
    if (typeof e.planId !== "string" || !e.planId.startsWith("plan_")) return { ok: false, error: `RAZORPAY_PLANS[${i}].planId must be a Razorpay Plan id (plan_...).` };
    if (typeof e.amount !== "number" || !Number.isFinite(e.amount) || e.amount <= 0) return { ok: false, error: `RAZORPAY_PLANS[${i}].amount must be a positive number (major units).` };
    if (plans.some((p) => p.currency === e.currency)) return { ok: false, error: `RAZORPAY_PLANS lists ${e.currency} twice.` };
    plans.push({ currency: e.currency, planId: e.planId.trim(), amount: e.amount });
  }
  return { ok: true, plans, prices: plans };
}
export function getRazorpayPlansConfig(): PlansParse { return parsePlansEnv(process.env.RAZORPAY_PLANS); }
// Back-compat names used by pricing/settings surfaces.
export const getPricesConfig = getRazorpayPlansConfig;
export function findPlan(plans: RazorpayPlanConfig[], currency: string) { return plans.find((p) => p.currency === currency.toUpperCase()) ?? null; }
export const findPrice = findPlan;
export function findPlanById(plans: RazorpayPlanConfig[], planId: string) { return plans.find((p) => p.planId === planId) ?? null; }
export const findPriceById = findPlanById;

export function formatPrice(amount: number, currency: string): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en", { style: "currency", currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(amount);
}

/** Key-id mode: test/live must be explicit; secret carries no mode marker. */
export function razorpayKeyMode(keyId: string | undefined): "test" | "live" | null {
  if (!keyId) return null;
  if (keyId.startsWith("rzp_test_")) return "test";
  if (keyId.startsWith("rzp_live_")) return "live";
  return null;
}

// ── Test-mode gate — PRODUCTION PAYMENTS ARE DISABLED ─────────────────
/**
 * PRODUCTION SAFETY GATE.
 *
 * ALLOWED_RAZORPAY_MODES is the ONLY list of payment modes this build will
 * ever authorise, and 'live' is deliberately absent. There is no env var,
 * flag or code path that adds to it: enabling Live Mode is a CODE CHANGE in
 * a separate, reviewed milestone — never a deployment setting. This is why a
 * Vercel production deploy cannot silently turn on real charges, even if
 * someone sets rzp_live_ credentials there.
 *
 * Every credential read (subscription creation, checkout verify, webhook
 * fetch, cancellation) goes through getRazorpayServerConfig, so this single
 * list gates the whole billing surface. Fail-closed: unset RAZORPAY_MODE
 * means test, and any disagreement between the declared mode and the key
 * prefix is refused rather than guessed.
 */
export type RazorpayMode = "test" | "live";
export const RAZORPAY_MODE_ENV = "RAZORPAY_MODE";
export const RAZORPAY_PUBLIC_KEY_ENV = "NEXT_PUBLIC_RAZORPAY_KEY_ID";
export const ALLOWED_RAZORPAY_MODES: readonly RazorpayMode[] = ["test"];
/** Unset RAZORPAY_MODE means Test Mode — never Live. */
export const DEFAULT_RAZORPAY_MODE: RazorpayMode = "test";
export const LIVE_PAYMENTS_DISABLED_MESSAGE =
  "Razorpay Live Mode is disabled in this build — production payments are not enabled. Set RAZORPAY_MODE=test and use rzp_test_ credentials.";

export function isRazorpayModeAllowed(mode: RazorpayMode): boolean {
  return ALLOWED_RAZORPAY_MODES.includes(mode);
}

/** RAZORPAY_MODE parsing. Unset/blank → test. Only 'test'/'live' are words;
 * anything else is a configuration error, not a silent fallback. */
export function parseRazorpayModeEnv(raw: string | undefined): { ok: true; mode: RazorpayMode } | { ok: false; error: string } {
  const value = raw?.trim();
  if (!value) return { ok: true, mode: DEFAULT_RAZORPAY_MODE };
  const mode = value.toLowerCase();
  if (mode === "test" || mode === "live") return { ok: true, mode };
  return { ok: false, error: `RAZORPAY_MODE must be "test" (got "${value}"). Live payments are disabled in this build.` };
}

export function getRazorpayMode(): { ok: true; mode: RazorpayMode } | { ok: false; error: string } {
  return parseRazorpayModeEnv(process.env[RAZORPAY_MODE_ENV]);
}

export function getRazorpayServerConfig(): { ok: true; keyId: string; keySecret: string; mode: RazorpayMode } | { ok: false; error: string } {
  const keyId = process.env.RAZORPAY_KEY_ID; const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return { ok: false, error: "Billing is not configured yet — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." };
  const declared = getRazorpayMode();
  if (!declared.ok) return { ok: false, error: declared.error };
  const mode = razorpayKeyMode(keyId);
  if (!mode) return { ok: false, error: "RAZORPAY_KEY_ID must start with rzp_test_ or rzp_live_." };
  // Declared mode and key prefix must AGREE — a mismatch means two different
  // Razorpay accounts/environments are half-configured, and guessing which one
  // to bill against is never acceptable.
  if (mode !== declared.mode) {
    return { ok: false, error: `RAZORPAY_MODE=${declared.mode} but RAZORPAY_KEY_ID is a ${mode}-mode key. Set both to the same mode (${declared.mode}) and use matching ${declared.mode}-mode credentials.` };
  }
  if (!isRazorpayModeAllowed(mode)) return { ok: false, error: LIVE_PAYMENTS_DISABLED_MESSAGE };
  return { ok: true, keyId, keySecret, mode };
}

/**
 * The key the browser is allowed to see (Checkout.js). The server key id is
 * the source of truth; NEXT_PUBLIC_RAZORPAY_KEY_ID exists only so operators
 * can see which key the client uses. A disagreement is refused BEFORE any
 * Razorpay subscription is created, so a half-migrated deployment can never
 * open checkout against the wrong account (and leave an orphaned, possibly
 * paid, subscription behind).
 */
export function getRazorpayClientConfig(): { ok: true; keyId: string; mode: RazorpayMode } | { ok: false; error: string } {
  const server = getRazorpayServerConfig();
  if (!server.ok) return server;
  const publicKeyId = process.env[RAZORPAY_PUBLIC_KEY_ENV]?.trim();
  if (publicKeyId && publicKeyId !== server.keyId) {
    return { ok: false, error: `${RAZORPAY_PUBLIC_KEY_ENV} does not match RAZORPAY_KEY_ID — checkout would open against a different Razorpay account. Make them identical, or leave ${RAZORPAY_PUBLIC_KEY_ENV} unset.` };
  }
  return { ok: true, keyId: server.keyId, mode: server.mode };
}

/**
 * True only when billing is fully configured AND provably in Test Mode.
 * Drives the "Razorpay Test Mode" indicator, so the badge never appears
 * unless the whole test path (keys, plans, public key) is coherent — and can
 * never appear for Live Mode, which getRazorpayServerConfig refuses outright.
 */
export function isRazorpayTestModeActive(): boolean {
  const server = getRazorpayServerConfig();
  if (!server.ok || server.mode !== "test") return false;
  if (!getRazorpayPlansConfig().ok) return false;
  return getRazorpayClientConfig().ok;
}

// ── Signatures (constant-time) ────────────────────────────────────────
function hmacHex(secret: string, payload: string) { return createHmac("sha256", secret).update(payload).digest("hex"); }
function safeEqualHex(expectedHex: string, got: string): boolean {
  const a = Buffer.from(expectedHex, "utf8"); const b = Buffer.from(got?.trim() ?? "", "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
/** Subscription checkout: HMAC_SHA256(`${payment_id}|${subscription_id}`, key_secret). */
export function verifyPaymentSignature(input: { paymentId: string; subscriptionId: string; signature: string; keySecret: string }): boolean {
  if (!input.paymentId || !input.subscriptionId || !input.signature) return false;
  return safeEqualHex(hmacHex(input.keySecret, `${input.paymentId}|${input.subscriptionId}`), input.signature);
}
/** Webhook: HMAC_SHA256(raw_body, webhook_secret), header X-Razorpay-Signature. */
export function verifyWebhookSignature(input: { webhookSecret: string; signature: string; raw: string }): boolean {
  if (!input.signature) return false;
  return safeEqualHex(hmacHex(input.webhookSecret, input.raw), input.signature);
}

// ── Status mapping / entitlements ─────────────────────────────────────
export type BillingStatus = "created" | "authenticated" | "active" | "pending" | "halted" | "paused" | "canceled" | "completed" | "expired";
const STATUS_MAP: Record<string, BillingStatus> = { created: "created", authenticated: "authenticated", active: "active", pending: "pending", halted: "halted", paused: "paused", cancelled: "canceled", canceled: "canceled", completed: "completed", expired: "expired" };
export function mapRazorpayStatus(raw: string | null | undefined): BillingStatus | null {
  if (!raw) return null; return STATUS_MAP[raw.toLowerCase()] ?? null;
}
/** Status-only helper. Workspace entitlement is decided by lib/billing/entitlements.ts (resolveEntitlement), which also needs paid_through. */
export function grantsPro(status: BillingStatus | string | null | undefined): boolean { return status === "active"; }

// ── Webhook parsing (actual Razorpay event names) ─────────────────────
export const RAZORPAY_WEBHOOK_EVENTS = new Set(["subscription.authenticated","subscription.activated","subscription.charged","subscription.pending","subscription.halted","subscription.paused","subscription.resumed","subscription.cancelled","subscription.completed","subscription.updated","payment.failed"]);
export type RazorpayWebhookEvent =
  | { kind: "subscription"; eventType: string; subscriptionId: string; customerId: string | null; planId: string | null; razorpayStatus: string | null; workspaceId: string | null; createdAt: number | null; currentEnd: number | null }
  | { kind: "payment_failed"; eventType: string; subscriptionId: string | null; createdAt: number | null }
  | { kind: "ignored"; type: string }
  | { kind: "invalid" };
function str(v: unknown): string | null { return typeof v === "string" && v ? v : null; }
/** Razorpay timestamps are unix seconds; anything else is treated as absent. */
function unixSeconds(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null; }
export function parseRazorpayWebhookEvent(raw: string): RazorpayWebhookEvent {
  let body: any; try { body = JSON.parse(raw); } catch { return { kind: "invalid" }; }
  if (!body || typeof body.event !== "string") return { kind: "invalid" };
  if (!RAZORPAY_WEBHOOK_EVENTS.has(body.event)) return { kind: "ignored", type: body.event };
  const createdAt = typeof body.created_at === "number" ? body.created_at : null;
  if (body.event === "payment.failed") {
    return { kind: "payment_failed", eventType: body.event, subscriptionId: str(body.payload?.payment?.entity?.subscription_id), createdAt };
  }
  const sub = body.payload?.subscription?.entity;
  if (!sub || !str(sub.id)) return { kind: "invalid" };
  const notes = (sub.notes ?? {}) as Record<string, unknown>;
  return { kind: "subscription", eventType: body.event, subscriptionId: sub.id, customerId: str(sub.customer_id), planId: str(sub.plan_id), razorpayStatus: str(sub.status), workspaceId: str(notes.workspace_id), createdAt, currentEnd: unixSeconds(sub.current_end) };
}
/** Event-type → status when payload status is absent (defensive). */
export function statusForWebhookEvent(eventType: string, payloadStatus: string | null): BillingStatus | null {
  const fromPayload = mapRazorpayStatus(payloadStatus); if (fromPayload) return fromPayload;
  const byEvent: Record<string, BillingStatus> = { "subscription.activated": "active", "subscription.charged": "active", "subscription.authenticated": "authenticated", "subscription.pending": "pending", "subscription.halted": "halted", "subscription.paused": "paused", "subscription.resumed": "active", "subscription.cancelled": "canceled", "subscription.completed": "completed" };
  return byEvent[eventType] ?? null;
}

// ── Razorpay API (server-only) ────────────────────────────────────────
function authHeader(keyId: string, keySecret: string) { return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`; }
export function buildCreateSubscriptionBody(input: { planId: string; workspaceId: string }) {
  return { plan_id: input.planId, total_count: SUBSCRIPTION_TOTAL_COUNT, quantity: 1, customer_notify: true, notes: { workspace_id: input.workspaceId } };
}
export interface RazorpaySubscription { id: string; status: string; plan_id: string; customer_id: string | null; notes: Record<string, string>; /** Razorpay's end of the current paid cycle (unix seconds), or null. */ current_end: number | null; }
function toSubscription(d: any): RazorpaySubscription | null {
  if (!d || typeof d.id !== "string") return null;
  return { id: d.id, status: typeof d.status === "string" ? d.status : "", plan_id: typeof d.plan_id === "string" ? d.plan_id : "", customer_id: str(d.customer_id), notes: (d.notes ?? {}) as Record<string, string>, current_end: unixSeconds(d.current_end) };
}
export async function createRazorpaySubscription(input: { keyId: string; keySecret: string; planId: string; workspaceId: string; fetchFn?: typeof fetch }): Promise<{ ok: true; subscription: RazorpaySubscription } | { ok: false; error: string }> {
  try {
    const res = await (input.fetchFn ?? fetch)(`${RAZORPAY_API_BASE}/subscriptions`, { method: "POST", headers: { Authorization: authHeader(input.keyId, input.keySecret), "Content-Type": "application/json" }, body: JSON.stringify(buildCreateSubscriptionBody(input)), signal: AbortSignal.timeout(15_000) });
    const data: any = await res.json().catch(() => ({}));
    const sub = toSubscription(data);
    if (!res.ok || !sub) return { ok: false, error: data?.error?.description ?? `Razorpay error (HTTP ${res.status}).` };
    return { ok: true, subscription: sub };
  } catch { return { ok: false, error: "Could not reach Razorpay — check your connection and try again." }; }
}
export async function fetchRazorpaySubscription(input: { keyId: string; keySecret: string; subscriptionId: string; fetchFn?: typeof fetch }): Promise<{ ok: true; subscription: RazorpaySubscription } | { ok: false; error: string }> {
  try {
    const res = await (input.fetchFn ?? fetch)(`${RAZORPAY_API_BASE}/subscriptions/${encodeURIComponent(input.subscriptionId)}`, { headers: { Authorization: authHeader(input.keyId, input.keySecret) }, signal: AbortSignal.timeout(15_000) });
    const data: any = await res.json().catch(() => ({}));
    const sub = toSubscription(data);
    if (!res.ok || !sub) return { ok: false, error: data?.error?.description ?? `Razorpay error (HTTP ${res.status}).` };
    return { ok: true, subscription: sub };
  } catch { return { ok: false, error: "Could not reach Razorpay — check your connection and try again." }; }
}
export async function cancelRazorpaySubscription(input: { keyId: string; keySecret: string; subscriptionId: string; cancelAtCycleEnd?: boolean; fetchFn?: typeof fetch }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await (input.fetchFn ?? fetch)(`${RAZORPAY_API_BASE}/subscriptions/${encodeURIComponent(input.subscriptionId)}/cancel`, { method: "POST", headers: { Authorization: authHeader(input.keyId, input.keySecret), "Content-Type": "application/json" }, body: JSON.stringify({ cancel_at_cycle_end: input.cancelAtCycleEnd ? 1 : 0 }), signal: AbortSignal.timeout(15_000) });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error?.description ?? `Razorpay error (HTTP ${res.status}).` };
    return { ok: true };
  } catch { return { ok: false, error: "Could not reach Razorpay — check your connection and try again." }; }
}

// ── Pricing launch-offer banner (operator copy; Razorpay Offer must exist in Dashboard) ──
export const DEFAULT_OFFER_BADGE = "LAUNCH OFFER";
export const DEFAULT_OFFER_TEXT = "Save 20% for your first 3 months — use the code at Razorpay checkout.";
export const DEFAULT_OFFER_CODE = "LAUNCH20";
export interface PricingOffer { badge: string; text: string; code: string; }
export function getPricingOffer(billingConfigured: boolean): PricingOffer | null {
  if (!billingConfigured) return null;
  const rawText = (process.env.PRICING_OFFER_TEXT ?? DEFAULT_OFFER_TEXT).trim();
  if (!rawText) return null;
  const badge = (process.env.PRICING_OFFER_BADGE ?? DEFAULT_OFFER_BADGE).trim() || DEFAULT_OFFER_BADGE;
  const code = (process.env.PRICING_OFFER_CODE ?? DEFAULT_OFFER_CODE).trim() || DEFAULT_OFFER_CODE;
  return { badge, text: rawText, code };
}
