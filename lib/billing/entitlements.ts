/**
 * Provider-aware workspace entitlement policy — the ONE place that decides
 * whether a workspace is on Pro.
 *
 * Source of truth: a billing_subscriptions row (absent row = Free). Browser
 * claims, checkout.js success and URL params never enter this function.
 *
 * Policy summary (full write-up: docs/razorpay-security-hardening.md):
 *
 *   Razorpay (provider = 'razorpay')
 *     active    → Pro while paid_through is in the future, or within a short
 *                 grace window after it (renewal webhook may lag). Stale beyond
 *                 the grace window → Free, needs reconciliation. No date → Free
 *                 (fail closed; never assume an indefinite period).
 *     canceled  → Pro only until the verified paid_through; then Free.
 *     anything else (created, authenticated, pending, halted, paused,
 *                 completed, expired) → Free. 'pending' = a payment failed and
 *                 Razorpay is still retrying; access is off until it recovers.
 *
 *   Legacy Stripe (provider = 'stripe', pre-Razorpay rows)
 *     paid_through present (operator-reconciled from Stripe)
 *                → Pro while paid_through is in the future (active or canceled).
 *                  After it → Free. Active-but-past → Free + needs reconciliation.
 *     paid_through absent
 *                → NO invented date. Free + needs reconciliation, EXCEPT an
 *                  active row keeps Pro until an operator-set bridge date
 *                  (LEGACY_STRIPE_ACCESS_UNTIL). The bridge is bounded, is set
 *                  deliberately by an operator, and never extends itself.
 *
 *   Checkout / takeover (canStartNewRazorpaySubscription) mirrors the SQL rule in
 *   apply_razorpay_subscription_event so the UI never starts a checkout the
 *   database would refuse to apply.
 */

export const RAZORPAY_ACTIVE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;
export const LEGACY_STRIPE_ACCESS_UNTIL_ENV = "LEGACY_STRIPE_ACCESS_UNTIL";

export interface BillingRowLike {
  provider: string | null;
  status: string;
  paid_through: string | null;
}

export type EntitlementReason =
  | "no_subscription"
  | "razorpay_active"
  | "razorpay_active_grace"
  | "razorpay_canceled_in_paid_period"
  | "razorpay_missing_paid_through"
  | "razorpay_stale_active"
  | "razorpay_canceled"
  | "razorpay_not_entitled"
  | "legacy_stripe_verified_active"
  | "legacy_stripe_canceled_in_paid_period"
  | "legacy_stripe_operator_bridge"
  | "legacy_stripe_unverified"
  | "legacy_stripe_stale_active"
  | "legacy_stripe_expired"
  | "unknown_provider";

export interface Entitlement {
  plan: "pro" | "free";
  reason: EntitlementReason;
  /** True when an operator must reconcile this record (no silent change). */
  needsOperatorReconciliation: boolean;
  /** Verified paid-through instant as ISO string, or null when unknown. */
  paidThrough: string | null;
  provider: string | null;
}

/** Parse LEGACY_STRIPE_ACCESS_UNTIL. Invalid or unset → null (no bridge). */
export function parseLegacyAccessUntil(raw: string | undefined | null): Date | null {
  const value = raw?.trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/.test(value)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseInstant(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveEntitlement(
  row: BillingRowLike | null | undefined,
  now: Date,
  legacyAccessUntil: Date | null = null,
): Entitlement {
  if (!row) return { plan: "free", reason: "no_subscription", needsOperatorReconciliation: false, paidThrough: null, provider: null };

  const pt = parseInstant(row.paid_through);
  const ptIso = pt ? pt.toISOString() : null;
  const free = (reason: EntitlementReason, needs = false): Entitlement => ({ plan: "free", reason, needsOperatorReconciliation: needs, paidThrough: ptIso, provider: row.provider });
  const pro = (reason: EntitlementReason, needs = false): Entitlement => ({ plan: "pro", reason, needsOperatorReconciliation: needs, paidThrough: ptIso, provider: row.provider });

  if (row.provider === "razorpay") {
    if (row.status === "active") {
      if (!pt) return free("razorpay_missing_paid_through", true);
      if (pt.getTime() > now.getTime()) return pro("razorpay_active");
      if (pt.getTime() + RAZORPAY_ACTIVE_GRACE_MS > now.getTime()) return pro("razorpay_active_grace");
      return free("razorpay_stale_active", true);
    }
    if (row.status === "canceled") {
      if (pt && pt.getTime() > now.getTime()) return pro("razorpay_canceled_in_paid_period");
      return free("razorpay_canceled");
    }
    return free("razorpay_not_entitled");
  }

  if (row.provider === "stripe") {
    if (!pt) {
      if (row.status === "active" && legacyAccessUntil && now.getTime() < legacyAccessUntil.getTime()) {
        return pro("legacy_stripe_operator_bridge", true);
      }
      return free("legacy_stripe_unverified", true);
    }
    const inPaidPeriod = pt.getTime() > now.getTime();
    if (row.status === "active") {
      return inPaidPeriod ? pro("legacy_stripe_verified_active") : free("legacy_stripe_stale_active", true);
    }
    if (row.status === "canceled") {
      return inPaidPeriod ? pro("legacy_stripe_canceled_in_paid_period") : free("legacy_stripe_expired");
    }
    return free("legacy_stripe_expired");
  }

  return free("unknown_provider", true);
}

/**
 * May a NEW Razorpay subscription be started (and later take over this
 * workspace's billing row)? Mirrors the takeover rules in
 * apply_razorpay_subscription_event. Returns null when allowed, otherwise the
 * user-facing reason.
 */
export function canStartNewRazorpaySubscription(row: BillingRowLike | null | undefined, now: Date): string | null {
  if (!row) return null;
  if (row.provider === "razorpay") {
    if (["created", "authenticated", "canceled", "completed", "expired"].includes(row.status)) return null;
    return "Your workspace already has a Razorpay subscription that is still in progress (" + row.status + "). Contact support before starting a new one.";
  }
  const pt = parseInstant(row.paid_through);
  if (row.status !== "active" && (!pt || pt.getTime() <= now.getTime())) return null;
  return "Your workspace has a subscription from the previous billing provider on file. Contact support so it can be reconciled before you subscribe through Razorpay.";
}

/** Owner-facing copy for legacy (pre-Razorpay) billing. Null when no notice is needed. */
export function legacyBillingNotice(e: Entitlement): string | null {
  if (e.provider !== "stripe") return null;
  if (e.reason === "legacy_stripe_verified_active" || e.reason === "legacy_stripe_canceled_in_paid_period") {
    return `Your subscription was billed through our previous provider. Pro access is verified through ${e.paidThrough ? new Date(e.paidThrough).toUTCString() : "its paid-through date"}. Support handles any change to it.`;
  }
  if (e.reason === "legacy_stripe_operator_bridge") {
    return "Your Pro access is being honoured while we reconcile your subscription from our previous billing provider. No action is needed from you.";
  }
  if (e.needsOperatorReconciliation) {
    return "Your subscription from our previous billing provider must be reconciled before Pro access can be confirmed. Contact support. Nothing has been cancelled or charged on your behalf.";
  }
  return null;
}
