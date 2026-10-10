/**
 * /pricing content + billing truth (pricing redesign, 2026-10-10).
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE. Every money figure and every
 * capability claim on /pricing has to be backed by something real:
 *
 *   • Prices are NEVER written here. The paid row is the operator's
 *     STRIPE_PRICES config (lib/stripe.ts → getPricesConfig), rendered
 *     through formatPrice. No config, no price row — no invented numbers.
 *   • Feature rows describe product SHAPE only (what exists today, or
 *     what is explicitly marked "planned"). roducq enforces no briefs per
 *     month, no seat limits and no AI caps — grep the tree for a quota
 *     check and you find none — so this file must not imply any.
 *   • Billing is per WORKSPACE, not per seat. That is not a marketing
 *     choice, it is what the code does: billing_subscriptions is keyed by
 *     workspace_id (supabase/migrations/20260926100000_billing.sql) and
 *     Checkout is created with a hardcoded quantity of 1
 *     (lib/stripe.ts → buildCheckoutSessionParams).
 *
 * Annual billing follows the same rule. The operator has created one
 * recurring MONTHLY price per currency, so ANNUAL_PRICES is empty and the
 * "Save 17%" chip does not render — describeAnnualDiscount() returns null
 * for it. Wire real annual Stripe prices into ANNUAL_PRICES (and let
 * PlanCheckoutButton hand those price ids to Checkout) and the annual tab
 * plus its discount chip light up on their own, computed from the amounts.
 *
 * Deliberately free of React and of env reads: this module is imported by
 * both the server page and the client toggle, and stays pure so the tests
 * in tests/components/pricing.test.ts can assert on it directly.
 */

import type { StripePriceConfig } from "@/lib/stripe";

export type BillingInterval = "monthly" | "annual";

/** The two tab labels, in render order. */
export const BILLING_INTERVALS: BillingInterval[] = ["monthly", "annual"];

export const INTERVAL_LABEL: Record<BillingInterval, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

/**
 * The discount the operator intends annual billing to carry. This is an
 * INPUT to the chip, never the chip itself: describeAnnualDiscount()
 * recomputes the percentage from real monthly + annual amounts and the
 * page renders nothing unless that computation succeeds. Change this
 * constant and nothing on the page moves — by design.
 */
export const INTENDED_ANNUAL_DISCOUNT_PERCENT = 17;

/**
 * Annual prices. Empty because the operator has created one recurring
 * MONTHLY price per currency (see .env.local.example → STRIPE_PRICES).
 * Add real annual Stripe prices here AND route them through Checkout
 * before the annual tab claims a saving.
 */
export const ANNUAL_PRICES: StripePriceConfig[] = [];

/** Shown on the annual tab while no annual price exists to charge. */
export const ANNUAL_UNAVAILABLE_NOTE =
  "Annual billing isn't offered yet — subscriptions bill monthly through Stripe, and you can cancel from Settings or the Stripe portal at any time. Tell us if an annual arrangement would help and we'll set one up.";

/** Shown on the paid row when STRIPE_PRICES is absent entirely. */
export const PRICES_UNCONFIGURED_NOTE =
  "Billing isn't configured for this install yet — start free and we'll be in touch about pricing.";

/**
 * Percentage saved by paying `annualAmount` for the year instead of
 * `monthlyAmount` twelve times, rounded. Null whenever a saving cannot be
 * honestly computed: a missing amount, a non-positive amount, or an annual
 * price that costs as much as (or more than) twelve months.
 */
export function describeAnnualDiscountPercent(
  monthlyAmount: number | null,
  annualAmount: number | null
): number | null {
  if (monthlyAmount == null || annualAmount == null) return null;
  if (!Number.isFinite(monthlyAmount) || !Number.isFinite(annualAmount)) {
    return null;
  }
  if (monthlyAmount <= 0 || annualAmount <= 0) return null;
  const yearly = monthlyAmount * 12;
  if (annualAmount >= yearly) return null; // no saving to show
  const pct = Math.round((1 - annualAmount / yearly) * 100);
  return pct > 0 ? pct : null;
}

/** True once at least one real annual price exists to bill against. */
export function annualBillingAvailable(
  annual: StripePriceConfig[] = ANNUAL_PRICES
): boolean {
  return annual.length > 0;
}

/**
 * The "Save N%" chip label. Renders only when EVERY monthly price has a
 * matching annual price and they all agree on one percentage — a mixed or
 * partial config shows no chip rather than a rounded lie.
 */
export function annualDiscountLabel(
  monthly: StripePriceConfig[],
  annual: StripePriceConfig[]
): string | null {
  if (!annualBillingAvailable(annual) || monthly.length === 0) return null;
  const percents = monthly.map((m) => {
    const match = annual.find((a) => a.currency === m.currency);
    return describeAnnualDiscountPercent(m.amount, match?.amount ?? null);
  });
  if (percents.some((p) => p === null)) return null;
  const unique = [...new Set(percents as number[])];
  return unique.length === 1 ? `Save ${unique[0]}%` : null;
}

