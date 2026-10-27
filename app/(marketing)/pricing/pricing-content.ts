/**
 * Approved, pricing-page-only presentation content.
 *
 * The historical PLAN_TIERS in plans.ts is shared with the homepage and
 * billing-related safety helpers. Keep this presentation separate so the
 * pricing redesign does not change another route, a payment configuration,
 * or an entitlement. See docs/FORMA_PRICING_CONTENT_REVIEW.md: the original
 * Roducq pricing PDF was unavailable, so its repository transcription is
 * explicitly provisional and its implementation limitations are disclosed.
 */

export const STUDIO_CONTACT =
  "mailto:hello@roducq.dev?subject=roducq%20Studio%20enquiry";

export const PRICING_HERO = {
  eyebrow: "Pricing",
  before: "Plans for ",
  accent: "client work.",
  description:
    "Bring client conversations, briefs, proposals, and updates together. Explore the plan terms that fit the way you work.",
} as const;

export type PricingFeature = {
  text: string;
  state: "available" | "unavailable" | "partial" | "note";
  emphasis?: string;
};

export type PricingCard = {
  slug: "starter" | "team" | "studio";
  name: string;
  tagline: string;
  price: string;
  cadence: string;
  seats: string;
  badge?: string;
  featured: boolean;
  cta: { label: string; href: string };
  featuresHeading: string;
  features: readonly PricingFeature[];
};

export const PRICING_CARDS: readonly PricingCard[] = [
  {
    slug: "starter",
    name: "Starter",
    tagline: "For solo consultants and freelancers",
    price: "$29",
    cadence: "/ month",
    seats: "1 seat",
    featured: false,
    cta: { label: "Create account", href: "/signup" },
    featuresHeading: "Includes",
    features: [
      {
        text: "15 briefs / month — tier limits are not currently enforced.",
        state: "note",
      },
      { text: "Intake workspace with source preservation.", state: "available" },
      {
        text: "Brief drafting with flagged gaps (AI when configured; otherwise a non-AI fallback).",
        state: "available",
      },
      { text: "Generate proposal drafts from briefs.", state: "available" },
    ],
  },
  {
    slug: "team",
    name: "Team",
    tagline: "For small agencies getting organized",
    price: "$79",
    cadence: "/ month",
    seats: "Up to 5 seats · +$12 / additional seat after 5 seats",
    badge: "MOST POPULAR",
    featured: true,
    cta: { label: "Create account", href: "/signup" },
    featuresHeading:
      "Everything in Starter, with the Team brief allowance replacing the Starter allowance, plus:",
    features: [
      {
        text: "Unlimited briefs — tier limits are not currently enforced.",
        state: "note",
      },
      {
        text: "Generate task plans from proposal deliverables.",
        state: "available",
      },
      {
        text: "Per-task owners — Not currently available.",
        state: "unavailable",
        emphasis: "Not currently available",
      },
      {
        text: "Per-task due dates — Not currently available.",
        state: "unavailable",
        emphasis: "Not currently available",
      },
      { text: "Client-update composer.", state: "available" },
      {
        text: "Read-only brief sharing — Not currently available.",
        state: "unavailable",
        emphasis: "Not currently available",
      },
      {
        text: "Edit history and audit trails — Partial.",
        state: "partial",
        emphasis: "Partial",
      },
    ],
  },
  {
    slug: "studio",
    name: "Studio",
    tagline: "For growing teams running full client operations",
    price: "$199",
    cadence: "/ month",
    seats: "Up to 15 seats",
    featured: false,
    cta: { label: "Talk to us", href: STUDIO_CONTACT },
    featuresHeading: "Everything in Team, with the same availability notes, plus:",
    features: [
      { text: "Configurable update templates.", state: "available" },
      { text: "Intake inbox with threaded sources.", state: "available" },
      { text: "Revocable client-update links.", state: "available" },
    ],
  },
];

export const PRICING_DISCLOSURE = [
  "Monthly prices shown. Annual checkout is not available.",
  "Brief and seat limits are not currently enforced by tier. Additional-seat billing is not currently implemented. Starter, Team, and Studio are not mapped to separate paid-plan checkout. Creating an account does not purchase or activate a paid plan.",
] as const;

export const COMPARISON_LEGEND =
  "✓ indicates a capability described in the plan. Access is not currently enforced by Starter, Team, or Studio tier. — means not listed for that plan.";

export type ComparisonRow = {
  feature: string;
  values: readonly [string, string, string];
};

export const COMPARISON_GROUPS: readonly {
  title: string;
  rows: readonly ComparisonRow[];
}[] = [
  {
    title: "Plan details",
    rows: [
      { feature: "Monthly price", values: ["$29 / month", "$79 / month", "$199 / month"] },
      { feature: "Seats", values: ["1 seat", "Up to 5 seats", "Up to 15 seats"] },
      { feature: "Additional seats", values: ["—", "+$12 / additional seat after 5 seats", "—"] },
      { feature: "Briefs", values: ["15 / month*", "Unlimited*", "Unlimited*"] },
    ],
  },
  {
    title: "Briefs and proposals",
    rows: [
      { feature: "Intake workspace with source preservation", values: ["✓", "✓", "✓"] },
      { feature: "Brief drafting with flagged gaps†", values: ["✓", "✓", "✓"] },
      { feature: "Generate proposal drafts from briefs", values: ["✓", "✓", "✓"] },
    ],
  },
  {
    title: "Delivery and sharing",
    rows: [
      { feature: "Generate task plans from proposal deliverables", values: ["—", "✓", "✓"] },
      { feature: "Per-task owners", values: ["— (Not included)", "Not currently available", "Not currently available"] },
      { feature: "Per-task due dates", values: ["— (Not included)", "Not currently available", "Not currently available"] },
      { feature: "Client-update composer", values: ["—", "✓", "✓"] },
      { feature: "Read-only brief sharing", values: ["— (Not included)", "Not currently available", "Not currently available"] },
      { feature: "Edit history and audit trails", values: ["—", "Partial", "Partial"] },
    ],
  },
  {
    title: "Studio workspace",
    rows: [
      { feature: "Configurable update templates", values: ["—", "—", "✓"] },
      { feature: "Intake inbox with threaded sources", values: ["—", "—", "✓"] },
      { feature: "Revocable client-update links", values: ["—", "—", "✓"] },
    ],
  },
];

export const COMPARISON_NOTES = [
  "* Brief limits are not currently enforced by tier.",
  "† AI is used when configured; otherwise brief drafting uses a non-AI fallback.",
] as const;

export const BILLING_FAQ = [
  {
    question: "How many seats are listed for each plan?",
    answer:
      "Starter is listed with 1 seat, Team with up to 5 seats, and Studio with up to 15 seats. Seat limits are not currently enforced by tier.",
  },
  {
    question: "What are the brief limits?",
    answer:
      "Starter is listed with 15 briefs per month; Team and Studio are listed with unlimited briefs. Brief limits are not currently enforced by tier.",
  },
  {
    question: "What is Team’s additional-seat price?",
    answer:
      "Team lists an additional $12 per seat after 5 seats. Additional-seat billing is not currently implemented.",
  },
  {
    question: "Is annual checkout available?",
    answer: "No. Annual checkout is not available. The prices shown are monthly.",
  },
  {
    question: "Does creating an account purchase or activate a paid plan?",
    answer:
      "No. Creating an account does not purchase or activate a paid plan. Starter, Team, and Studio are not mapped to separate paid-plan checkout.",
  },
] as const;
