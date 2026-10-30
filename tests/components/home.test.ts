/**
 * Landing page (Forma-referenced redesign, 2026-10-17) — structure, design
 * tokens, route integrity and the truthfulness guards that keep a landing
 * page from outgrowing the product it describes.
 *
 * Five halves.
 *
 *  1. SHAPE. The ten bands (A→J) exist, in the reference's order, and the
 *     ways into the funnel point at /signup, /vs and /pricing. The
 *     limitation callout is on the page — not buried, not implied — because
 *     roducq collects no e-signatures and takes no payments, and a landing
 *     page that forgets to say so is selling something that doesn't exist.
 *
 *  2. TOKENS. The Forma-referenced system is declared once, in
 *     app/(marketing)/landing.css, and mirrored once, in tailwind.config.ts.
 *     No landing component hardcodes a hex colour, a font-size or a shadow:
 *     these tests fail if a visual value escapes the token layer, because
 *     that is exactly how a redesign stops being a system.
 *
 *  3. TRUTHFULNESS. Every string a visitor reads lives in a data module and
 *     is asserted here: no invented customer counts, no invented numbers
 *     (only the three approved monthly plan prices are shown, sourced from
 *     the pricing presentation module), and every mention of signatures,
 *     cards, payments or accounting is either inside LIMITATION or is an
 *     explicit negation of the capability.
 *
 *  4. ROUTES. Every href the landing surface publishes resolves to a file
 *     under app/. A footer or a nav link is the easiest 404 on a site to
 *     ship, and the cheapest to catch statically.
 *
 *  5. RESPONSIVE + A11Y. No fixed width that can overflow a 320px viewport,
 *     one container token for every band, decorative icons hidden from
 *     assistive tech, and 44px tap targets on inline links.
 *
 * Source-level + real imports, like tests/components/pricing.test.ts:
 * node:test, zero test deps.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  ANNOUNCEMENT,
  HOME_ANNOUNCEMENT,
  HOME_CLOSING,
  HOME_FOOTER_CTA,
  CONNECTS_WITH,
  ENGAGEMENT_PANEL,
  FAQ,
  FAQ_SECTION,
  FEATURE_BLOCKS,
  FEATURES_SECTION,
  FOOTER,
  HERO,
  INTEGRATION_CARDS,
  INTEGRATIONS_SECTION,
  LIMITATION,
  ONBOARDING_CHECKLIST,
  PRICING_SECTION,
  STEPS,
  STEPS_SECTION,
  TEAM_CARDS,
  TEAMS_SECTION,
  TONE_CHIP_CLASS,
  TONE_RULE_CLASS,
} from "../../app/(marketing)/home/content.ts";
import { PRICING_CARDS, PRICING_DISCLOSURE } from "../../app/(marketing)/pricing/pricing-content.ts";
import { VS_PAGE_LIST } from "../../app/(marketing)/vs/[slug]/vs-pages.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const PAGE = read("app/(marketing)/page.tsx");
const LAYOUT = read("app/(marketing)/layout.tsx");
const CONTENT = read("app/(marketing)/home/content.ts");
const TOKENS = read("app/(marketing)/landing.css");
const CONFIG = read("tailwind.config.ts");
const HARNESS = read("scripts/verify-responsive.mjs");
const SHOTS = read("scripts/build-home-screenshots.py");

const LANDING_DIR = new URL("../../components/marketing/landing/", import.meta.url);
const LANDING_FILES = readdirSync(LANDING_DIR)
  .filter((f) => f.endsWith(".tsx"))
  .sort();
const LANDING = LANDING_FILES.map((f) => read(`components/marketing/landing/${f}`));
const HEADER = read("components/marketing/SiteHeader.tsx");
const FOOTER_TSX = read("components/marketing/SiteFooter.tsx");

/** Every landing source file the redesign owns, page and shell included. */
const ALL_SOURCES: [string, string][] = [
  ["app/(marketing)/page.tsx", PAGE],
  ["app/(marketing)/layout.tsx", LAYOUT],
  ["components/marketing/SiteHeader.tsx", HEADER],
  ["components/marketing/SiteFooter.tsx", FOOTER_TSX],
  ["components/marketing/FooterAccountCta.tsx", read("components/marketing/FooterAccountCta.tsx")],
  ...LANDING_FILES.map((f) => [`components/marketing/landing/${f}`, read(`components/marketing/landing/${f}`)] as [string, string]),
];

/**
 * Source with comments removed. The design-token and pricing guards are
 * about what the code does; a comment that mentions a colour or a billing
 * interval to explain why one is absent must not trip them.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}

/**
 * Every string in a section object, flattened. Used by the truthfulness
 * block to sweep the actual copy rather than the source text, so prose in
 * comments can't hide a claim the tests didn't mean to allow.
 */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === "object")
    for (const v of Object.values(value)) strings(v, out);
  return out;
}

const ALL_COPY = strings([
  HOME_ANNOUNCEMENT,
  HERO,
  CONNECTS_WITH,
  FEATURES_SECTION,
  FEATURE_BLOCKS,
  STEPS_SECTION,
  STEPS,
  ENGAGEMENT_PANEL,
  ONBOARDING_CHECKLIST,
  INTEGRATIONS_SECTION,
  INTEGRATION_CARDS,
  TEAMS_SECTION,
  TEAM_CARDS,
  PRICING_SECTION,
  PRICING_CARDS,
  PRICING_DISCLOSURE,
  FAQ_SECTION,
  FAQ,
  HOME_CLOSING,
  LIMITATION,
  { ...FOOTER, cta: HOME_FOOTER_CTA },
]);

const LIMITATION_COPY = strings(LIMITATION);

/* ── Shape: sections A → J ──────────────────────────────────────────────── */

describe("/ landing structure", () => {
  it("renders every band, in the reference's order", () => {
    // The announcement band and the header live in the shared layout; the
    // rest are composed by the page in order.
    const layoutMarkers = ["A. Announcement", "B. SiteHeader"];
    for (const marker of layoutMarkers) {
      assert.ok(
        PAGE.includes(marker),
        `page.tsx no longer documents "${marker}" in its section map`,
      );
    }

    const pageMarkers = [
      "C. Hero",
      "D. Features",
      "E. Getting started",
      "F. Integrations",
      "G. Teams",
      "H. Pricing",
      "I. FAQ",
      "J. Closing CTA",
    ];
    let at = -1;
    for (const marker of pageMarkers) {
      const found = PAGE.indexOf(marker, at + 1);
      assert.notEqual(found, -1, `page is missing section "${marker}"`);
      assert.ok(found > at, `section "${marker}" is out of order`);
      at = found;
    }
  });

  it("mounts the bands in that order, not just documents them", () => {
    const components = [
      "HeroSection",
      "FeaturesSection",
      "StepsSection",
      "IntegrationsSection",
      "TeamsSection",
      "PricingSection",
      "FaqAccordion",
      "FinalCta",
    ];
    let at = -1;
    for (const name of components) {
      const found = PAGE.indexOf(`<${name}`, at + 1);
      assert.notEqual(found, -1, `page never renders <${name}>`);
      assert.ok(found > at, `<${name}> is rendered out of order`);
      at = found;
    }
  });

  it("documents the band order in the content module too", () => {
    assert.match(CONTENT, /A\s+Announcement/);
    assert.match(CONTENT, /J\s+Final CTA/);
  });

  it("keeps the landing page a server component", () => {
    assert.doesNotMatch(PAGE, /"use client"/);
    assert.doesNotMatch(PAGE, /useState|useEffect|onClick/);
  });

  it("puts the only client interactivity in the reveal and the shell", () => {
    const client = LANDING_FILES.filter((f) =>
      read(`components/marketing/landing/${f}`).includes('"use client"'),
    );
    assert.deepEqual(
      client,
      ["PipelineSVG.tsx", "Reveal.tsx"],
      "only the scroll-reveal wrapper and pipeline SVG may be client components in the landing set",
    );
  });

  it("names its components the way the redesign spec asks", () => {
    for (const name of [
      "HeroSection.tsx",
      "Buttons.tsx",
      "SectionHeading.tsx",
      "FeatureVisual.tsx",
      "FeaturesSection.tsx",
      "WorkspacePreview.tsx",
      "PricingSection.tsx",
      "FaqAccordion.tsx",
      "FinalCta.tsx",
      "Reveal.tsx",
    ]) {
      assert.ok(LANDING_FILES.includes(name), `missing components/marketing/landing/${name}`);
    }
    assert.match(read("components/marketing/landing/Buttons.tsx"), /export function PrimaryLink/);
    assert.match(read("components/marketing/landing/Buttons.tsx"), /export function SecondaryLink/);
  });
});

