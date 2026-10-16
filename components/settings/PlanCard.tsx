/**
 * Plan & billing (Step 34(b), billing live in the events/webhooks
 * foundation phase; global multi-currency 2026-09-26) — the
 * subscription surface reflects REAL state from billing_subscriptions
 * (row absent = Free, 'active' = Pro; the Razorpay webhooks own those
 * transitions). Upgrade = Razorpay Checkout (Checkout.js) in
 * the currency the owner picks; when billing env is absent the early
 * access mailto remains as the honest fallback. Prices shown are the
 * operator's RAZORPAY_PLANS config (display data) — the charged amount
 * is always Razorpay's.
 */

import Link from "next/link";
import { ArrowRight, Check, CreditCard, FlaskConical, Sparkles } from "lucide-react";

import { ManageBillingButton } from "@/components/settings/ManageBillingButton";
import { formatPrice, type RazorpayPlanConfig } from "@/lib/razorpay";
import { PlanCheckoutButton } from "@/components/settings/PlanCheckoutButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page";

/** Condensed from the Free tier on /pricing (same voice, no new claims). */
const INCLUDED = [
  "Team invites — owner, member, viewer",
  "Intake → briefs → proposals → plans → updates",
  "Invoices & contracts + signed outbound webhooks",
  "Share links, templates, inbox threading, edit history",
];

const PRO_PLANNED = [
  "Custom domains for share links — planned",
  "Custom role tiers — planned",
  "Priority support — planned",
];

const PRO_MAILTO =
  "mailto:hello@roducq.dev?subject=roducq%20Pro%20early%20access";

/** Test-mode indicator copy (fixed wording — see docs/RAZORPAY_TEST_MODE_SETUP.md). */
export const TEST_MODE_TITLE = "Razorpay Test Mode";
export const TEST_MODE_TEXT =
  "Payments are currently being tested. No live Razorpay charges will be processed.";

export function PlanCard({
  memberCount,
  templateCount,
  plan,
  billingConfigured,
  razorpayTestMode,
  prices,
  billing,
  legacyNotice,
  sectionId,
}: {
  memberCount: number;
  /** Anchor id for the settings page's section nav. */
  sectionId?: string;
  templateCount: number;
  plan: "free" | "pro";
  billingConfigured: boolean;
  /** True only when billing is configured AND running in Razorpay Test Mode
   * (lib/razorpay.ts → isRazorpayTestModeActive). Drives the indicator below;
   * never true in Live Mode, which the config gate refuses outright. */
  razorpayTestMode?: boolean;
  prices: RazorpayPlanConfig[];
  billing: {
    status: string;
    currency: string | null;
    amount: number | null;
  } | null;
  /** Owner-facing note for legacy (pre-Razorpay) billing; null when none. */
  legacyNotice?: string | null;
}) {
  const isPro = plan === "pro";
  return (
    <SectionCard
      icon={CreditCard}
      title="Plan"
      description="Subscription and billing for Roducq itself — real plan state, checkout via Razorpay in the currency you choose."
      id={sectionId}
      bodyClassName="space-y-5 p-5"
      className="animate-rise-in"
      proof="plan"
    >
      {/* Test Mode indicator — only rendered when Test Mode is actually active. */}
      {razorpayTestMode ? (
        <div
          className="flex gap-2.5 rounded-lg border border-accent bg-accent-soft p-3"
          data-testid="razorpay-test-mode"
        >
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-accent">{TEST_MODE_TITLE}</p>
            <p className="text-sm text-muted-foreground">{TEST_MODE_TEXT}</p>
          </div>
        </div>
      ) : null}
      {/* Current plan + usage */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-display text-2xl font-bold tracking-tight">
          {isPro ? "Pro" : "Free"}
        </p>
        {isPro ? (
          <Badge className="border-accent bg-accent-soft text-accent">
            Active
          </Badge>
        ) : (
          <Badge className="border-accent bg-accent-soft text-accent">
            Early access
          </Badge>
        )}
        {billing && !isPro && billing.status !== "canceled" ? (
          <Badge variant="secondary">{billing.status === "halted" || billing.status === "pending" ? "Payment needs attention" : billing.status}</Badge>
        ) : null}
        <p className="w-full text-sm text-muted-foreground sm:w-auto">
          {isPro && billing?.currency && billing.amount != null
            ? `${formatPrice(billing.amount, billing.currency)} ${billing.currency} · `
            : ""}
          {memberCount} member{memberCount === 1 ? "" : "s"} ·{" "}
          {templateCount} template{templateCount === 1 ? "" : "s"} · 1
          workspace
        </p>
      </div>
      <ul className="space-y-2">
        {INCLUDED.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Pro (roadmap) + the honest upgrade path */}
      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="icon-chip icon-chip-accent h-8 w-8">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="font-display text-base font-bold">Pro</p>
          <Badge variant="secondary">Roadmap</Badge>
        </div>
        <ul className="space-y-2">
          {PRO_PLANNED.map((feature) => (
            <li key={feature} className="flex gap-2.5 text-sm text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {legacyNotice ? (
            <p className="w-full text-sm text-muted-foreground">{legacyNotice}</p>
          ) : null}
          {isPro ? (
            billingConfigured && !legacyNotice ? (
              <ManageBillingButton />
            ) : (
              <p className="text-sm text-muted-foreground">
                Your workspace is on Pro — billing is managed through Razorpay; see your Razorpay payment confirmation.
              </p>
            )
          ) : billingConfigured && !legacyNotice ? (
            <PlanCheckoutButton prices={prices} />
          ) : (
            <Button asChild variant="outline">
              <a href={PRO_MAILTO} className="inline-flex min-h-11 min-w-11 items-center">
                Request access
              </a>
            </Button>
          )}
          <Link
            href="/pricing"
            className="inline-flex min-h-11 min-w-11 items-center gap-1.5 text-sm text-accent underline-offset-2 hover:underline"
          >
            Compare plans
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {billing && (billing.status === "halted" || billing.status === "pending") ? (
          <p className="text-xs text-destructive">Your last Razorpay payment did not complete — Pro stays off until a payment succeeds. Update your payment method in Razorpay Checkout by upgrading again, or contact support.</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {isPro
            ? "Cancel anytime from here — Razorpay stops future charges at the end of the current cycle, and the plan flips back to Free when the subscription ends."
            : billingConfigured
              ? "Pick a currency, then upgrade opens Razorpay Checkout. The plan updates here once Razorpay confirms payment."
              : "Changing plans is by request until billing is configured — early users keep Free exactly as it is today. Nothing to cancel, ever."}
        </p>
      </div>
    </SectionCard>
  );
}
