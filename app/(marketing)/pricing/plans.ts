/**
 * Shared marketing pricing specification (`app/(marketing)/pricing/plans.ts`).
 *
 * Implements the Roducq pricing specification from `roducq_pricing.pdf` on the
 * Forma pricing page template (`https://forma-visuvate.framer.website/pricing`),
 * while preserving full alignment with `lib/razorpay.ts`:
 *   • Razorpay billing (`lib/razorpay.ts`), checkout routes, subscription DB,
 *     and test-mode safety gates are untouched.
 *   • `ANNUAL_PRICES` remains empty until annual Razorpay plans are provisioned
 *     in `lib/razorpay.ts`; selecting the `Annual` tab never initiates an
 *     annual checkout or fabricates an annual dollar price.
 */

import type { RazorpayPlanConfig } from "@/lib/razorpay";

function formatPlanCurrency(amount: number, currency: string): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

export type BillingInterval = "monthly" | "annual";

/** The two billing period tabs, in render order. */
export const BILLING_INTERVALS: BillingInterval[] = ["monthly", "annual"];

export const INTERVAL_LABEL: Record<BillingInterval, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

/** Badge shown next to the Annual billing toggle per the PDF specification. */
export const ANNUAL_BADGE_LABEL = "Save 17%";

/**
 * The discount the operator intends annual billing to carry when annual
 * Razorpay plans are provisioned.
 */
export const INTENDED_ANNUAL_DISCOUNT_PERCENT = 17;

/**
 * Annual Razorpay plans. Empty because `lib/razorpay.ts` currently provisions
 * recurring monthly plans only (`SUBSCRIPTION_TOTAL_COUNT = 120`).
 * Do NOT populate with placeholder plan IDs or unverified annual amounts.
 */
export const ANNUAL_PRICES: RazorpayPlanConfig[] = [];

/** Headline and detail displayed when the user switches to the Annual tab. */
export const ANNUAL_UNAVAILABLE_HEADLINE =
  "Annual billing is pending commercial and Razorpay configuration approval.";

export const ANNUAL_UNAVAILABLE_NOTE =
  "Annual billing isn't offered in self-serve checkout yet — subscriptions bill monthly through Razorpay, and you can cancel from Settings at any time. Tell us if an annual arrangement would help and we'll set one up.";

/** Shown on the paid tier when RAZORPAY_PLANS is not configured in env. */
export const PRICES_UNCONFIGURED_NOTE =
  "Live Razorpay checkout isn't configured for this environment yet — start free and upgrade from Settings once billing is enabled.";

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
  if (annualAmount >= yearly) return null;
  const pct = Math.round((1 - annualAmount / yearly) * 100);
  return pct > 0 ? pct : null;
}

export function annualBillingAvailable(
  annual: RazorpayPlanConfig[] = ANNUAL_PRICES
): boolean {
  return annual.length > 0;
}

