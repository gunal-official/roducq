/**
 * /pricing regression suite: approved content and truthful monthly-only UI,
 * native accessibility and LCP safety, plus the existing historical plan,
 * annual-price, Razorpay, offer, contrast and shared-homepage safety checks.
 * The original Roducq PDF was unavailable; PLAN_TIERS is a provisional legacy
 * transcription, not proof of current tier entitlements or production billing.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ANNUAL_BADGE_LABEL,
  ANNUAL_PRICES,
  ANNUAL_UNAVAILABLE_HEADLINE,
  ANNUAL_UNAVAILABLE_NOTE,
  annualBillingAvailable,
  annualDiscountLabel,
  BILLING_INTERVALS,
  buildAnnualView,
  buildMonthlyView,
  describeAnnualDiscountPercent,
  FOOTER_ITEMS,
  FOOTER_NOTE,
  HERO,
  INTENDED_ANNUAL_DISCOUNT_PERCENT,
  INTERVAL_LABEL,
  PLAN_TIERS,
  PRICES_UNCONFIGURED_NOTE,
  plansForInterval,
} from "../../app/(marketing)/pricing/plans.ts";
import {
  BILLING_FAQ,
  COMPARISON_GROUPS,
  COMPARISON_LEGEND,
  COMPARISON_NOTES,
  PRICING_CARDS,
  PRICING_DISCLOSURE,
  PRICING_HERO,
  STUDIO_CONTACT,
} from "../../app/(marketing)/pricing/pricing-content.ts";
import type { RazorpayPlanConfig } from "../../lib/razorpay.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PLANS = read("app/(marketing)/pricing/plans.ts");
const PLANS_TSX = read("app/(marketing)/pricing/pricing-plans.tsx");
const PAGE = read("app/(marketing)/pricing/page.tsx");
const PRICING_CSS = read("app/(marketing)/pricing/pricing.css");
const PUBLIC_CONTENT = read("app/(marketing)/pricing/pricing-content.ts");
const LANDING_CSS = read("app/(marketing)/landing.css");
const STRIPE_LIB = read("lib/razorpay.ts");
const HARNESS = read("scripts/verify-responsive.mjs");

const configuredPrices: RazorpayPlanConfig[] = [
  { planId: "plan_inr", currency: "INR", amount: 2499 },
  { planId: "plan_usd", currency: "USD", amount: 79 },
];

const bySlug = (slug: string) => {
  const tier = PLAN_TIERS.find((t) => t.slug === slug);
  assert.ok(tier, `missing tier "${slug}"`);
  return tier;
};

describe("/pricing hero + Forma layout + provisional source", () => {
  it("delegates to the shared (marketing) layout and preserves PR #50 SEO metadata", () => {
    assert.doesNotMatch(PAGE, /SiteHeader|SiteFooter/);
    assert.match(PAGE, /export const metadata/);
    assert.match(PAGE, /Pricing — roducq/);
    assert.match(PAGE, /canonical:\s*"\/pricing"/);
    assert.match(PAGE, /images:\s*\[SOCIAL_IMAGE\]/);
    assert.match(PAGE, /images:\s*\[TWITTER_IMAGE\]/);
  });

  it("uses the shared shell and pricing-scoped layout sections", () => {
    assert.match(PAGE, /className="lm-shell"/);
    assert.match(PAGE, /id="pricing-page-heading"/);
    assert.match(PAGE, /<PricingPlans \/>/);
    for (const section of ["rp-hero-section", "rp-comparison-section", "rp-studio-section", "rp-faq-section", "rp-closing-section"]) {
      assert.ok(PAGE.includes(section), `missing ${section}`);
      assert.ok(PRICING_CSS.includes(`.${section}`), `missing scoped styles for ${section}`);
    }
  });

  it("retains historical hero data while displaying the approved pricing-specific hero", () => {
    assert.equal(HERO.eyebrow, "PRICING");
    assert.equal(HERO.title, "Plans that scale with how your team works.");
    assert.equal(HERO.subtitle, "Start free. Upgrade when your team is ready to turn every client conversation into a plan everyone trusts.");
    assert.deepEqual(PRICING_HERO, {
      eyebrow: "Pricing",
      before: "Plans for ",
      accent: "client work.",
      description: "Bring client conversations, briefs, proposals, and updates together. Explore the plan terms that fit the way you work.",
    });
    for (const field of ["eyebrow", "before", "accent", "description"]) assert.ok(PAGE.includes(`PRICING_HERO.${field}`));
    assert.doesNotMatch(PAGE, /HERO\.title|HERO\.subtitle/);
  });

  it("has exactly three tiers in order (Starter, Team, Studio) and no fourth Enterprise card on /pricing", () => {
    assert.deepEqual(
      PLAN_TIERS.map((t) => t.slug),
      ["starter", "team", "studio"]
    );
    assert.deepEqual(
      PLAN_TIERS.map((t) => t.name),
      ["Starter", "Team", "Studio"]
    );
    assert.equal(PLAN_TIERS.length, 3);
    assert.doesNotMatch(PAGE, /Enterprise/);
    assert.doesNotMatch(PLANS_TSX, /Enterprise/);
  });

  it("preserves the historical PLAN_TIERS transcription used by the homepage", () => {
    const [starter, team, studio] = PLAN_TIERS;

    // Plan 1 — Starter
    assert.equal(starter.name, "Starter");
    assert.equal(starter.tagline, "For solo consultants and freelancers");
    assert.equal(starter.priceDisplay, "$29");
    assert.equal(starter.cadence, "/ month");
    assert.equal(starter.seatsLabel, "1 seat");
    assert.equal(starter.additionalSeatsLabel, undefined);
    assert.equal(starter.cta.label, "Start free trial");
    assert.equal(starter.cta.href, "/signup");
    assert.equal(starter.featured, false);
    assert.equal(starter.badge, undefined);
    assert.equal(starter.featuresHeading, null);
    assert.deepEqual(starter.features, [
      "15 briefs / month",
      "Intake workspace with source preservation",
      "AI-generated briefs with flagged gaps",
      "Basic proposal generation",
      "Community support",
    ]);

    // Plan 2 — Team (Most Popular)
    assert.equal(team.name, "Team");
    assert.equal(team.badge, "MOST POPULAR");
    assert.equal(team.tagline, "For small agencies getting organized");
    assert.equal(team.priceDisplay, "$79");
    assert.equal(team.cadence, "/ month");
    assert.equal(team.seatsLabel, "Up to 5 seats");
    assert.equal(team.additionalSeatsLabel, "+$12/seat after 5 seats");
    assert.equal(team.cta.label, "Start free trial");
    assert.equal(team.cta.href, "/signup");
    assert.equal(team.cta.primary, true);
    assert.equal(team.featured, true);
    assert.equal(team.featuresHeading, "EVERYTHING IN STARTER, PLUS");
    assert.deepEqual(team.features, [
      "Unlimited briefs",
      "Task-plan generation with owners & due dates",
      "Client-update composer",
      "Shareable read-only brief links",
      "Full edit history & audit trail",
      "Priority email support",
    ]);

    // Plan 3 — Studio
    assert.equal(studio.name, "Studio");
    assert.equal(
      studio.tagline,
      "For growing teams running full client operations"
    );
    assert.equal(studio.priceDisplay, "$199");
    assert.equal(studio.cadence, "/ month");
    assert.equal(studio.seatsLabel, "Up to 15 seats");
    assert.equal(studio.additionalSeatsLabel, undefined);
    assert.equal(studio.cta.label, "Talk to us");
    assert.match(studio.cta.href, /^mailto:hello@roducq\.dev/);
    assert.equal(studio.featured, false);
    assert.equal(studio.badge, undefined);
    assert.equal(studio.featuresHeading, "EVERYTHING IN TEAM, PLUS");
    assert.deepEqual(studio.features, [
      "Configurable brief, proposal & update templates",
      "Intake inbox with threaded sources",
      "Link revocation controls",
      "Higher AI usage caps",
      "Priority support & onboarding",
    ]);
  });

  it("keeps historical footnote data but replaces unverified public promises with the approved disclosure", () => {
    assert.deepEqual(FOOTER_ITEMS, ["No credit card required for trial", "Cancel anytime", "Your client data is never used to train models"]);
    assert.ok(FOOTER_NOTE.length > 150);
    assert.match(FOOTER_NOTE, /Razorpay/);
    assert.match(FOOTER_NOTE, /cancel/i);
    assert.match(FOOTER_NOTE, /usage limit/i);
    assert.match(bySlug("team").billingNote, /per workspace/i);
    assert.match(bySlug("team").billingNote, /not per seat/i);
    assert.deepEqual(PRICING_DISCLOSURE, [
      "Monthly prices shown. Annual checkout is not available.",
      "Brief and seat limits are not currently enforced by tier. Additional-seat billing is not currently implemented. Starter, Team, and Studio are not mapped to separate paid-plan checkout. Creating an account does not purchase or activate a paid plan.",
    ]);
    assert.match(PAGE, /<PricingDisclosure context="cards" \/>/);
    assert.match(PAGE, /<PricingDisclosure context="comparison" \/>/);
    assert.doesNotMatch(PAGE, /FOOTER_ITEMS|FOOTER_NOTE|pricing-footnote/);
  });
});

describe("/pricing monthly-only presentation & Razorpay safety", () => {
  it("keeps legacy interval constants but renders no annual toggle, discount, or fabricated annual price", () => {
    assert.deepEqual(BILLING_INTERVALS, ["monthly", "annual"]);
    assert.equal(INTERVAL_LABEL.monthly, "Monthly");
    assert.equal(INTERVAL_LABEL.annual, "Annual");
    assert.equal(ANNUAL_BADGE_LABEL, "Save 17%");
    assert.doesNotMatch(PLANS_TSX, /BILLING_INTERVALS|ANNUAL_BADGE_LABEL|Billing period|aria-pressed/);
    assert.doesNotMatch(PAGE + PUBLIC_CONTENT, /Save 17%|annual discount|annual prices/i);
    assert.match(PRICING_DISCLOSURE[0], /Annual checkout is not available/);
  });

  it("annual is unavailable in self-serve checkout today, withholds annual prices, and disables Starter/Team CTAs", () => {
    assert.deepEqual(ANNUAL_PRICES, [], "no annual Razorpay prices exist yet");
    assert.equal(annualBillingAvailable(), false);
    const view = buildAnnualView([], [], ANNUAL_PRICES);
    assert.equal(view.available, false);
    assert.deepEqual(view.lines, []);
    assert.equal(view.discountLabel, null);
    assert.equal(view.unavailableNote, ANNUAL_UNAVAILABLE_NOTE);
    assert.match(ANNUAL_UNAVAILABLE_NOTE, /isn't offered/i);
    assert.match(ANNUAL_UNAVAILABLE_NOTE, /monthly/i);
    assert.ok(ANNUAL_UNAVAILABLE_HEADLINE.length > 10);

    const annualTiers = plansForInterval("annual", configuredPrices);
    const [starter, team, studio] = annualTiers;
    assert.equal(starter.resolvedPriceDisplay, null);
    assert.equal(starter.ctaDisabled, true);
    assert.equal(team.resolvedPriceDisplay, null);
    assert.equal(team.ctaDisabled, true);
    assert.equal(studio.resolvedPriceDisplay, null);
    assert.equal(studio.ctaDisabled, false, "Studio is a mailto contact link, not checkout");
  });

  it("monthly view reflects whether billing is configured and surfaces live Razorpay status on Team", () => {
    const configured = buildMonthlyView(["$79 USD"], true);
    assert.equal(configured.available, true);
    assert.deepEqual(configured.lines, ["$79 USD"]);
    assert.equal(configured.discountLabel, null);
    assert.equal(configured.unavailableNote, null);

    const missing = buildMonthlyView([], false);
    assert.equal(missing.available, false);
    assert.equal(missing.unavailableNote, PRICES_UNCONFIGURED_NOTE);

    const monthlyTiers = plansForInterval("monthly", configuredPrices);
    assert.equal(monthlyTiers[0].resolvedPriceDisplay, "$29");
    assert.equal(monthlyTiers[1].resolvedPriceDisplay, "$79");
    assert.match(monthlyTiers[1].priceNote ?? "", /₹2,499/);
    assert.equal(monthlyTiers[2].resolvedPriceDisplay, "$199");
  });

  it("does not invoke checkout configuration to imply paid-plan activation", () => {
    assert.doesNotMatch(PAGE + PLANS_TSX, /buildMonthlyView|buildAnnualView|getPricesConfig|formatPrice|getPricingOffer/);
    assert.match(PRICING_DISCLOSURE[1], /not mapped to separate paid-plan checkout/);
    assert.match(PRICING_DISCLOSURE[1], /does not purchase or activate a paid plan/);
  });
});

describe("/pricing discount arithmetic", () => {
  it("computes the saving from real amounts", () => {
    assert.equal(describeAnnualDiscountPercent(19, 190), INTENDED_ANNUAL_DISCOUNT_PERCENT);
    assert.equal(describeAnnualDiscountPercent(100, 1000), 17);
    assert.equal(describeAnnualDiscountPercent(10, 60), 50);
  });

  it("returns null rather than inventing a saving", () => {
    assert.equal(describeAnnualDiscountPercent(null, 190), null);
    assert.equal(describeAnnualDiscountPercent(19, null), null);
    assert.equal(describeAnnualDiscountPercent(0, 190), null);
    assert.equal(describeAnnualDiscountPercent(19, 0), null);
    assert.equal(describeAnnualDiscountPercent(-19, 190), null);
    assert.equal(describeAnnualDiscountPercent(19, Number.NaN), null);
    assert.equal(describeAnnualDiscountPercent(19, 228), null, "break-even is no saving");
    assert.equal(describeAnnualDiscountPercent(19, 300), null, "more expensive is no saving");
  });

  it("annualDiscountLabel computes the label once real annual prices exist", () => {
    assert.equal(annualDiscountLabel([], ANNUAL_PRICES), null);
    assert.equal(
      annualDiscountLabel([{ currency: "USD", planId: "price_m", amount: 19 }], ANNUAL_PRICES),
      null
    );
    const monthly = [{ currency: "USD", planId: "price_m", amount: 19 }];
    const annual = [{ currency: "USD", planId: "price_a", amount: 190 }];
    assert.equal(annualDiscountLabel(monthly, annual), "Save 17%");
    assert.equal(
      annualDiscountLabel(
        [...monthly, { currency: "EUR", planId: "price_me", amount: 17 }],
        annual
      ),
      null
    );
  });
});

describe("/pricing stays in the responsive harness", () => {
  it("the harness still audits /pricing as a marketing route", () => {
    assert.match(
      HARNESS,
      /\{\s*slug:\s*"marketing-pricing",\s*url:\s*"\/pricing",\s*auth:\s*false\s*\}/,
      "scripts/verify-responsive.mjs must keep the marketing-pricing route"
    );
  });
});

describe("/pricing launch-offer and protected-billing safety", () => {
  it("does not call the billing offer resolver from the public pricing page", () => {
    assert.doesNotMatch(PAGE + PLANS_TSX, /getPricingOffer|pricing-offer/);
  });

  it("does not render a promotional offer whose validity is unverified", () => {
    assert.doesNotMatch(PAGE + PLANS_TSX + PUBLIC_CONTENT, /LAUNCH20|PRICING_OFFER_BADGE|PRICING_OFFER_CODE|PRICING_OFFER_TEXT/);
  });

  it("does not claim live checkout or manufacture a coupon", () => {
    assert.doesNotMatch(PAGE + PLANS_TSX + PUBLIC_CONTENT, /live Razorpay checkout|discount code|promo code/i);
  });

  it("getPricingOffer lives in lib/razorpay.ts and returns null when billing is off", () => {
    assert.match(STRIPE_LIB, /export function getPricingOffer/);
    assert.match(STRIPE_LIB, /if \(!billingConfigured\) return null/);
  });

  it("no hardcoded Razorpay offer id — offers are dashboard-managed", () => {
    assert.doesNotMatch(
      stripComments(STRIPE_LIB),
      /offer_[A-Za-z0-9]{6,}/,
      "no hardcoded Razorpay offer id — offers are dashboard-managed"
    );
  });
});

describe("/pricing design tokens & WCAG 2.1 AA contrast", () => {
  it("keeps component colors token-based and uses pricing-scoped classes", () => {
    for (const [name, src] of [["plans.ts", PLANS], ["pricing-plans.tsx", PLANS_TSX], ["page.tsx", PAGE], ["pricing-content.ts", PUBLIC_CONTENT]] as const) {
      assert.doesNotMatch(src, /rounded-\[/, `${name} bypasses the radius token`);
      assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${name} hardcodes a hex colour`);
      assert.doesNotMatch(src, /rgba?\(/, `${name} hardcodes an rgb/rgba colour`);
    }
    assert.match(PRICING_CSS, /\.rp-page\s*\{[\s\S]*?--rp-ink:\s*var\(--lm-ink\)/);
    assert.match(PRICING_CSS, /--rp-border:\s*var\(--lm-surface-muted\)/);
    assert.match(PLANS_TSX, /rp-card--featured/);
    assert.match(PLANS_TSX, /rp-card-badge/);
    assert.match(PLANS_TSX, /rp-button--primary/);
    assert.match(PLANS_TSX, /rp-button--outline/);
    assert.match(PRICING_CSS, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  });

  it("renders Manrope headings and maintains 44px minimum controls", () => {
    assert.match(PAGE, /font-display/);
    assert.match(PLANS_TSX, /font-display/);
    assert.match(PRICING_CSS, /\.rp-button\s*\{[^}]*min-height:\s*48px/);
    assert.match(PAGE, /className="rp-button rp-button--white" data-testid="studio-banner-cta"/);
    assert.match(PRICING_CSS, /\.rp-faq summary\s*\{[^}]*min-height:\s*64px/);
  });

  it("clears 4.5:1 WCAG 2.1 AA across all light and dark --lm-pricing-* tokens", () => {
    function luminance(hex: string): number {
      const clean = hex.replace("#", "");
      const channels = [0, 2, 4].map(
        (i) => parseInt(clean.slice(i, i + 2), 16) / 255
      );
      const [r, g, b] = channels.map((c) =>
        c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      );
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function contrast(a: string, b: string): number {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    }

    function readToken(block: string, name: string): string {
      const m = block.match(new RegExp(`^\\s*${name}:\\s*(#[0-9a-fA-F]{6});`, "m"));
      assert.ok(m, `missing token ${name}`);
      return m![1];
    }

    const darkAt = LANDING_CSS.indexOf(".dark .rdq-marketing {");
    const lightBlock = LANDING_CSS.slice(0, darkAt);
    const darkBlock = LANDING_CSS.slice(darkAt);

    // Light mode pairs
    const lightAccent = readToken(lightBlock, "--lm-pricing-accent");
    const lightAccentStrong = readToken(lightBlock, "--lm-pricing-accent-strong");
    const lightOnAccent = readToken(lightBlock, "--lm-pricing-on-accent");
    const lightSurface = readToken(lightBlock, "--lm-pricing-accent-surface");
    const lightSurfaceInk = readToken(lightBlock, "--lm-pricing-accent-ink");
    const lightCtaLight = readToken(lightBlock, "--lm-pricing-cta-light");
    const lightInk = readToken(lightBlock, "--lm-ink");
    const lightCanvas = readToken(lightBlock, "--lm-canvas");
    const lightCard = readToken(lightBlock, "--lm-card");

    assert.ok(contrast(lightOnAccent, lightAccent) >= 4.5, "light white on pricing accent");
    assert.ok(contrast(lightOnAccent, lightAccentStrong) >= 4.5, "light white on pricing accent strong");
    assert.ok(contrast(lightAccent, lightCanvas) >= 4.5, "light pricing eyebrow on canvas");
    assert.ok(contrast(lightAccent, lightCard) >= 4.5, "light pricing accent on card");
    assert.ok(contrast(lightSurfaceInk, lightSurface) >= 4.5, "light Save 17% badge contrast");
    assert.ok(contrast(lightInk, lightCtaLight) >= 4.5, "light neutral CTA contrast");

    // Dark mode pairs
    const darkAccent = readToken(darkBlock, "--lm-pricing-accent");
    const darkAccentStrong = readToken(darkBlock, "--lm-pricing-accent-strong");
    const darkOnAccent = readToken(darkBlock, "--lm-pricing-on-accent");
    const darkSurface = readToken(darkBlock, "--lm-pricing-accent-surface");
    const darkSurfaceInk = readToken(darkBlock, "--lm-pricing-accent-ink");
    const darkCtaLight = readToken(darkBlock, "--lm-pricing-cta-light");
    const darkInk = readToken(darkBlock, "--lm-ink");
    const darkCanvas = readToken(darkBlock, "--lm-canvas-alt");
    const darkCard = readToken(darkBlock, "--lm-surface-muted");

    assert.ok(contrast(darkOnAccent, darkAccent) >= 4.5, "dark on-accent on pricing accent");
    assert.ok(contrast(darkOnAccent, darkAccentStrong) >= 4.5, "dark on-accent on pricing accent strong");
    assert.ok(contrast(darkAccent, darkCanvas) >= 4.5, "dark pricing eyebrow on canvas");
    assert.ok(contrast(darkAccent, darkCard) >= 4.5, "dark pricing accent on card");
    assert.ok(contrast(darkSurfaceInk, darkSurface) >= 4.5, "dark Save 17% badge contrast");
    assert.ok(contrast(darkInk, darkCtaLight) >= 4.5, "dark neutral CTA contrast");
  });
});

describe("/pricing Motion.dev, accessibility & homepage consistency", () => {
  it("uses Motion.dev for optional card interaction without an opacity-zero initial state", () => {
    assert.match(PLANS_TSX, /from "motion\/react"/);
    assert.match(PLANS_TSX, /<motion\.article/);
    assert.match(PLANS_TSX, /initial=\{false\}/);
    assert.match(PLANS_TSX, /whileHover=\{reduceMotion \? undefined/);
    assert.doesNotMatch(PLANS_TSX, /initial=\{\{[^}]*opacity:\s*0/);
    assert.match(PRICING_CSS, /\.rp-page \.lm-hero-in\s*\{[^}]*opacity:\s*1/);
    assert.match(PRICING_CSS, /\.rp-page \.lm-hero-in\s*\{[^}]*animation:\s*none/);
  });

  it("honors reduced motion and preserves the native FAQ's 260ms disclosure", () => {
    assert.match(PLANS_TSX, /useReducedMotion/);
    assert.match(LANDING_CSS, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(LANDING_CSS, /\.lm-faq::details-content\s*\{[^}]*block-size 260ms/);
    assert.match(LANDING_CSS, /\.rdq-marketing \.lm-faq::details-content\s*\{[^}]*transition:\s*none/);
    assert.match(LANDING_CSS, /\.lm-pricing-card\b/);
    assert.match(LANDING_CSS, /\.lm-pricing-card-featured\b/);
    assert.match(LANDING_CSS, /\.lm-pricing-cta-primary\b/);
    assert.match(LANDING_CSS, /\.lm-pricing-cta-light\b/);
  });

  it("provides native keyboard and screen-reader semantics for plans, table, FAQ and disclosures", () => {
    assert.match(PAGE, /aria-labelledby="pricing-page-heading"/);
    assert.match(PLANS_TSX, /aria-label=\{`\$\{tier\.name\} plan`\}/);
    assert.match(PAGE, /<table/);
    assert.match(PAGE, /<caption className="sr-only">/);
    assert.match(PAGE, /scope="col"/);
    assert.match(PAGE, /scope="row"/);
    assert.match(PAGE, /scope="rowgroup"/);
    assert.match(PAGE, /headers=\{`\$\{groupId\} \$\{rowId\} \$\{COMPARISON_COLUMN_IDS\[index\]\}`\}/);
    assert.match(PAGE, /aria-describedby="pricing-comparison-legend pricing-matrix-notes"/);
    assert.match(PAGE, /tabIndex=\{0\}/);
    assert.match(PAGE, /<details className="lm-faq rp-faq"/);
    assert.match(PAGE, /<summary>/);
    assert.match(LANDING_CSS, /:where\(a, button, summary, \[tabindex\]\):focus-visible/);
  });

  it("places each plan CTA button directly below the price/seat block and above the feature checklist (Forma card order)", () => {
    const priceIdx = PLANS_TSX.indexOf("plan-price-");
    const ctaIdx = PLANS_TSX.indexOf("plan-cta-");
    const featuresIdx = PLANS_TSX.indexOf("features.map");
    assert.ok(priceIdx > 0 && ctaIdx > priceIdx, "CTA must appear after price row");
    assert.ok(featuresIdx > ctaIdx, "feature checklist must appear after CTA button");
  });

  it("uses the approved pricing presentation on the homepage without changing /pricing", () => {
    const homePricing = read("components/marketing/landing/PricingSection.tsx");
    assert.match(homePricing, /from "@\/app\/\(marketing\)\/pricing\/pricing-content"/);
    assert.match(homePricing, /PRICING_CARDS\.map/);
    assert.match(homePricing, /plan\.price/);
    assert.match(homePricing, /plan\.seats/);
    assert.match(homePricing, /plan\.featuresHeading/);
    assert.match(homePricing, /PRICING_DISCLOSURE\.map/);
    assert.doesNotMatch(homePricing, /PLAN_TIERS|Razorpay/);
    assert.match(PLANS_TSX, /PRICING_CARDS/);
    assert.match(PAGE, /PricingPlans/);
  });

  it("renders Starter and Studio with neutral cards and outline CTA buttons", () => {
    assert.equal(PRICING_CARDS[0].featured, false);
    assert.equal(PRICING_CARDS[2].featured, false);
    assert.match(PLANS_TSX, /tier\.featured \? " rp-card--featured" : ""/);
    assert.match(PLANS_TSX, /tier\.featured \? " rp-button--primary" : " rp-button--outline"/);
  });

  it("renders Team with the MOST POPULAR badge, purple emphasis, and primary CTA", () => {
    const team = PRICING_CARDS[1];
    assert.equal(team.featured, true);
    assert.equal(team.badge, "MOST POPULAR");
    assert.match(PLANS_TSX, /data-testid="most-popular-badge"/);
    assert.match(PRICING_CSS, /\.rp-card--featured\s*\{[^}]*border-color:\s*var\(--lm-accent-line\)/);
  });

  it("renders the approved inheritance headings and availability qualifiers", () => {
    assert.equal(PRICING_CARDS[0].featuresHeading, "Includes");
    assert.equal(PRICING_CARDS[1].featuresHeading, "Everything in Starter, with the Team brief allowance replacing the Starter allowance, plus:");
    assert.equal(PRICING_CARDS[2].featuresHeading, "Everything in Team, with the same availability notes, plus:");
    assert.match(PLANS_TSX, /tier\.featuresHeading/);
    assert.match(PLANS_TSX, /data-availability=\{feature\.state\}/);
  });

  it("never modifies lib/razorpay.ts or introduces live payment keys", () => {
    assert.match(STRIPE_LIB, /ALLOWED_RAZORPAY_MODES:\s*readonly\s*RazorpayMode\[\]\s*=\s*\["test"\]/);
    assert.doesNotMatch(STRIPE_LIB, /rzp_live_[A-Za-z0-9]+/);
  });

  it("documents the pricingoffer env vars in .env.local.example", () => {
    const envExample = read(".env.local.example");
    assert.match(envExample, /PRICING_OFFER_BADGE/);
    assert.match(envExample, /PRICING_OFFER_TEXT/);
    assert.match(envExample, /PRICING_OFFER_CODE/);
  });

  it("declares the Manrope display and body font stack in tailwind.config.ts", () => {
    const config = read("tailwind.config.ts");
    assert.match(config, /display:\s*\[\s*"var\(--font-manrope\)"/);
    assert.match(config, /sans:\s*\[\s*"var\(--font-manrope\)"/);
  });
});


describe("/pricing approved public content and billing disclosures", () => {
  it("publishes exactly the approved three cards, seats, labels, benefits and destinations", () => {
    assert.deepEqual(PRICING_CARDS.map(({slug, name, tagline, price, cadence, seats, badge, featured, cta, featuresHeading, features}) => ({
      slug, name, tagline, price, cadence, seats, badge, featured, cta, featuresHeading, features: features.map(({text}) => text),
    })), [
      {
        slug: "starter", name: "Starter", tagline: "For solo consultants and freelancers", price: "$29", cadence: "/ month", seats: "1 seat", badge: undefined, featured: false,
        cta: {label: "Create account", href: "/signup"}, featuresHeading: "Includes",
        features: ["15 briefs / month — tier limits are not currently enforced.", "Intake workspace with source preservation.", "Brief drafting with flagged gaps (AI when configured; otherwise a non-AI fallback).", "Generate proposal drafts from briefs."],
      },
      {
        slug: "team", name: "Team", tagline: "For small agencies getting organized", price: "$79", cadence: "/ month", seats: "Up to 5 seats · +$12 / additional seat after 5 seats", badge: "MOST POPULAR", featured: true,
        cta: {label: "Create account", href: "/signup"}, featuresHeading: "Everything in Starter, with the Team brief allowance replacing the Starter allowance, plus:",
        features: ["Unlimited briefs — tier limits are not currently enforced.", "Generate task plans from proposal deliverables.", "Per-task owners — Not currently available.", "Per-task due dates — Not currently available.", "Client-update composer.", "Read-only brief sharing — Not currently available.", "Edit history and audit trails — Partial."],
      },
      {
        slug: "studio", name: "Studio", tagline: "For growing teams running full client operations", price: "$199", cadence: "/ month", seats: "Up to 15 seats", badge: undefined, featured: false,
        cta: {label: "Talk to us", href: "mailto:hello@roducq.dev?subject=roducq%20Studio%20enquiry"}, featuresHeading: "Everything in Team, with the same availability notes, plus:",
        features: ["Configurable update templates.", "Intake inbox with threaded sources.", "Revocable client-update links."],
      },
    ]);
    assert.deepEqual(PRICING_CARDS[1].features.filter((feature) => feature.state === "unavailable").map((feature) => feature.text), [
      "Per-task owners — Not currently available.", "Per-task due dates — Not currently available.", "Read-only brief sharing — Not currently available.",
    ]);
    assert.equal(PRICING_CARDS[1].features.at(-1)?.state, "partial");
  });

  it("publishes the entire corrected comparison matrix and notes", () => {
    assert.equal(COMPARISON_LEGEND, "✓ indicates a capability described in the plan. Access is not currently enforced by Starter, Team, or Studio tier. — means not listed for that plan.");
    assert.deepEqual(COMPARISON_GROUPS.flatMap((group) => group.rows).map(({feature, values}) => [feature, ...values]), [
      ["Monthly price", "$29 / month", "$79 / month", "$199 / month"],
      ["Seats", "1 seat", "Up to 5 seats", "Up to 15 seats"],
      ["Additional seats", "—", "+$12 / additional seat after 5 seats", "—"],
      ["Briefs", "15 / month*", "Unlimited*", "Unlimited*"],
      ["Intake workspace with source preservation", "✓", "✓", "✓"],
      ["Brief drafting with flagged gaps†", "✓", "✓", "✓"],
      ["Generate proposal drafts from briefs", "✓", "✓", "✓"],
      ["Generate task plans from proposal deliverables", "—", "✓", "✓"],
      ["Per-task owners", "— (Not included)", "Not currently available", "Not currently available"],
      ["Per-task due dates", "— (Not included)", "Not currently available", "Not currently available"],
      ["Client-update composer", "—", "✓", "✓"],
      ["Read-only brief sharing", "— (Not included)", "Not currently available", "Not currently available"],
      ["Edit history and audit trails", "—", "Partial", "Partial"],
      ["Configurable update templates", "—", "—", "✓"],
      ["Intake inbox with threaded sources", "—", "—", "✓"],
      ["Revocable client-update links", "—", "—", "✓"],
    ]);
    assert.deepEqual(COMPARISON_NOTES, ["* Brief limits are not currently enforced by tier.", "† AI is used when configured; otherwise brief drafting uses a non-AI fallback."]);
  });

  it("publishes all five exact approved FAQ answers in native disclosures", () => {
    assert.deepEqual(BILLING_FAQ, [
      {question: "How many seats are listed for each plan?", answer: "Starter is listed with 1 seat, Team with up to 5 seats, and Studio with up to 15 seats. Seat limits are not currently enforced by tier."},
      {question: "What are the brief limits?", answer: "Starter is listed with 15 briefs per month; Team and Studio are listed with unlimited briefs. Brief limits are not currently enforced by tier."},
      {question: "What is Team’s additional-seat price?", answer: "Team lists an additional $12 per seat after 5 seats. Additional-seat billing is not currently implemented."},
      {question: "Is annual checkout available?", answer: "No. Annual checkout is not available. The prices shown are monthly."},
      {question: "Does creating an account purchase or activate a paid plan?", answer: "No. Creating an account does not purchase or activate a paid plan. Starter, Team, and Studio are not mapped to separate paid-plan checkout."},
    ]);
    assert.match(PAGE, /BILLING_FAQ\.map/);
    assert.match(PAGE, /<details className="lm-faq rp-faq"/);
  });

  it("uses the approved CTA routes and labels the fictional illustration", () => {
    assert.equal(STUDIO_CONTACT, "mailto:hello@roducq.dev?subject=roducq%20Studio%20enquiry");
    assert.match(PAGE, /href=\{STUDIO_CONTACT\}[^>]*data-testid="studio-banner-cta"/);
    assert.match(PAGE, /href="\/signup"[^>]*data-testid="pricing-bottom-cta"/);
    assert.match(PAGE, /Start organizing client work/);
    assert.match(PAGE, /<figcaption>Illustrative example · fictional client<\/figcaption>/);
    assert.doesNotMatch(PAGE + PLANS_TSX + PUBLIC_CONTENT, /href=["']\/demo/);
  });

  it("omits unverified public support, template, AI-cap, trial and annual-discount promises", () => {
    const rendered = JSON.stringify({cards: PRICING_CARDS, groups: COMPARISON_GROUPS, faq: BILLING_FAQ, disclosure: PRICING_DISCLOSURE});
    for (const pattern of [/community support/i, /priority (?:email )?support/i, /support & onboarding/i, /brief, proposal & update templates/i, /higher AI (?:usage )?caps/i, /free trial/i, /save 17%/i, /enterprise/i]) {
      assert.doesNotMatch(rendered, pattern);
    }
  });
});
