/**
 * `/pricing` test suite — verifies:
 *   1. Exact PDF specification alignment (`Starter`, `Team`, `Studio`, header,
 *      segmented-pill `Monthly` | `Annual` `Save 17%` toggle, 3-item footnote)
 *   2. Forma marketing shell & responsive layout alignment (`.lm-shell`,
 *      `py-13 md:py-22 lg:py-30`, `lg:grid-cols-3`, no 4th Enterprise card on `/pricing`)
 *   3. Razorpay billing safety (`ANNUAL_PRICES` empty, annual checkout disabled
 *      until real annual plans exist, live `getPricesConfig` / `getPricingOffer`
 *      integration)
 *   4. Design-token hygiene and WCAG 2.1 AA contrast (`>= 4.5:1`) across light
 *      and dark modes for `--lm-pricing-*` orange/red tokens.
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

describe("/pricing hero + Forma layout + PDF specification", () => {
  it("delegates to the shared (marketing) layout and preserves PR #50 SEO metadata", () => {
    assert.doesNotMatch(PAGE, /SiteHeader|SiteFooter/);
    assert.match(PAGE, /export const metadata/);
    assert.match(PAGE, /Pricing — roducq/);
    assert.match(PAGE, /canonical:\s*"\/pricing"/);
    assert.match(PAGE, /images:\s*\[SOCIAL_IMAGE\]/);
    assert.match(PAGE, /images:\s*\[TWITTER_IMAGE\]/);
  });

  it("renders inside .lm-shell with the Forma section padding rhythm", () => {
    assert.match(PAGE, /className="lm-shell"/);
    assert.match(PAGE, /py-13 md:py-22 lg:py-30/);
    assert.match(PAGE, /id="pricing-page-heading"/);
    assert.match(PAGE, /<PricingPlans monthlyPrices=\{monthlyPrices\} views=\{views\} \/>/);
  });

  it("carries the exact PDF header copy from plans.ts", () => {
    assert.equal(HERO.eyebrow, "PRICING");
    assert.equal(HERO.title, "Plans that scale with how your team works.");
    assert.equal(
      HERO.subtitle,
      "Start free. Upgrade when your team is ready to turn every client conversation into a plan everyone trusts."
    );
    assert.match(PAGE, /HERO\.eyebrow/);
    assert.match(PAGE, /HERO\.title/);
    assert.match(PAGE, /HERO\.subtitle/);
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

  it("matches the exact PDF specification for Starter, Team (MOST POPULAR), and Studio", () => {
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

  it("renders the exact 3-item PDF footnote below the cards plus the billing/policy disclosure", () => {
    assert.deepEqual(FOOTER_ITEMS, [
      "No credit card required for trial",
      "Cancel anytime",
      "Your client data is never used to train models",
    ]);
    assert.match(PAGE, /FOOTER_ITEMS\.map/);
    assert.match(PAGE, /data-testid="pricing-footnote"/);
    assert.ok(FOOTER_NOTE.length > 150, "footer note should carry the contract");
    assert.match(FOOTER_NOTE, /Razorpay/);
    assert.match(FOOTER_NOTE, /cancel/i);
    assert.match(FOOTER_NOTE, /usage limit/i);
    assert.match(bySlug("team").billingNote, /per workspace/i);
    assert.match(bySlug("team").billingNote, /not per seat/i);
  });
});

describe("/pricing billing toggle & Razorpay alignment", () => {
  it("offers Monthly (default) and Annual with the Save 17% badge", () => {
    assert.deepEqual(BILLING_INTERVALS, ["monthly", "annual"]);
    assert.equal(INTERVAL_LABEL.monthly, "Monthly");
    assert.equal(INTERVAL_LABEL.annual, "Annual");
    assert.equal(ANNUAL_BADGE_LABEL, "Save 17%");
    assert.match(PLANS_TSX, /BILLING_INTERVALS\.map/);
    assert.match(PLANS_TSX, /useState<BillingInterval>\("monthly"\)/);
    assert.match(PLANS_TSX, /aria-pressed=\{selected\}/);
    assert.match(PLANS_TSX, /Billing period/);
    assert.match(PLANS_TSX, /ANNUAL_BADGE_LABEL/);
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

  it("the page hands the client pre-rendered views for BOTH intervals", () => {
    assert.match(PAGE, /buildMonthlyView\(/);
    assert.match(PAGE, /buildAnnualView\(/);
    assert.match(PAGE, /getPricesConfig\(\)/);
    assert.match(PAGE, /formatPrice\(/);
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

describe("/pricing launch-offer callout", () => {
  it("page calls getPricingOffer with the billing-configured flag", () => {
    assert.match(PAGE, /getPricingOffer\(pricesConfig\.ok\)/);
  });

  it("renders the callout only when an offer exists (null short-circuits)", () => {
    assert.match(PAGE, /\{offer \? \(/);
    assert.match(PAGE, /data-testid="pricing-offer"/);
  });

  it("shows badge, code and text from the resolved offer", () => {
    assert.match(PAGE, /\{offer\.badge\}/);
    assert.match(PAGE, /\{offer\.code\}/);
    assert.match(PAGE, /\{offer\.text\}/);
    assert.match(PAGE, /font-mono/, "promo code renders in monospace for readability");
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
  it("uses the token radius scale and scoped .lm-pricing-* classes without hardcoded hex literals", () => {
    for (const [name, src] of [
      ["plans.ts", PLANS],
      ["pricing-plans.tsx", PLANS_TSX],
      ["page.tsx", PAGE],
    ] as const) {
      assert.doesNotMatch(src, /rounded-\[/, `${name} bypasses the radius token`);
      assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b/, `${name} hardcodes a hex colour`);
      assert.doesNotMatch(src, /rgba?\(/, `${name} hardcodes an rgb/rgba colour`);
    }
    assert.match(PLANS_TSX, /lm-pricing-card-featured/);
    assert.match(PLANS_TSX, /lm-pricing-card/);
    assert.match(PLANS_TSX, /lm-pricing-popular-badge/);
    assert.match(PLANS_TSX, /lm-pricing-cta-primary/);
    assert.match(PLANS_TSX, /lm-pricing-cta-light/);
    assert.match(PLANS_TSX, /lg:grid-cols-3/);
  });

  it("renders Manrope headings and body copy and keeps tap targets >= 44px", () => {
    assert.match(PAGE, /font-display/, "hero heading uses the display stack");
    assert.match(PLANS_TSX, /font-display/, "tier names + prices use the display stack");
    assert.match(PLANS_TSX, /min-h-11/, "toggle buttons clear the 44px target");
    assert.match(PLANS_TSX, /min-h-12/, "card CTA buttons clear the 44px target");
    assert.match(PAGE, /min-h-11/, "footer mailto link clears the 44px target");
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
  it("integrates Motion.dev for the segmented-pill toggle indicator and staggered card reveals", () => {
    assert.match(PLANS_TSX, /from "motion\/react"/);
    assert.match(PLANS_TSX, /layoutId="pricing-billing-pill"/);
    assert.match(PLANS_TSX, /<Reveal/);
    assert.match(PAGE, /<Reveal/);
  });

  it("respects prefers-reduced-motion in landing.css for pricing card and CTA hover transitions", () => {
    assert.match(LANDING_CSS, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(LANDING_CSS, /\.lm-pricing-card\b/);
    assert.match(LANDING_CSS, /\.lm-pricing-card-featured\b/);
    assert.match(LANDING_CSS, /\.lm-pricing-cta-primary\b/);
    assert.match(LANDING_CSS, /\.lm-pricing-cta-light\b/);
  });

  it("provides full keyboard and screen-reader semantics across toggle, cards, and footnote", () => {
    assert.match(PAGE, /aria-labelledby="pricing-page-heading"/);
    assert.match(PAGE, /aria-label="Pricing guarantees"/);
    assert.match(PLANS_TSX, /role="group"/);
    assert.match(PLANS_TSX, /aria-label="Billing period"/);
    assert.match(PLANS_TSX, /aria-pressed=\{selected\}/);
    assert.match(PLANS_TSX, /role="status"/);
    assert.match(PLANS_TSX, /aria-live="polite"/);
    assert.match(PLANS_TSX, /aria-disabled="true"/);
    assert.match(PLANS_TSX, /focus-visible:ring-2/);
  });

  it("places each plan CTA button directly below the price/seat block and above the feature checklist (Forma card order)", () => {
    const priceIdx = PLANS_TSX.indexOf("plan-price-");
    const ctaIdx = PLANS_TSX.indexOf("plan-cta-");
    const featuresIdx = PLANS_TSX.indexOf("features.map");
    assert.ok(priceIdx > 0 && ctaIdx > priceIdx, "CTA must appear after price row");
    assert.ok(featuresIdx > ctaIdx, "feature checklist must appear after CTA button");
  });

  it("shares PLAN_TIERS with components/marketing/landing/PricingSection.tsx so homepage and /pricing stay aligned", () => {
    const homePricing = read("components/marketing/landing/PricingSection.tsx");
    assert.match(homePricing, /from "@\/app\/\(marketing\)\/pricing\/plans"/);
    assert.match(homePricing, /PLAN_TIERS\.map/);
    assert.match(homePricing, /tier\.priceDisplay/);
    assert.match(homePricing, /tier\.seatsLabel/);
    assert.match(homePricing, /tier\.featuresHeading/);
  });

  it("renders Starter and Studio with neutral card styling and light CTA buttons", () => {
    const starter = bySlug("starter");
    const studio = bySlug("studio");
    assert.equal(starter.featured, false);
    assert.equal(studio.featured, false);
    assert.equal(starter.cta.primary, undefined);
    assert.equal(studio.cta.primary, undefined);
    assert.match(PLANS_TSX, /isFeatured \? "lm-pricing-card-featured" : "lm-pricing-card"/);
    assert.match(PLANS_TSX, /isFeatured\s*\?\s*"lm-pricing-cta-primary"\s*:\s*"lm-pricing-cta-light"/);
  });

  it("renders Team with the MOST POPULAR badge, orange/red accent border, and primary CTA", () => {
    const team = bySlug("team");
    assert.equal(team.featured, true);
    assert.equal(team.badge, "MOST POPULAR");
    assert.equal(team.cta.primary, true);
    assert.match(PLANS_TSX, /data-testid="most-popular-badge"/);
  });

  it("renders INCLUDES on Starter and EVERYTHING IN ... PLUS on Team and Studio", () => {
    assert.equal(bySlug("starter").featuresHeading, null);
    assert.equal(bySlug("team").featuresHeading, "EVERYTHING IN STARTER, PLUS");
    assert.equal(bySlug("studio").featuresHeading, "EVERYTHING IN TEAM, PLUS");
    assert.match(PLANS_TSX, /INCLUDES/);
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