export function annualDiscountLabel(
  monthly: RazorpayPlanConfig[],
  annual: RazorpayPlanConfig[]
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

export interface IntervalView {
  interval: BillingInterval;
  available: boolean;
  lines: string[];
  discountLabel: string | null;
  unavailableNote: string | null;
}

export function buildMonthlyView(
  lines: string[],
  configured: boolean
): IntervalView {
  return {
    interval: "monthly",
    available: configured && lines.length > 0,
    lines: configured ? lines : [],
    discountLabel: null,
    unavailableNote: configured ? null : PRICES_UNCONFIGURED_NOTE,
  };
}

export function buildAnnualView(
  lines: string[],
  monthly: RazorpayPlanConfig[],
  annual: RazorpayPlanConfig[] = ANNUAL_PRICES
): IntervalView {
  const available = annualBillingAvailable(annual) && lines.length > 0;
  return {
    interval: "annual",
    available,
    lines: available ? lines : [],
    discountLabel: annualDiscountLabel(monthly, annual),
    unavailableNote: available ? null : ANNUAL_UNAVAILABLE_NOTE,
  };
}

export interface PlanTier {
  slug: "starter" | "team" | "studio";
  name: string;
  eyebrow: string;
  tagline: string;
  featured: boolean;
  badge?: string;
  pricing: "free" | "configured" | "contact";
  priceDisplay: string;
  cadence: string;
  seatsLabel: string;
  additionalSeatsLabel?: string;
  billingNote: string;
  featuresHeading: string | null;
  features: string[];
  planned?: string[];
  cta: { label: string; href: string; primary?: boolean };
}

export const HERO = {
  eyebrow: "PRICING",
  title: "Plans that scale with how your team works.",
  subtitle:
    "Start free. Upgrade when your team is ready to turn every client conversation into a plan everyone trusts.",
  intro:
    "Start free. Upgrade when your team is ready to turn every client conversation into a plan everyone trusts.",
} as const;

/**
 * Three horizontal pricing tiers from the Roducq pricing PDF specification:
 *   1. Starter ($29 / month, 1 seat)
 *   2. Team — MOST POPULAR ($79 / month, Up to 5 seats, +$12/seat after 5 seats)
 *   3. Studio ($199 / month, Up to 15 seats)
 */
export const PLAN_TIERS: PlanTier[] = [
  {
    slug: "starter",
    name: "Starter",
    eyebrow: "Solo consultants & freelancers",
    tagline: "For solo consultants and freelancers",
    featured: false,
    pricing: "free",
    priceDisplay: "$29",
    cadence: "/ month",
    seatsLabel: "1 seat",
    billingNote: "1 seat · Billed per workspace",
    featuresHeading: null,
    features: [
      "15 briefs / month",
      "Intake workspace with source preservation",
      "AI-generated briefs with flagged gaps",
      "Basic proposal generation",
      "Community support",
    ],
    cta: { label: "Start free trial", href: "/signup" },
  },
  {
    slug: "team",
    name: "Team",
    eyebrow: "Small agencies",
    tagline: "For small agencies getting organized",
    featured: true,
    badge: "MOST POPULAR",
    pricing: "configured",
    priceDisplay: "$79",
    cadence: "/ month",
    seatsLabel: "Up to 5 seats",
    additionalSeatsLabel: "+$12/seat after 5 seats",
    billingNote: "Per workspace per month — not per seat in Razorpay checkout today.",
    featuresHeading: "EVERYTHING IN STARTER, PLUS",
    features: [
      "Unlimited briefs",
      "Task-plan generation with owners & due dates",
      "Client-update composer",
      "Shareable read-only brief links",
      "Full edit history & audit trail",
      "Priority email support",
    ],
    cta: { label: "Start free trial", href: "/signup", primary: true },
  },
  {
    slug: "studio",
    name: "Studio",
    eyebrow: "Growing client operations",
    tagline: "For growing teams running full client operations",
    featured: false,
    pricing: "contact",
    priceDisplay: "$199",
    cadence: "/ month",
    seatsLabel: "Up to 15 seats",
    billingNote: "Up to 15 seats · Custom workspace rollout",
    featuresHeading: "EVERYTHING IN TEAM, PLUS",
    features: [
      "Configurable brief, proposal & update templates",
      "Intake inbox with threaded sources",
      "Link revocation controls",
      "Higher AI usage caps",
      "Priority support & onboarding",
    ],
    cta: {
      label: "Talk to us",
      href: "mailto:hello@roducq.dev?subject=roducq%20Studio%20enquiry",
    },
  },
];

/** Exact 3-item pricing footnote below the cards from the PDF specification. */
export const FOOTER_ITEMS = [
  "No credit card required for trial",
  "Cancel anytime",
  "Your client data is never used to train models",
] as const;

/**
 * Policy & billing verification disclosure below the 3 footnote items.
 */
export const FOOTER_NOTE =
  "Prices exclude tax where applicable. Account signup requires no credit card, and active Razorpay subscriptions can be cancelled anytime from Settings. Note: annual billing plans, per-tier quota enforcement, and third-party AI model-training opt-out attestations remain subject to commercial and payment configuration approval — roducq does not enforce a usage limit on briefs, seats, or AI generations in code today.";

export interface ResolvedPlanTier extends PlanTier {
  resolvedPriceDisplay: string | null;
  resolvedCadence: string | null;
  priceNote: string | null;
  ctaDisabled: boolean;
}

export function plansForInterval(
  interval: BillingInterval,
  monthlyPrices: readonly RazorpayPlanConfig[]
): ResolvedPlanTier[] {
  const formattedMonthly = monthlyPrices
    .map(
      (p) =>
        `${formatPlanCurrency(p.amount, p.currency)}/${interval === "annual" ? "yr" : "mo"}`
    )
    .join(" · ");

  if (interval === "annual" && ANNUAL_PRICES.length === 0) {
    return PLAN_TIERS.map((tier) => ({
      ...tier,
      resolvedPriceDisplay: null,
      resolvedCadence: null,
      priceNote: ANNUAL_UNAVAILABLE_HEADLINE,
      ctaDisabled: tier.slug !== "studio",
    }));
  }

  return PLAN_TIERS.map((tier) => {
    let priceNote: string | null = null;
    if (tier.slug === "team") {
      priceNote = formattedMonthly
        ? `Live Razorpay checkout: ${formattedMonthly}`
        : PRICES_UNCONFIGURED_NOTE;
    }
    return {
      ...tier,
      resolvedPriceDisplay: tier.priceDisplay,
      resolvedCadence: tier.cadence,
      priceNote,
      ctaDisabled: false,
    };
  });
}