export interface PlanTier {
  slug: "starter" | "team" | "studio";
  name: string;
  /** Shown above the tier name. */
  eyebrow: string;
  tagline: string;
  /** Pill next to the name, when the tier earns one. */
  badge?: string;
  /**
   * How the price row is sourced:
   *   "free"       — $0, always true (row absent in billing_subscriptions)
   *   "configured" — the live Stripe prices, read from env at render
   *   "contact"    — no price published, honest conversation instead
   */
  pricing: "free" | "configured" | "contact";
  /** The line under the price. Must not claim enforcement that doesn't exist. */
  billingNote: string;
  /** What the app does today. */
  features: string[];
  /** What is on the roadmap. Rendered with a "planned" qualifier. */
  planned?: string[];
  cta: { label: string; href: string; primary?: boolean };
}

export const HERO = {
  eyebrow: "Pricing",
  title: "Plans that scale with how your team works.",
  intro:
    "One product, no feature paywalls. Everything that ships today is on the free plan — team, roles, the full intake-to-invoice pipeline. The paid plan is the same product with a Stripe subscription behind it, so the tiers below describe how you'll use roducq, not what gets switched off.",
} as const;

/**
 * Three ways teams actually land on roducq. Starter and Team are the two
 * states the billing code can represent today (billing_subscriptions row
 * absent = Free, 'active' = Pro); Studio is the honest "let's talk" path
 * for anything those two don't fit — it publishes no price because there
 * is no price to charge.
 */
export const PLAN_TIERS: PlanTier[] = [
  {
    slug: "starter",
    name: "Starter",
    eyebrow: "Solo and small studios",
    tagline: "The whole product, free, for as long as you like.",
    pricing: "free",
    billingNote: "No card, no trial clock, nothing to cancel.",
    features: [
      "Intake → briefs → proposals → plans → client updates",
      "Invoices & contracts, with share links you can revoke",
      "Team invites with owner, member and viewer roles",
      "Activity feed and signed outbound webhooks",
      "Workspace templates, inbox threading, full edit history",
      "Unlimited briefs, members and AI generations",
    ],
    cta: { label: "Start free", href: "/signup", primary: true },
  },
  {
    slug: "team",
    name: "Team",
    eyebrow: "Agencies running client work",
    tagline:
      "The same product, billed per workspace through Stripe. Upgrade from Settings, cancel any time.",
    badge: "Most popular",
    pricing: "configured",
    billingNote: "Per workspace per month — not per seat.",
    features: [
      "Everything in Starter, with no limits added",
      "Billing through Stripe, in the currency you choose",
      "Manage or cancel from the Stripe billing portal",
      "Early builds of whatever ships next",
    ],
    planned: [
      "Custom domains for share links",
      "Custom role tiers beyond owner, member and viewer",
      "Priority support",
    ],
    cta: { label: "Start free, upgrade in Settings", href: "/signup" },
  },
  {
    slug: "studio",
    name: "Studio",
    eyebrow: "Larger teams and procurement",
    tagline:
      "For multi-workspace rollouts, security review, invoicing or an annual arrangement.",
    pricing: "contact",
    billingNote: "No published price — we scope it with you.",
    features: [
      "Everything in Team",
      "Multi-workspace rollout and migration help",
      "Security and procurement paperwork",
      "An annual or invoiced arrangement instead of monthly cards",
    ],
    cta: {
      label: "Talk to us",
      href: "mailto:hello@roducq.dev?subject=roducq%20Studio%20enquiry",
    },
  },
];

/**
 * The footer note. It carries the page's honesty contract out loud: what
 * the prices do and don't include, how cancellation works, and the fact
 * that no tier is a usage cap — because none is enforced in code.
 */
export const FOOTER_NOTE =
  "Prices exclude tax where applicable. The paid plan bills monthly through Stripe and is cancellable any time from Settings or the Stripe billing portal — your workspace returns to the free plan when the subscription ends, and your data stays put. No plan on this page is a usage limit: roducq does not meter briefs, seats or AI generations today.";

/**
 * One rendered interval tab. Built server-side from the real config and
 * handed to the client toggle as plain data, so the browser bundle never
 * touches env.
 */
export interface IntervalView {
  interval: BillingInterval;
  /** Whether this interval has anything real to bill. */
  available: boolean;
  /** Pre-rendered price lines, e.g. "$19 USD / month". */
  lines: string[];
  /** The "Save N%" chip, or null when no real annual price backs one. */
  discountLabel: string | null;
  /** Honest copy for when this interval can't be offered. */
  unavailableNote: string | null;
}

export function buildMonthlyView(
  lines: string[],
  configured: boolean
): IntervalView {
  return {
    interval: "monthly",
    available: configured && lines.length > 0,
    lines,
    discountLabel: null,
    unavailableNote: configured ? null : PRICES_UNCONFIGURED_NOTE,
  };
}

export function buildAnnualView(
  lines: string[],
  monthly: StripePriceConfig[],
  annual: StripePriceConfig[]
): IntervalView {
  const available = annualBillingAvailable(annual);
  return {
    interval: "annual",
    available,
    lines: available ? lines : [],
    discountLabel: available ? annualDiscountLabel(monthly, annual) : null,
    unavailableNote: available ? null : ANNUAL_UNAVAILABLE_NOTE,
  };
}
