/**
 * /pricing (redesign, 2026-10-10) — structural tests + the truthfulness
 * guards that keep the page from re-acquiring claims the product can't
 * back.
 *
 * Two halves. The first asserts the shape the redesign promises: the hero
 * line, three tiers with Team flagged most popular, the Monthly/Annual
 * toggle, and the discount arithmetic. The second is the reason this file
 * exists at all: roducq enforces no briefs-per-month, no seat limits and no
 * AI caps, and bills per workspace at a hardcoded quantity of 1 — so these
 * tests FAIL if that copy sneaks back in, or if the "Save N%" chip is ever
 * hardcoded instead of computed from real annual prices.
 *
 * Source-level, like vs-comparisons.test.ts and nav.test.ts: node:test,
 * zero test deps.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ANNUAL_PRICES,
  ANNUAL_UNAVAILABLE_NOTE,
  annualBillingAvailable,
  annualDiscountLabel,
  BILLING_INTERVALS,
  buildAnnualView,
  buildMonthlyView,
  describeAnnualDiscountPercent,
  FOOTER_NOTE,
  HERO,
  INTENDED_ANNUAL_DISCOUNT_PERCENT,
  INTERVAL_LABEL,
  PLAN_TIERS,
  PRICES_UNCONFIGURED_NOTE,
} from "../../app/(marketing)/pricing/plans.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

/**
 * Comments are prose about the code, not shipped copy — but they are still
 * a place a fabricated price could hide. Copy-level assertions run on the
 * raw source (stricter); only the "no literal price in the data" check
 * needs comments out of the way, because plans.ts documents "$19 USD" as
 * an *example* of what the operator's config renders.
 */
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PLANS = read("app/(marketing)/pricing/plans.ts");
const PLANS_TSX = read("app/(marketing)/pricing/pricing-plans.tsx");
const PAGE = read("app/(marketing)/pricing/page.tsx");
const STRIPE_LIB = read("lib/stripe.ts");
const HARNESS = read("scripts/verify-responsive.mjs");

const bySlug = (slug: string) => {
  const tier = PLAN_TIERS.find((t) => t.slug === slug);
  assert.ok(tier, `missing tier "${slug}"`);
  return tier;
};

describe("/pricing hero + content", () => {
  it("carries the hero line verbatim", () => {
    assert.equal(HERO.title, "Plans that scale with how your team works.");
    assert.ok(HERO.intro.length > 80, "hero intro should explain the framing");
    assert.ok(HERO.eyebrow.trim(), "hero eyebrow");
  });

  it("renders the hero copy from plans.ts, not a literal in the page", () => {
    assert.match(PAGE, /HERO\.title/, "page should render HERO.title");
    assert.doesNotMatch(
      PAGE,
      /Plans that scale with how your team works\./,
      "hero line belongs in plans.ts, not duplicated in page.tsx"
    );
  });

  it("has exactly three tiers, in order: Starter, Team, Studio", () => {
    assert.deepEqual(
      PLAN_TIERS.map((t) => t.slug),
      ["starter", "team", "studio"]
    );
    assert.deepEqual(
      PLAN_TIERS.map((t) => t.name),
      ["Starter", "Team", "Studio"]
    );
  });

  it("flags Team as Most popular, and only Team", () => {
    assert.equal(bySlug("team").badge, "Most popular");
    assert.equal(bySlug("starter").badge, undefined);
    assert.equal(bySlug("studio").badge, undefined);
  });

  it("every tier has a tagline, a billing note, features and a CTA", () => {
    for (const tier of PLAN_TIERS) {
      assert.ok(tier.eyebrow.trim(), `${tier.slug}: eyebrow`);
      assert.ok(tier.tagline.trim(), `${tier.slug}: tagline`);
      assert.ok(tier.billingNote.trim(), `${tier.slug}: billing note`);
      assert.ok(tier.features.length >= 3, `${tier.slug}: needs features`);
      assert.ok(tier.cta.label.trim(), `${tier.slug}: cta label`);
      assert.ok(tier.cta.href.trim(), `${tier.slug}: cta href`);
      for (const f of tier.features) assert.ok(f.trim(), `${tier.slug}: blank feature`);
    }
  });

  it("free tier is $0 and publishes no other figure", () => {
    assert.equal(bySlug("starter").pricing, "free");
    assert.equal(bySlug("team").pricing, "configured");
    assert.equal(bySlug("studio").pricing, "contact");
  });

  it("footer note exists and states the cancellation + no-limits contract", () => {
    assert.ok(FOOTER_NOTE.length > 150, "footer note should carry the contract");
    assert.match(FOOTER_NOTE, /Stripe/);
    assert.match(FOOTER_NOTE, /cancel/i);
    assert.match(FOOTER_NOTE, /not a usage limit|no plan on this page is a usage limit/i);
  });
});