/* ── Hero (C) ───────────────────────────────────────────────────────────── */

describe("/ hero", () => {
  it("has an eyebrow, a two-line H1 and supporting copy", () => {
    assert.ok(HERO.eyebrow.trim(), "eyebrow");
    assert.equal(HERO.titleLines.length, 2, "the reference sets two masked lines");
    assert.ok(HERO.intro.length > 120, "intro should explain the product");
    assert.ok(HERO.note.trim(), "note under the CTAs");
  });

  it("renders the H1 from the content module, not a literal", () => {
    const hero = read("components/marketing/landing/HeroSection.tsx");
    assert.match(hero, /HERO\.titleLines\.map/);
    assert.match(hero, /<h1[^>]*>/);
    assert.doesNotMatch(
      hero,
      /The workspace that does the client writing for you/,
      "hero copy belongs in content.ts, not duplicated in the component",
    );
  });

  it("keeps the three visual lines equal to the accessible sentence", () => {
    assert.equal(
      HERO.titleLines.join(" ").replace(/\s+/g, " ").trim(),
      HERO.title.replace(/\s+/g, " ").trim(),
      "the masked lines must spell the same sentence a screen reader reads",
    );
  });

  it("accents a word that actually appears in one of the lines", () => {
    assert.ok(
      HERO.titleLines.some((line) => line.includes(HERO.emphasis)),
      `emphasis "${HERO.emphasis}" is not in any headline line`,
    );
  });

  it("has exactly two hero CTAs, to /signup and /solutions", () => {
    assert.equal(HERO.primaryCta.href, "/signup");
    assert.equal(HERO.secondaryCta.href, "/solutions");
    assert.ok(HERO.primaryCta.label.trim(), "primary CTA label");
    assert.ok(HERO.secondaryCta.label.trim(), "secondary CTA label");
    const hero = read("components/marketing/landing/HeroSection.tsx");
    assert.match(hero, /href=\{HERO\.primaryCta\.href\}/);
    assert.match(hero, /href=\{HERO\.secondaryCta\.href\}/);
  });

  it("labels the product frame as illustrative, not a live account", () => {
    const frame = read("components/marketing/landing/WorkspacePreview.tsx");
    assert.match(frame, /role="img"/);
    assert.match(frame, /aria-label="Illustrative roducq workspace/);
    // Sixty-odd mock nodes are noise to a screen reader; the innards are
    // hidden so the frame is announced as the single image it is.
    assert.ok(
      (frame.match(/aria-hidden="true"/g) ?? []).length >= 3,
      "the mock's inner regions should be hidden from assistive tech",
    );
  });

  it("advertises only connectors that exist in the code", () => {
    const sources = ["lib/integrations/handler.ts", "lib/webhooks.ts", "lib/pdf/layout.ts"];
    for (const path of sources) {
      assert.ok(existsSync(new URL(`../../${path}`, import.meta.url)), `missing ${path}`);
    }
    assert.ok(existsSync(new URL("../../app/api/email/connect/route.ts", import.meta.url)));
    assert.ok(existsSync(new URL("../../app/api/slack/connect/route.ts", import.meta.url)));
    assert.ok(existsSync(new URL("../../app/api/notion/connect/route.ts", import.meta.url)));
    assert.ok(CONNECTS_WITH.items.length >= 4, "the strip should show real breadth");
  });
});

/* ── Features (D), steps (E), integrations (F), teams (G) ───────────────── */

describe("/ feature bands", () => {
  it("is four jobs, each with its own visual", () => {
    assert.equal(FEATURE_BLOCKS.length, 4);
    const visual = read("components/marketing/landing/FeatureVisual.tsx");
    assert.equal(
      (visual.match(/export function \w+Visual\(/g) ?? []).length,
      FEATURE_BLOCKS.length,
      "every job needs a visual of its own",
    );
    for (const block of FEATURE_BLOCKS) {
      assert.ok(block.copy.length > 60, `${block.label}: needs real copy`);
      assert.ok(block.tone in TONE_CHIP_CLASS, `${block.label}: unknown tone`);
      assert.ok(block.tone in TONE_RULE_CLASS, `${block.label}: unknown tone`);
    }
  });

  it("renders the features as semantic articles in a four-column card grid", () => {
    const features = read("components/marketing/landing/FeaturesSection.tsx");
    assert.match(features, /as="article"/);
    assert.match(features, /lg:grid-cols-4/);
  });

  it("does not present webhooks as an automation engine", () => {
    const content = strings([FEATURE_BLOCKS, INTEGRATION_CARDS, FAQ]).join(" ");
    assert.doesNotMatch(content, /writes itself|queue the first update|notify the client channel/i);
    assert.ok(existsSync(new URL("../../lib/webhook-dispatch.ts", import.meta.url)));
    assert.match(INTEGRATION_CARDS.find((card) => card.name === "Webhooks")?.copy ?? "", /signed outbound events/i);
  });

  it("three steps, numbered, each with capability chips", () => {
    assert.equal(STEPS.length, 3);
    assert.deepEqual(STEPS.map((s) => s.index), ["1", "2", "3"]);
    for (const step of STEPS) {
      assert.ok(step.copy.length > 60, `${step.title}: needs real copy`);
      assert.ok(step.chips.length >= 3, `${step.title}: chips should be specific`);
    }
  });

  it("the steps band renders an ordered list, because order is the point", () => {
    const steps = read("components/marketing/landing/StepsSection.tsx");
    assert.match(steps, /<ol[\s\S]*?STEPS\.map[\s\S]*?<\/ol>/);
  });

  it("the engagement panel does not pretend to be a calendar product", () => {
    // roducq ships no calendar. The panel shows the pipeline's real stage
    // sequence instead; if a scheduling feature lands, this guard should be
    // replaced with one that asserts it.
    const copy = strings([ENGAGEMENT_PANEL, STEPS_SECTION]).join(" ");
    assert.doesNotMatch(copy, /\bcalendar\b/i, "roducq has no calendar feature to claim");
    assert.ok(ENGAGEMENT_PANEL.events.length >= 3);
  });

  it("every integration card maps to a real surface in a 3x2 grid", () => {
    assert.equal(INTEGRATION_CARDS.length, 6);
    assert.match(read("components/marketing/landing/IntegrationsSection.tsx"), /lg:grid-cols-3/);
    const names = INTEGRATION_CARDS.map((c) => c.name);
    assert.equal(new Set(names).size, names.length, "no duplicate cards");
    for (const card of INTEGRATION_CARDS) {
      assert.ok(card.copy.length > 25, `${card.name}: needs a real line`);
      assert.ok(card.tone in TONE_CHIP_CLASS, `${card.name}: unknown tone`);
      assert.doesNotMatch(card.copy, /coming soon|roadmap|planned/i, `${card.name}: don't advertise a connector that doesn't exist`);
    }
  });

  it("the teams band renders a four-column divided layout with miniature UI previews and publishes no named customers", () => {
    assert.equal(TEAM_CARDS.length, 4);
    assert.deepEqual(TEAM_CARDS.map((c) => c.index), ["01", "02", "03", "04"]);
    const teamsSource = read("components/marketing/landing/TeamsSection.tsx");
    assert.match(teamsSource, /lg:grid-cols-4/);
    assert.match(teamsSource, /lg:divide-x/);
    assert.match(teamsSource, /TeamMiniPreview/);
    const copy = strings([TEAM_CARDS, TEAMS_SECTION]).join(" ");
    assert.doesNotMatch(copy, /testimonial|customer story|case study/i);
    for (const card of TEAM_CARDS) {
      assert.match(card.workflow, /^Workflow: /, `${card.label}: workflow line`);
      assert.ok(card.copy.length > 60, `${card.label}: needs real copy`);
    }
  });
});

/* ── Pricing (H) ────────────────────────────────────────────────────────── */

describe("/ pricing band", () => {
  it("keeps three approved commercial plans and a non-plan fourth column", () => {
    const pricing = read("components/marketing/landing/PricingSection.tsx");
    assert.match(pricing, /PRICING_CARDS\.map/);
    assert.match(pricing, /lg:grid-cols-4/);
    assert.match(pricing, /ContactPanel/);
    assert.match(pricing, /lm-pricing-dark/);
    assert.deepEqual(PRICING_CARDS.map((plan) => plan.name), ["Starter", "Team", "Studio"]);
    assert.equal(PRICING_CARDS.filter((plan) => plan.featured).length, 1);
    assert.equal(PRICING_CARDS.find((plan) => plan.featured)?.badge, "MOST POPULAR");
    assert.doesNotMatch(pricing, /Enterprise/);
  });

  it("renders the approved monthly amounts and seat terms from the pricing-page presentation", () => {
    assert.deepEqual(PRICING_CARDS.map((plan) => plan.price), ["$29", "$79", "$199"]);
    assert.deepEqual(PRICING_CARDS.map((plan) => plan.cadence), ["/ month", "/ month", "/ month"]);
    assert.equal(PRICING_CARDS[0].seats, "1 seat");
    assert.match(PRICING_CARDS[1].seats, /Up to 5 seats/);
    assert.match(PRICING_CARDS[1].seats, /\+\$12/);
    assert.match(PRICING_CARDS[2].seats, /Up to 15 seats/);
    assert.equal(PRICING_CARDS[0].cta.href, "/signup");
    assert.equal(PRICING_CARDS[1].cta.href, "/signup");
    assert.equal(PRICING_CARDS[2].cta.href, "mailto:contact@nanexi.com?subject=roducq%20Studio%20enquiry");
  });

  it("prints every approved billing and enforcement disclosure on the homepage", () => {
    const pricing = read("components/marketing/landing/PricingSection.tsx");
    assert.match(pricing, /PRICING_DISCLOSURE\.map/);
    assert.match(PRICING_DISCLOSURE.join(" "), /Annual checkout is not available/i);
    assert.match(PRICING_DISCLOSURE.join(" "), /brief and seat limits are not currently enforced/i);
    assert.match(PRICING_DISCLOSURE.join(" "), /Additional-seat billing is not currently implemented/i);
    assert.match(PRICING_DISCLOSURE.join(" "), /does not purchase or activate a paid plan/i);
    assert.doesNotMatch(pricing, /Razorpay|priceLines|billingConfigured/);
  });

  it("links the price details to the approved pricing route", () => {
    assert.equal(PRICING_SECTION.cta.href, "/pricing");
  });
});

/* ── FAQ (I) ────────────────────────────────────────────────────────────── */

describe("/ FAQ", () => {
  it("answers the six questions with real mechanics", () => {
    assert.equal(FAQ.length, 6);
    const questions = FAQ.map((f) => f.q);
    assert.equal(new Set(questions).size, questions.length, "no duplicate questions");
    for (const item of FAQ) {
      assert.ok(item.a.length > 80, `"${item.q}" needs a real answer`);
    }
  });

  it("is a native disclosure, so it works without JavaScript", () => {
    const faq = read("components/marketing/landing/FaqAccordion.tsx");
    assert.match(faq, /<details/);
    assert.match(faq, /<summary/);
    assert.match(faq, /min-h-11/, "the summary is a 44px tap target");
    assert.doesNotMatch(faq, /"use client"/, "no client bundle for six disclosures");
  });

  it("links to a contact address rather than a form that doesn't exist", () => {
    assert.match(FAQ_SECTION.contact.href, /^mailto:/);
  });
});

/* ── The limitation callout (J) ─────────────────────────────────────────── */

describe("/ limitation callout", () => {
  it("states the limits in the words the product ships", () => {
    assert.equal(
      LIMITATION.summary,
      "no e-signature, no payment collection",
      "the short-form limits line is quoted across the marketing surface",
    );
  });

  it("explains what happens instead of each one", () => {
    assert.match(LIMITATION.detail, /signature/i, "says what a signed contract is");
    assert.match(LIMITATION.detail, /card|payment/i, "says who collects the money");
    assert.match(LIMITATION.detail, /accounting/i, "roducq does not run accounting");
    assert.ok(LIMITATION.detail.length > 150, "the detail should actually explain");
  });

  it("is rendered as a labelled, test-addressable note", () => {
    const cta = read("components/marketing/landing/FinalCta.tsx");
    assert.match(cta, /data-testid="home-limitation"/);
    assert.match(cta, /role="note"/);
    assert.match(cta, /aria-label=\{LIMITATION\.title\}/);
    assert.match(cta, /\{LIMITATION\.summary\}/);
    assert.match(cta, /\{LIMITATION\.detail\}/);
  });

  it("points the reader at the comparisons for the long version", () => {
    assert.equal(LIMITATION.href, "/vs");
    const cta = read("components/marketing/landing/FinalCta.tsx");
    assert.match(cta, /href=\{LIMITATION\.href\}/);
    assert.ok(LIMITATION.hrefLabel.trim(), "the link needs a label");
  });

  it("closes the page inside the final CTA band, after the actions", () => {
    const cta = read("components/marketing/landing/FinalCta.tsx");
    const action = cta.indexOf("HOME_CLOSING.primaryCta.href");
    const callout = cta.indexOf("home-limitation");
    assert.ok(action > -1 && callout > action, "callout belongs after the closing actions");
  });

  it("the closing headline spells the same sentence as its accessible title", () => {
    assert.equal(
      HOME_CLOSING.lines.join(" ").replace(/\s+/g, " ").trim(),
      HOME_CLOSING.title.replace(/\s+/g, " ").trim(),
    );
  });
});

/* ── Truthfulness ───────────────────────────────────────────────────────── */

describe("/ landing truthfulness", () => {
  it("publishes no invented customer, team or usage numbers", () => {
    for (const line of ALL_COPY) {
      assert.doesNotMatch(
        line,
        /\b\d[\d,]*\+?\s*(?:customers?|users?|teams?|companies|freelancers|studios|hours saved|integrations?)\b/i,
        `invented social proof: "${line}"`,
      );
      assert.doesNotMatch(line, /\b\d+[kKmM]\+/, `rounded vanity metric: "${line}"`);
      assert.doesNotMatch(line, /\b\d+%/, `unsupported percentage: "${line}"`);
    }
  });

  it("publishes only the three approved monthly prices and no fabricated tier", () => {
    const figures = ALL_COPY.join("\n").match(/\$\d[\d,]*(?:\.\d{2})?/g) ?? [];
    assert.deepEqual(figures.filter((price) => ["$29", "$79", "$199"].includes(price)), ["$29", "$79", "$199"]);
    assert.doesNotMatch(ALL_COPY.join(" "), /\b(?:Free|Enterprise) plan\b/i);
    assert.doesNotMatch(ALL_COPY.join(" "), /annual discount|save \d+%/i);
    const pricing = read("components/marketing/landing/PricingSection.tsx");
    assert.match(pricing, /PRICING_CARDS/);
    assert.doesNotMatch(pricing, /priceLines|PRICES_UNCONFIGURED_NOTE/);
  });

  it("every signature / payment / accounting mention is a denial or the limits", () => {
    // The redesign keeps the reference's shape but adds two FAQ answers that
    // mention these words precisely in order to say roducq does NOT do them.
    // A bare mention is still a failure; a negated one is the point.
    const NEGATION = /\b(no|not|never|doesn't|does not|don't|without|isn't|is not)\b/i;
    // An FAQ *question* may name a capability in order to ask about it —
    // but only if its answer denies it, which the next test asserts.
    const QUESTIONS = new Set(FAQ.map((item) => item.q));
    for (const line of ALL_COPY) {
      if (QUESTIONS.has(line)) continue;
      if (!/signature|e-sign|card|payment|accounting/i.test(line)) continue;
      const inLimits = LIMITATION_COPY.includes(line);
      assert.ok(
        inLimits || NEGATION.test(line),
        `copy about money or signatures must live in LIMITATION or deny the capability: "${line}"`,
      );
    }
    assert.ok(LIMITATION_COPY.length > 0, "LIMITATION must not be empty");
  });

  it("every FAQ question about money or signatures is answered with a denial", () => {
    const NEGATION = /\b(no|not|never|doesn't|does not|don't|without|isn't|is not)\b/i;
    const moneyQuestions = FAQ.filter((item) =>
      /signature|e-sign|card|payment|accounting/i.test(item.q),
    );
    assert.ok(moneyQuestions.length >= 1, "the FAQ should answer the limits outright");
    for (const item of moneyQuestions) {
      assert.match(
        item.a,
        NEGATION,
        `"${item.q}" asks about a limit but the answer never denies it`,
      );
    }
  });

  it("does not claim to do the things it just disclaimed", () => {
    for (const line of ALL_COPY) {
      assert.doesNotMatch(
        line,
        /\b(?:we|roducq)\s+(?:will\s+)?(?:collect|take|process|capture)\s+(?:e-?signatures?|payments?|cards?)\b/i,
        `claims a capability the product does not have: "${line}"`,
      );
    }
  });

  it("the metadata description repeats the limits, so search snippets do too", () => {
    const metadata = PAGE.slice(0, PAGE.indexOf("export default"));
    assert.match(metadata, /does not collect e-signatures/i);
    assert.match(metadata, /payments/i);
  });

  it("claims only capabilities the repo actually ships", () => {
    for (const path of [
      "app/(app)/intake/page.tsx",
      "app/(app)/briefs/page.tsx",
      "app/(app)/proposals/page.tsx",
      "app/(app)/plans/page.tsx",
      "app/(app)/updates/page.tsx",
      "app/(app)/invoices/page.tsx",
      "app/(app)/contracts/page.tsx",
      "app/(app)/time/page.tsx",
      "app/(app)/reports/page.tsx",
      "app/(app)/search/page.tsx",
      "lib/proposal-versions.ts",
      "lib/webhook-dispatch.ts",
      "lib/invoice-sharing.ts",
    ]) {
      assert.ok(
        existsSync(new URL(`../../${path}`, import.meta.url)),
        `landing copy claims a surface that does not exist: ${path}`,
      );
    }
  });
});

/* ── Design tokens ──────────────────────────────────────────────────────── */

describe("/ landing design tokens", () => {
  /** The reference's published palette, as declared in landing.css. */
  const REFERENCE_TOKENS: Record<string, string> = {
    "--lm-canvas": "#f9f7fc",
    "--lm-canvas-alt": "#f2eef8",
    "--lm-mint": "#e7f7ed",
    "--lm-surface-muted": "#eae6f1",
    "--lm-surface-accent": "#efebff",
    "--lm-surface-neutral": "#d1d5df",
    "--lm-ink": "#1b1426",
    "--lm-ink-soft": "#4b505f",
    "--lm-ink-accent": "#5332d6",
    "--lm-muted": "#7a659f",
    "--lm-muted-alt": "#7e66a7",
    "--lm-muted-slate": "#687083",
    "--lm-muted-sage": "#969e99",
    "--lm-muted-gray": "#9ba4b6",
    "--lm-accent": "#6246ea",
    "--lm-accent-strong": "#5b3fe0",
    "--lm-accent-line": "#7f67e6",
    "--lm-success": "#15803d",
    "--lm-border": "#ddd6ea", /* Forma reference: --border */
  };

  it("declares the reference palette exactly once, scoped to the shell", () => {
    for (const [name, value] of Object.entries(REFERENCE_TOKENS)) {
      const declared = TOKENS.match(
        new RegExp(`^\\s*${name}:\\s*([^;]+);`, "m"),
      );
      assert.ok(declared, `landing.css does not declare ${name}`);
      assert.equal(
        declared![1].trim().toLowerCase(),
        value,
        `${name} drifted from the reference value`,
      );
    }
    assert.match(TOKENS, /^\.rdq-marketing \{/m, "tokens must be scoped, not global");
    assert.doesNotMatch(
      TOKENS,
      /^:root \{/m,
      "the landing tokens must not leak into :root and repaint the app",
    );
  });

  it("publishes the reference's type scale, radii and shadows", () => {
    // The measured reference scale (docs/FORMA_FINAL_FIDELITY_AUDIT.md §4).
    // The 29px and 64px steps this replaced were estimates; the reference's
    // real display sizes are 43 / 48 / 72px for the hero headline and
    // 32 / 34 / 54px for a section heading.
    for (const size of [
      "10", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22",
      "23", "28", "32", "34", "36", "43", "46", "48", "54", "64", "72",
    ]) {
      assert.match(TOKENS, new RegExp(`--lm-size-${size}:\\s*${size}px`), `missing ${size}px step`);
      assert.match(CONFIG, new RegExp(`"lm-${size}":\\s*\\["var\\(--lm-size-${size}\\)"`), `tailwind has no text-lm-${size}`);
    }
    for (const [name, value] of [
      ["--lm-radius-hair", "2px"],
      ["--lm-radius-tile", "3px"],
      ["--lm-radius-chip", "4px"],
      ["--lm-radius-control", "5px"],
      ["--lm-radius-row", "8px"],
      ["--lm-radius-panel", "10px"],
      // The reference's action buttons measure a 10px corner radius.
      ["--lm-radius-button", "10px"],
      ["--lm-radius-card", "14px"],
      ["--lm-radius-frame", "16px"],
      ["--lm-radius-pill", "999px"],
      ["--lm-radius-dot", "50%"],
    ]) {
      assert.match(TOKENS, new RegExp(`${name}:\\s*${value.replace("%", "\\%")}`), `missing ${name}`);
    }
    for (const shadow of ["--lm-shadow-sm", "--lm-shadow-md", "--lm-shadow-lg"]) {
      assert.match(TOKENS, new RegExp(`${shadow}:`), `missing ${shadow}`);
    }
  });

  it("carries the reference's font stack and fallbacks", () => {
    assert.match(TOKENS, /--lm-font:[^;]*var\(--font-manrope\)/);
    assert.match(TOKENS, /"Manrope"/);
    assert.match(TOKENS, /"Arimo"/);
    assert.match(TOKENS, /"DM Sans"/);
    assert.match(TOKENS, /font-family: var\(--lm-font\)/);
    // Manrope is self-hosted by the root layout; the landing shell must not
    // reach for a font CDN.
    for (const [, source] of ALL_SOURCES) {
      assert.doesNotMatch(source, /fonts\.(googleapis|gstatic)\.com/);
    }
  });

  it("fills the gaps in the reference's spacing scale in the config", () => {
    // 3/5/13/15/18/22/26/30px have no Tailwind default; the config adds them
    // so no component reaches for an arbitrary value.
    for (const px of ["3px", "5px", "13px", "15px", "18px", "22px", "26px", "30px"]) {
      assert.match(CONFIG, new RegExp(`:\\s*"${px}"`), `tailwind spacing is missing ${px}`);
    }
  });

  it("scopes every landing class to a token — no hardcoded visual values", () => {
    for (const [file, source] of ALL_SOURCES) {
      const body = code(source);
      assert.doesNotMatch(body, /#[0-9a-fA-F]{3,8}\b/, `${file} hardcodes a hex colour`);
      assert.doesNotMatch(body, /rounded-\[/, `${file} bypasses the radius tokens`);
      assert.doesNotMatch(body, /shadow-\[/, `${file} bypasses the shadow tokens`);
      assert.doesNotMatch(body, /text-\[\d+px\]/, `${file} bypasses the type scale`);
      assert.doesNotMatch(body, /rgba?\(/, `${file} hardcodes a colour literal`);
    }
  });

  it("never builds a Tailwind class at runtime", () => {
    for (const [file, source] of ALL_SOURCES) {
      assert.doesNotMatch(
        source,
        /className=\{`/,
        `${file} interpolates a className — use an explicit class map instead`,
      );
      assert.doesNotMatch(source, /className=\{[^}]*\$\{/, file);
    }
  });

  it("per-item colour comes from explicit Tone → class maps", () => {
    for (const [name, map] of [
      ["TONE_CHIP_CLASS", TONE_CHIP_CLASS],
      ["TONE_RULE_CLASS", TONE_RULE_CLASS],
    ] as const) {
      assert.match(
        CONTENT,
        new RegExp(`export const ${name}: Record<Tone, string> = \\{`),
        `${name} must be a total Record<Tone, string>`,
      );
      for (const [tone, classes] of Object.entries(map)) {
        assert.ok(classes.trim(), `${name}.${tone} is empty`);
        for (const token of classes.split(/\s+/)) {
          assert.ok(token.length > 0, `${name}.${tone} has a blank token`);
          assert.ok(
            /^(bg|text|border)-[a-z0-9-]+$/.test(token),
            `${name}.${tone}: "${token}" is not a plain Tailwind token`,
          );
        }
      }
    }
  });

  it("covers every tone the data actually uses", () => {
    const used = new Set<string>([
      ...FEATURE_BLOCKS.map((f) => f.tone),
      ...INTEGRATION_CARDS.map((c) => c.tone),
    ]);
    for (const tone of used) {
      assert.ok(tone in TONE_CHIP_CLASS, `tone "${tone}" has no chip class`);
      assert.ok(tone in TONE_RULE_CLASS, `tone "${tone}" has no rule class`);
    }
  });

  it("adapts the same token names for dark mode instead of a second palette", () => {
    assert.match(TOKENS, /\.dark \.rdq-marketing \{/);
    const darkBlock = TOKENS.slice(TOKENS.indexOf(".dark .rdq-marketing {"));
    for (const name of ["--lm-canvas", "--lm-card", "--lm-ink", "--lm-accent", "--lm-border"]) {
      assert.match(darkBlock, new RegExp(`${name}:`), `${name} has no dark value`);
    }
  });

  it("one container for every band", () => {
    // 1320px of shell with a 40px desktop gutter gives the reference's
    // measured 1240px content column at a 1440px viewport.
    assert.match(TOKENS, /--lm-container:\s*1320px/);
    assert.match(TOKENS, /\.lm-shell \{/);
    for (const file of ["HeroSection", "FeaturesSection", "StepsSection", "IntegrationsSection", "TeamsSection", "PricingSection", "FaqAccordion", "FinalCta"]) {
      const source = read(`components/marketing/landing/${file}.tsx`);
      assert.match(source, /lm-shell/, `${file} does not use the shared container`);
      assert.doesNotMatch(source, /max-w-7xl/, `${file} uses the app's container instead of the landing one`);
    }
    assert.match(HEADER, /lm-shell/);
    assert.match(FOOTER_TSX, /lm-shell/);
  });
});

/* ── Contrast ───────────────────────────────────────────────────────────── */

describe("/ landing colour contrast", () => {
  /** WCAG 2.1 relative luminance. */
  function luminance(hex: string): number {
    const clean = hex.replace("#", "");
    const channels = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
    const [r, g, b] = channels.map((c) =>
      c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(foreground: string, background: string): number {
    const [a, b] = [luminance(foreground), luminance(background)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  }

  /** Read a light-mode token's literal value out of the scoped block. */
  function token(name: string): string {
    const match = TOKENS.match(new RegExp(`^\\s*${name}:\\s*(#[0-9a-fA-F]{6});`, "m"));
    assert.ok(match, `landing.css does not declare a literal ${name}`);
    return match![1];
  }

  const WASHES = ["--lm-canvas", "--lm-canvas-alt", "--lm-card"];

  it("every text colour clears 4.5:1 on every landing background", () => {
    // Secondary text is the usual casualty of a pale palette: the reference's
    // #7a659f is 4.38:1 on its deeper wash, which is why this surface uses
    // the nudged `--lm-muted-readable` / `--lm-muted-label` steps for copy.
    const textTokens = [
      "--lm-ink",
      "--lm-ink-soft",
      "--lm-ink-accent",
      "--lm-muted-readable",
      "--lm-muted-label",
    ];
    for (const fg of textTokens) {
      for (const bg of WASHES) {
        const ratio = contrast(token(fg), token(bg));
        assert.ok(
          ratio >= 4.5,
          `${fg} on ${bg} is ${ratio.toFixed(2)}:1 — below the 4.5:1 body-text floor`,
        );
      }
    }
  });

  it("included/on-track green clears 4.5:1 on the mint panel", () => {
    const ratio = contrast(token("--lm-success"), token("--lm-mint"));
    assert.ok(ratio >= 4.5, `success on mint is ${ratio.toFixed(2)}:1`);
  });

  it("white on the primary action clears 4.5:1", () => {
    const ratio = contrast(token("--lm-on-accent"), token("--lm-accent"));
    assert.ok(ratio >= 4.5, `on-accent on accent is ${ratio.toFixed(2)}:1`);
    // ...and the hover step must not go backwards.
    assert.ok(contrast(token("--lm-on-accent"), token("--lm-accent-strong")) >= 4.5);
  });

  it("nothing meaningful is set in the decorative grey", () => {
    const ratio = contrast(token("--lm-muted-gray"), token("--lm-canvas"));
    assert.ok(ratio < 4.5, "if this ever passes, retire the comment that calls it decorative");
    for (const [file, source] of ALL_SOURCES) {
      // muted-gray may appear only inside a comment explaining that it is
      // decorative, never as a text colour.
      assert.doesNotMatch(code(source), /text-lm-muted-gray/, `${file} sets text in the decorative grey`);
    }
  });
});

/* ── Classes that would silently vanish ─────────────────────────────────── */

describe("/ landing classes all compile", () => {
  /**
   * Tailwind's default spacing scale, so the guard below can tell a step
   * that exists from one that does not. Extended steps are read out of
   * tailwind.config.ts rather than listed twice.
   */
  const DEFAULT_SPACING = new Set([
    "0", "px", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7",
    "8", "9", "10", "11", "12", "14", "16", "20", "24", "28", "32", "36", "40",
    "44", "48", "52", "56", "60", "64", "72", "80", "96",
  ]);

  function extendedSpacing(): Set<string> {
    const block = CONFIG.slice(CONFIG.indexOf("spacing: {"));
    const body = block.slice(0, block.indexOf("},"));
    const steps = new Set<string>();
    for (const match of body.matchAll(/^\s*"?([\d.]+)"?:\s*"\d+px"/gm)) {
      steps.add(match[1]);
    }
    return steps;
  }

  it("uses no opacity modifier on a token colour", () => {
    // `bg-lm-accent/45` compiles to NO rule: Tailwind cannot apply an alpha
    // to a `var()` colour, so the fill simply disappears instead of failing.
    // The translucent variants are named tokens in landing.css instead.
    for (const [file, source] of ALL_SOURCES) {
      const body = code(source);
      assert.doesNotMatch(
        body,
        /(?:bg|text|border)-lm-[a-z-]+\/\[?\d/,
        `${file} uses an opacity modifier on an --lm colour; add a named token instead`,
      );
    }
  });

  it("every spacing step it uses exists in the scale", () => {
    // `py-13` looks like a class and compiles to nothing when 13 is not a
    // step, which is how a section loses all of its vertical padding without
    // any error anywhere. The reference's 13/18/22/30px steps are declared
    // in the config; this fails the moment one is used but not declared.
    const steps = new Set([...DEFAULT_SPACING, ...extendedSpacing()]);
    const props =
      "p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|h|w|min-h|min-w|size|space-x|space-y|inset|top|bottom|left|right";
    const offenders: string[] = [];
    for (const [file, source] of ALL_SOURCES) {
      const body = code(source);
      for (const match of body.matchAll(
        new RegExp(`(?<![:\\w-])(?:[a-z]+:)*(?:${props})-([\\d.]+)(?![\\w.-])`, "g"),
      )) {
        if (!steps.has(match[1])) offenders.push(`${file}: …-${match[1]} (${match[0]})`);
      }
    }
    assert.deepEqual(offenders, [], "spacing steps missing from tailwind.config.ts");
  });

  it("declares the reference's section-rhythm steps", () => {
    const steps = extendedSpacing();
    for (const [step, px] of [["13", "52px"], ["18", "72px"], ["22", "88px"], ["30", "120px"]]) {
      assert.ok(steps.has(step), `the config does not declare spacing step ${step}`);
      assert.match(CONFIG, new RegExp(`${step}: "${px}"`), `step ${step} should be ${px}`);
    }
  });

  it("the bands actually apply that rhythm", () => {
    for (const file of ["FeaturesSection", "StepsSection", "IntegrationsSection", "TeamsSection", "PricingSection", "FaqAccordion", "FinalCta"]) {
      const source = read(`components/marketing/landing/${file}.tsx`);
      assert.match(source, /py-13 md:py-22 lg:py-30/, `${file} is missing the 52/88/120px band padding`);
    }
    assert.match(read("components/marketing/landing/HeroSection.tsx"), /pt-13 pb-16/);
    assert.match(HEADER, /h-16 items-center gap-3 md:h-18/);
  });
});

/* ── Motion ─────────────────────────────────────────────────────────────── */

describe("/ landing motion", () => {
  it("reveals with Motion.dev on the recorded curve, not a spring preset", () => {
    assert.match(TOKENS, /@keyframes lm-line-rise/);
    const manifest = JSON.parse(read("package.json"));
    assert.equal(manifest.dependencies.motion, "14.3.0");
    for (const lib of ["framer-motion", "gsap", "react-spring", "animejs"]) {
      assert.equal(manifest.dependencies[lib], undefined, `${lib} is not a dependency this page needs`);
    }
    const reveal = read("components/marketing/landing/Reveal.tsx");
    assert.match(reveal, /from "motion\/react"/);
    assert.match(reveal, /useInView/);
    assert.match(reveal, /useReducedMotion/);
    assert.match(reveal, /once: true/);
    assert.match(reveal, /duration = reduce \? 0 : compact \? 0\.42 : 0\.62/);
    assert.match(reveal, /\[0\.22, 1, 0\.36, 1\]/);
    assert.doesNotMatch(reveal, /stiffness|damping/);
    assert.match(read("components/marketing/motion/MotionProvider.tsx"), /reducedMotion="user"/);
  });

  it("never hides content from a reader without JavaScript", () => {
    // `.lm-reveal { opacity: 0 }` on its own would blank every band for a
    // no-JS visitor and for crawlers. The hidden state is gated on a marker
    // the layout adds before first paint; without it, the page is complete.
    assert.match(TOKENS, /\.lm-js \.lm-reveal \{\s*\n\s*opacity: 0;/);
    assert.doesNotMatch(
      TOKENS,
      /^\s*\.lm-reveal \{\s*\n\s*opacity: 0;/m,
      "an ungated .lm-reveal rule would hide every band without JS",
    );
    assert.match(LAYOUT, /classList\.add\('lm-js'\)/);
  });

  it("observes once and shows the end state when IntersectionObserver is absent", () => {
    const reveal = read("components/marketing/landing/Reveal.tsx");
    assert.match(reveal, /once: true/);
    assert.match(reveal, /typeof IntersectionObserver !== "undefined"/);
    assert.match(reveal, /observerSupported/);
    assert.match(reveal, /margin: "0px 0px -8% 0px"/);
    assert.match(reveal, /amount: 0\.08/);
    assert.match(
      reveal,
      /const show = inView \|\| Boolean\(reduce\) \|\| !observerSupported/,
      "reduced motion and the no-observer fallback must both resolve to visible",
    );
    assert.match(reveal, /data-visible=\{mounted && show \? "true" : "false"\}/);
  });

  it("resolves to the end state under prefers-reduced-motion", () => {
    const reduced = TOKENS.slice(TOKENS.indexOf("@media (prefers-reduced-motion: reduce)"));
    assert.match(reduced, /\.lm-reveal/, "reveals must be disabled");
    assert.match(reduced, /\.lm-line > span/, "the hero mask must be disabled");
    assert.match(reduced, /\.lm-drift/, "the decorative loop must stop");
    assert.match(reduced, /\.lm-chart-line/, "the chart draw must be disabled");
    assert.match(reduced, /\.lm-connector/, "connector draws must be disabled");
    assert.match(reduced, /details-content/, "the FAQ disclosure must not animate");
  });

  it("animates only transform and opacity", () => {
    const keyframes = TOKENS.match(/@keyframes lm-[\s\S]*?\n\}/g) ?? [];
    assert.ok(keyframes.length >= 3, "expected the three landing keyframe sets");
    for (const block of keyframes) {
      assert.doesNotMatch(
        block,
        /\b(width|height|top|left|margin|padding)\s*:/,
        `a landing keyframe animates layout: ${block.slice(0, 40)}`,
      );
    }
  });

  it("never sets opacity below a paint-visible threshold at animation start in lm-line-rise or lm-hero-in", () => {
    for (const name of ["lm-line-rise", "lm-hero-in"]) {
      const match = TOKENS.match(
        new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`),
      );
      assert.ok(match, `missing @keyframes ${name}`);
      const body = match[1];
      const fromBlock = body.match(/(?:from|0%)\s*\{([^}]*)\}/);
      assert.ok(fromBlock, `${name} must declare a from/0% keyframe`);
      const opacities = [...body.matchAll(/opacity\s*:\s*([0-9.]+)/g)].map((m) =>
        Number(m[1]),
      );
      for (const value of opacities) {
        assert.ok(
          value >= 1,
          `${name} sets opacity ${value} (< 1), which suppresses Blink LCP candidate registration`,
        );
      }
      assert.doesNotMatch(
        fromBlock[1],
        /opacity\s*:\s*0(?:\b|\.0*\b)/,
        `${name} start keyframe must not set opacity: 0`,
      );
    }
    assert.match(
      TOKENS,
      /\.rdq-marketing\s+\.animate-route-in\s*\{[^}]*opacity:\s*1;[^}]*animation:\s*none;/,
      "marketing route wrapper must not suppress initial hero opacity",
    );
    const hero = read("components/marketing/landing/HeroSection.tsx");
    assert.doesNotMatch(
      hero,
      /opacity\s*:\s*0/,
      "HeroSection.tsx must not set inline opacity: 0",
    );
  });
});

/* ── Routes ─────────────────────────────────────────────────────────────── */

describe("/ landing routes", () => {
  /** Every internal href the landing surface publishes. */
  function internalHrefs(): string[] {
    const found = new Set<string>();
    const sources = [...ALL_SOURCES.map(([, s]) => s), CONTENT, HEADER, FOOTER_TSX];
    for (const source of sources) {
      for (const match of source.matchAll(/href:\s*"(\/[^"]*)"/g)) found.add(match[1]);
    }
    // Plus the hrefs wired in the header/footer JSX.
    for (const match of HEADER.matchAll(/href="(\/[^"]*)"/g)) found.add(match[1]);
    for (const match of FOOTER_TSX.matchAll(/href="(\/[^"]*)"/g)) found.add(match[1]);
    return [...found].sort();
  }

  /** Does a route file exist for this path under app/? */
  function routeExists(path: string): boolean {
    const segments = path.split("/").filter(Boolean);
    const groups = [
      "app",
      "app/(marketing)",
      "app/(auth)",
      "app/(app)",
    ];
    for (const group of groups) {
      const candidate = join(group, ...segments, "page.tsx");
      if (existsSync(new URL(`../../${candidate}`, import.meta.url))) return true;
      // Root page: app/(marketing)/page.tsx for "/"
      if (segments.length === 0 && existsSync(new URL(`../../${group}/page.tsx`, import.meta.url))) return true;
    }
    // Dynamic-segment routes: /vs/something → app/(marketing)/vs/[slug]/page.tsx
    let dir = "app";
    for (const segment of segments) {
      const direct = join(dir, segment);
      const dynamic = readdirSync(new URL(`../../${dir}`, import.meta.url)).find(
        (entry) => entry.startsWith("[") && entry.endsWith("]"),
      );
      if (existsSync(new URL(`../../${direct}`, import.meta.url))) dir = direct;
      else if (dynamic) dir = join(dir, dynamic);
      else return false;
    }
    for (const group of ["", "/(marketing)", "/(auth)", "/(app)"]) {
      const candidate = `app${group}/${segments.join("/")}/page.tsx`;
      if (existsSync(new URL(`../../${candidate}`, import.meta.url))) return true;
    }
    return false;
  }

  it("limits homepage account/announcement copy to / while preserving the shared shell elsewhere", () => {
    const announcement = read("components/marketing/landing/AnnouncementBar.tsx");
    const footerAccount = read("components/marketing/FooterAccountCta.tsx");
    assert.ok(announcement.includes("homepage ? HOME_ANNOUNCEMENT : ANNOUNCEMENT"));
    assert.ok(HEADER.includes('<AnnouncementBar homepage={pathname === "/"} />'));
    assert.ok(footerAccount.includes('pathname === "/" ? homepageLabel : "Get started"'));
    assert.match(FOOTER_TSX, /homepageLabel=\{HOME_FOOTER_CTA\.label\}/);
    assert.equal(ANNOUNCEMENT.label, "Included on the free plan");
    assert.equal(FOOTER.cta.label, "Get started");
    assert.equal(HOME_FOOTER_CTA.label, "Create an account");
    assert.equal(HOME_ANNOUNCEMENT.label, "Client work, made clearer");
  });

  it("publishes no broken internal link", () => {
    const hrefs = internalHrefs();
    assert.ok(hrefs.length >= 6, "the landing surface should link somewhere");
    for (const href of hrefs) {
      assert.ok(routeExists(href), `no route serves ${href}`);
    }
  });

  it("keeps the funnel on the real auth routes", () => {
    assert.ok(existsSync(new URL("../../app/(auth)/login/page.tsx", import.meta.url)));
    assert.ok(existsSync(new URL("../../app/(auth)/signup/page.tsx", import.meta.url)));
    assert.match(HEADER, /href="\/login"/);
    assert.match(HEADER, /href="\/signup"/);
  });

  it("the footer columns come from the content module, not inline JSX", () => {
    assert.match(FOOTER_TSX, /FOOTER\.columns\.map/);
    for (const column of FOOTER.columns) {
      for (const link of column.links) {
        assert.ok(routeExists(link.href), `footer link ${link.href} does not resolve`);
      }
    }
  });

  it("provides an accessible back-to-top footer link", () => {
    assert.match(FOOTER_TSX, /href="#top"/);
    assert.match(FOOTER_TSX, /Back to top/);
    assert.match(LAYOUT, /id="top"/);
  });

  it("still links the /vs comparisons the hub actually serves", () => {
    assert.ok(VS_PAGE_LIST.length >= 8, "the /vs hub should have real breadth");
    for (const entry of VS_PAGE_LIST) {
      assert.ok(entry.slug.trim(), "comparison slug");
      assert.ok(entry.competitor.trim(), "comparison name");
    }
  });
});

/* ── Responsive + accessibility ─────────────────────────────────────────── */

describe("/ landing responsive + a11y", () => {
  it("uses no fixed width that can overflow a 320px viewport", () => {
    // Anything wider than 20rem that is not a max-width or a breakpoint-
    // scoped value would force a horizontal scroll on the narrowest phone.
    for (const [file, source] of ALL_SOURCES) {
      // `max-w-[...]` can never overflow; a fixed `w-`/`min-w-` can.
      for (const match of source.matchAll(
        /(?<!max-)(?<!max-)\b(?:w|min-w)-\[(\d+)(px|rem)\]/g,
      )) {
        const px = match[2] === "px" ? Number(match[1]) : Number(match[1]) * 16;
        assert.ok(
          px <= 320,
          `${file}: ${match[0]} is ${px}px wide and will overflow a 320px viewport`,
        );
      }
    }
  });

  it("scales the headline down for phones instead of clipping it", () => {
    const hero = read("components/marketing/landing/HeroSection.tsx");
    // The reference's hero headline measures 43px below 1024, 48px at 1024
    // and 72px on a wide desktop.
    assert.match(hero, /text-lm-43/, "phone step (43px)");
    assert.match(hero, /lg:text-lm-48/, "laptop step (48px)");
    assert.match(hero, /xl:text-lm-72/, "desktop step (72px)");
  });

  it("sets the display headings at the reference's measured weights and sizes", () => {
    // The reference's display type is Manrope at weight 400, not 700: the
    // 54px section heading, the 72px hero headline and the 22px feature
    // card title all measure font-weight 400 on the live site.
    const heading = read("components/marketing/landing/SectionHeading.tsx");
    assert.match(heading, /font-lm-regular/, "the section heading must be regular weight");
    assert.match(heading, /text-lm-32 lg:text-lm-34 xl:text-lm-54/);
    assert.match(heading, /variant === "faq"/, "the FAQ heading is a measured variant");
    assert.match(heading, /font-lm-semibold text-lm-32 lg:text-lm-28 xl:text-lm-48/);

    const features = read("components/marketing/landing/FeaturesSection.tsx");
    assert.match(features, /font-lm-regular tracking-\[-0\.035em\] text-lm-21/);
  });

  it("runs the connector flow at the reference's measured timing", () => {
    // `flowLinesDash` on the live reference: 1000ms, linear, infinite, and
    // no per-path delay — the lines march in step.
    assert.match(TOKENS, /lm-connector-flow 1000ms linear infinite/);
    const steps = read("components/marketing/landing/StepsSection.tsx");
    assert.doesNotMatch(steps, /--lm-connector-delay/, "connector paths must not be staggered");
  });

  it("raises section headings word by word at the measured cadence", () => {
    const heading = read("components/marketing/landing/SectionHeading.tsx");
    assert.match(heading, /WORD_STAGGER_MS = 50/);
    assert.match(heading, /lm-word/);
    assert.match(TOKENS, /--lm-motion-display:\s*900ms/);
    assert.match(TOKENS, /--lm-ease-display:\s*cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
    // The words wait for their band's scroll trigger instead of spending the
    // rise on page load, and are plain text without JavaScript.
    assert.match(TOKENS, /\.lm-js \.lm-reveal\[data-visible="true"\] \.lm-word > span/);
  });

  it("brings the hero in on the reference's measured ladder", () => {
    const hero = read("components/marketing/landing/HeroSection.tsx");
    for (const [rung, ms] of [
      ["announcement", 0],
      ["headline", 80],
      ["lead", 550],
      ["actions", 650],
      ["note", 720],
      ["connects", 800],
      ["dashboard", 850],
    ] as const) {
      assert.match(hero, new RegExp(`${rung}: ${ms},`), `${rung} rung is not ${ms}ms`);
    }
    assert.match(hero, /ladder\(HERO_LADDER\.dashboard, 1300\)/);
    assert.match(TOKENS, /--lm-ease-body:\s*cubic-bezier\(0\.2, 0\.7, 0\.2, 1\)/);
  });

  it("switches every new entrance off under reduced motion", () => {
    const reduced = TOKENS.slice(TOKENS.indexOf("@media (prefers-reduced-motion: reduce)"));
    assert.match(reduced, /\.lm-word > span/);
    assert.match(reduced, /\.lm-js \.lm-reveal\[data-visible="true"\] \.lm-word > span/);
    assert.match(reduced, /\.lm-hero-in/);
  });

  it("draws the purple frames from the reference's sampled gradient", () => {
    // Sampled from the live reference with scripts/sample-landing-pixels.mjs:
    // #36278c at the top left, #9178e6 at the top right.
    assert.match(TOKENS, /#36278c/, "the frame's dark end is missing");
    assert.match(TOKENS, /#7355e9/, "the frame's light end is missing");
  });

  it("declares the reference's breakpoint bands", () => {
    // The reference's bands: 768 for the tablet layout, 1024 for desktop.
    for (const file of LANDING_FILES) {
      const source = read(`components/marketing/landing/${file}`);
      assert.doesNotMatch(
        source,
        /\b(?:tab|desk):/,
        `${file} uses the app shell's 600px band; the marketing surface uses 768/1024`,
      );
    }
  });

  it("gives inline links and menu items a 44px tap target", () => {
    for (const [file, source] of ALL_SOURCES) {
      if (!/<Link|<a\s/.test(source)) continue;
      assert.match(source, /min-h-11|min-h-12|h-11|h-12/, `${file} has a link under 44px`);
    }
  });

  it("hides decorative icons from assistive tech", () => {
    for (const [file, source] of ALL_SOURCES) {
      const icons = (source.match(/<[A-Z][A-Za-z]*\b[^>]*\/>/g) ?? []).filter(
        (tag) => /className="h-\d/.test(tag),
      );
      for (const icon of icons) {
        assert.match(
          icon,
          /aria-hidden="true"|aria-label=/,
          `${file}: icon without an aria attribute: ${icon.slice(0, 60)}`,
        );
      }
    }
  });

  it("keeps icons on the 16/20/24 scale", () => {
    for (const [file, source] of ALL_SOURCES) {
      for (const match of source.matchAll(/className="h-(\d+) w-\d+[^"]*"/g)) {
        const size = match[1];
        assert.ok(
          size === "4" || size === "5" || size === "6",
          `${file}: off-scale icon height h-${size} — the scale is 16/20/24`,
        );
      }
    }
  });

  it("gives the mock data an illustrative label rather than reading it out", () => {
    const frame = read("components/marketing/landing/WorkspacePreview.tsx");
    assert.match(frame, /aria-label="Illustrative/);
  });

  it("the header has one labelled nav and a labelled menu trigger", () => {
    assert.match(HEADER, /aria-label="Main navigation"/);
    assert.match(HEADER, /aria-label="Open menu"/);
    assert.match(HEADER, /aria-label="Close menu"/);
    assert.match(HEADER, /aria-current=\{active\(item\.href\) \? "page" : undefined\}/);
  });

  it("keeps a skip link at the top of the shell", () => {
    assert.match(LAYOUT, /href="#main"/);
    assert.match(LAYOUT, /id="main"/);
  });
});

/* ── Screenshots + responsive harness ───────────────────────────────────── */

describe("/ landing screenshot evidence", () => {
  it("both PNGs exist and are real images", () => {
    for (const name of ["home-light.png", "home-dark.png"]) {
      const buf = readFileSync(new URL(`../../docs/screenshots/${name}`, import.meta.url));
      assert.ok(buf.length > 10_000, `${name} should be a real PNG, got ${buf.length} bytes`);
      assert.equal(buf.slice(0, 8).toString("hex"), "89504e470d0a1a0a", `${name} PNG header`);
    }
  });

  it("the builder reads copy from source instead of re-typing it", () => {
    // Re-typed copy is how docs/screenshots drifts from what / renders.
    assert.match(SHOTS, /jiti/);
    assert.match(SHOTS, /home\/content\.ts/);
    assert.match(SHOTS, /vs-pages\.ts/);
    for (const banned of [
      "The workspace that does the client writing for you",
      "Four jobs roducq takes off your plate",
    ]) {
      assert.ok(
        !SHOTS.includes(banned),
        `copy must come from content.ts, not be hardcoded in the script: "${banned}"`,
      );
    }
  });

  it("renders one shot per theme", () => {
    assert.match(SHOTS, /render\("light", DOCS \/ "home-light\.png"\)/);
    assert.match(SHOTS, /render\("dark", DOCS \/ "home-dark\.png"\)/);
  });
});

describe("/ landing design documentation", () => {
  const DOC = read("docs/RODUCQ_LANDING_DESIGN.md");

  it("exists and names the reference", () => {
    assert.match(DOC, /forma-visuvate\.framer\.website/);
    assert.match(DOC, /# roducq landing page — design system/);
  });

  it("documents every token family the code actually declares", () => {
    for (const name of ["--lm-canvas", "--lm-ink", "--lm-accent", "--lm-border", "--lm-mint"]) {
      assert.ok(DOC.includes(name), `the design doc never mentions ${name}`);
    }
    for (const size of ["10px", "12px", "14px", "16px", "18px", "22px", "29px", "54px", "64px"]) {
      assert.ok(DOC.includes(size), `the type scale table is missing ${size}`);
    }
  });

  it("records the two contrast-derived tokens and why they exist", () => {
    assert.match(DOC, /--lm-muted-readable/);
    assert.match(DOC, /--lm-muted-label/);
    assert.match(DOC, /4\.5:1/);
  });

  it("includes the structural comparison and labels its limits", () => {
    assert.match(DOC, /## 9\. Section-by-section comparison/);
    assert.match(DOC, /not a pixel comparison/i);
    // Both documented deviations must stay in the doc: they are the two
    // places this design deliberately departs from the reference.
    assert.match(DOC, /No monthly\/yearly toggle/i);
    assert.match(DOC, /No calendar in roducq/i);
  });

  it("states plainly that no browser comparison was possible", () => {
    // A report that claims pixel fidelity it did not measure is worse than
    // no report: this line is the difference between evidence and marketing.
    assert.match(DOC, /No browser screenshot comparison was possible/i);
    assert.match(DOC, /Pillow/);
    assert.match(DOC, /outstanding/i);
  });

  it("records the accessibility and motion contracts", () => {
    assert.match(DOC, /prefers-reduced-motion/);
    assert.match(DOC, /44px/);
    assert.match(DOC, /<details>\/<summary>|<details>\/<summary>/);
  });
});

describe("Forma homepage redesign records", () => {
  it("includes both the reference audit and the implementation/verification record", () => {
    const reference = read("docs/FORMA_HOMEPAGE_REDESIGN_REFERENCE.md");
    const implementation = read("docs/FORMA_HOMEPAGE_REDESIGN.md");
    assert.match(reference, /forma-visuvate\.framer\.website/);
    assert.match(reference, /No pixel-match percentage/);
    assert.match(implementation, /1,329 tests/);
    assert.match(implementation, /320, 375, 390, 768, 1024, 1200, and 1440px/);
    assert.match(implementation, /axe-core scan/);
    assert.match(implementation, /No browser evidence supports a claim of exact pixel parity/);
  });
});

describe("/ landing stays in the responsive harness", () => {
  it("the harness still audits / as a marketing route", () => {
    assert.match(
      HARNESS,
      /\{\s*slug:\s*"marketing-home",\s*url:\s*"\/",\s*auth:\s*false\s*\}/,
      "scripts/verify-responsive.mjs must keep the marketing-home route",
    );
  });
});