describe("/pricing billing toggle", () => {
  it("offers Monthly and Annual, labelled and in order", () => {
    assert.deepEqual(BILLING_INTERVALS, ["monthly", "annual"]);
    assert.equal(INTERVAL_LABEL.monthly, "Monthly");
    assert.equal(INTERVAL_LABEL.annual, "Annual");
  });

  it("the client component renders both tabs from the shared list", () => {
    assert.match(PLANS_TSX, /BILLING_INTERVALS\.map/);
    assert.match(PLANS_TSX, /aria-pressed/);
    assert.match(PLANS_TSX, /Billing period/);
  });

  it("annual is unavailable today and says so honestly", () => {
    assert.deepEqual(ANNUAL_PRICES, [], "no annual Stripe prices exist yet");
    assert.equal(annualBillingAvailable(), false);
    const view = buildAnnualView([], [], ANNUAL_PRICES);
    assert.equal(view.available, false);
    assert.deepEqual(view.lines, []);
    assert.equal(view.discountLabel, null);
    assert.equal(view.unavailableNote, ANNUAL_UNAVAILABLE_NOTE);
    assert.match(ANNUAL_UNAVAILABLE_NOTE, /isn't offered yet/);
    assert.match(ANNUAL_UNAVAILABLE_NOTE, /monthly/);
  });

  it("monthly view reflects whether billing is configured at all", () => {
    const configured = buildMonthlyView(["$19 USD"], true);
    assert.equal(configured.available, true);
    assert.deepEqual(configured.lines, ["$19 USD"]);
    assert.equal(configured.discountLabel, null);
    assert.equal(configured.unavailableNote, null);

    const missing = buildMonthlyView([], false);
    assert.equal(missing.available, false);
    assert.equal(missing.unavailableNote, PRICES_UNCONFIGURED_NOTE);
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
    // $19/mo vs $190/yr → 1 - 190/228 = 16.7% → 17
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

  it("today's config yields no chip label — the badge is derived, never hardcoded", () => {
    assert.equal(annualDiscountLabel([], ANNUAL_PRICES), null);
    assert.equal(annualDiscountLabel([{ currency: "USD", priceId: "price_m", amount: 19 }], ANNUAL_PRICES), null);
    // ...and lights up the moment real annual prices land.
    const monthly = [{ currency: "USD", priceId: "price_m", amount: 19 }];
    const annual = [{ currency: "USD", priceId: "price_a", amount: 190 }];
    assert.equal(annualDiscountLabel(monthly, annual), "Save 17%");
    // A partial config (EUR has no annual price) shows nothing.
    assert.equal(
      annualDiscountLabel(
        [...monthly, { currency: "EUR", priceId: "price_me", amount: 17 }],
        annual
      ),
      null
    );
  });

  it("the rendered chip only ever reads the computed label", () => {
    assert.match(PLANS_TSX, /annualLabel/, "chip should render the derived label");
    // Code only — the module docstring in plans.ts quotes "Save 17%" as the
    // example this arithmetic produces, which is prose, not a literal.
    assert.doesNotMatch(
      stripComments(PLANS_TSX),
      /Save\s?\d+%/,
      "no hardcoded Save N% in the markup"
    );
    assert.doesNotMatch(
      stripComments(PLANS),
      /["'`]Save \d+%["'`]/,
      "no hardcoded Save N% literal in plans.ts data"
    );
  });
});

describe("/pricing truthfulness", () => {
  const PRICING_SOURCE = `${PLANS}\n${PLANS_TSX}\n${PAGE}`;

  it("claims no enforced brief, seat or AI limits", () => {
    const forbidden: [string, RegExp][] = [
      ["briefs-per-month cap", /\b\d+\s*(?:briefs?|projects?|docs?)\s*(?:\/|per)\s*month\b/i],
      ["seat limit", /\b(?:up to|max(?:imum)?)\s*\d+\s*(?:seats?|users?|members?|team members)\b/i],
      ["AI generation cap", /\b\d+\s*(?:ai\s*)?(?:generations?|credits?|prompts?)\s*(?:\/|per)\s*month\b/i],
      ["per-seat surcharge", /\+\s*\$\d+\s*\/\s*seat/i],
      ["per-seat price", /\$\d+\s*(?:\/|per)\s*(?:seat|user|member)\b/i],
      ["metered allowance", /\bunmetered\b|\b\d+\s*(?:gb|gb\/month)\b/i],
    ];
    for (const [label, re] of forbidden) {
      assert.doesNotMatch(PRICING_SOURCE, re, `pricing copy claims a ${label}`);
    }
  });

  it("says billing is per workspace, because the code charges one unit", () => {
    const stripe = read("lib/stripe.ts");
    assert.match(
      stripe,
      /\["line_items\[0\]\[quantity\]", "1"\]/,
      "Checkout still sends a hardcoded quantity of 1"
    );
    assert.match(bySlug("team").billingNote, /per workspace/i);
    assert.match(bySlug("team").billingNote, /not per seat/i);
    assert.match(PLANS_TSX, /per workspace/);
  });

  it("publishes no price literal — every figure comes from Stripe config", () => {
    // The only number allowed in the shipped data is the free tier's $0.
    const code = stripComments(PLANS_TSX);
    const figures = code.match(/\$\d[\d,]*(?:\.\d{2})?/g) ?? [];
    assert.deepEqual(figures, ["$0"], "tier cards must not hardcode prices");
    assert.doesNotMatch(
      stripComments(PLANS),
      /\$\d/,
      "plans.ts must not carry price figures in its data"
    );
    assert.match(PAGE, /getPricesConfig\(\)/, "prices come from env at render");
    assert.match(PAGE, /formatPrice\(/, "prices render through formatPrice");
  });

  it("marks roadmap items as planned, matching PlanCard's voice", () => {
    const team = bySlug("team");
    assert.ok(team.planned && team.planned.length >= 2, "Team lists roadmap items");
    assert.match(PLANS_TSX, /— planned/, "planned items are labelled as such");
    const planCard = read("components/settings/PlanCard.tsx");
    assert.match(planCard, /planned/i, "PlanCard keeps the same qualifier");
  });

  it("routes to real destinations", () => {
    for (const tier of PLAN_TIERS) {
      if (tier.cta.href.startsWith("mailto:")) {
        assert.match(tier.cta.href, /hello@roducq\.dev/);
      } else {
        assert.match(tier.cta.href, /^\/(signup|login)/, `${tier.slug}: CTA target`);
      }
    }
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

  it("getPricingOffer lives in lib/stripe.ts and returns null when billing is off", () => {
    assert.match(STRIPE_LIB, /export function getPricingOffer/);
    assert.match(STRIPE_LIB, /if \(!billingConfigured\) return null/);
  });

  it("defaults mention no seat/quota/AI claims and point to a real code", () => {
    assert.match(STRIPE_LIB, /DEFAULT_OFFER_BADGE = "LAUNCH OFFER"/);
    assert.match(STRIPE_LIB, /DEFAULT_OFFER_CODE = "LAUNCH20"/);
    // The default text carries a percentage + duration, not a cap.
    assert.match(STRIPE_LIB, /Save 20%/);
    assert.match(STRIPE_LIB, /3 months/);
  });

  it("Checkout session enables promotion codes and hardcodes no coupon", () => {
    assert.match(
      STRIPE_LIB,
      /\["allow_promotion_codes", "true"\]/,
      "Stripe Checkout must enable the 'Add promotion code' field"
    );
    // Strip comments before the literal check — prose may legitimately
    // mention "coupon" as a category the code does NOT emit.
    assert.doesNotMatch(
      stripComments(STRIPE_LIB),
      /coupon/i,
      "no hardcoded Stripe coupon id — codes are dashboard-managed"
    );
  });

  it("env vars are documented in .env.local.example", () => {
    const envExample = read(".env.local.example");
    assert.match(envExample, /PRICING_OFFER_BADGE/);
    assert.match(envExample, /PRICING_OFFER_TEXT/);
    assert.match(envExample, /PRICING_OFFER_CODE/);
  });
});

describe("/pricing design tokens", () => {
  it("uses the token radius scale, never an arbitrary radius", () => {
    for (const [name, src] of [["plans.ts", PLANS], ["pricing-plans.tsx", PLANS_TSX], ["page.tsx", PAGE]] as const) {
      assert.doesNotMatch(src, /rounded-\[/, `${name} bypasses the radius token`);
      assert.doesNotMatch(src, /#[0-9a-fA-F]{3,6}\b/, `${name} hardcodes a hex colour`);
    }
  });

  it("renders headings in the display face (Georgia) inside an Inter body", () => {
    assert.match(PAGE, /font-display/, "hero heading uses the display stack");
    assert.match(PLANS_TSX, /font-display/, "tier names + prices use the display stack");
    const config = read("tailwind.config.ts");
    assert.match(config, /display:\s*\["Georgia"/, "display stack is Georgia-led");
    assert.match(config, /var\(--font-inter\)/, "body stack is Inter");
    const css = read("app/globals.css");
    assert.match(css, /--radius:\s*0\.35rem/, "the 0.35rem radius token");
  });

  it("keeps tap targets at or above 44px for the harness", () => {
    assert.match(PLANS_TSX, /min-h-11/, "toggle buttons clear the 44px target");
    assert.match(PAGE, /min-h-11/, "footer mailto link clears the 44px target");
  });
});
