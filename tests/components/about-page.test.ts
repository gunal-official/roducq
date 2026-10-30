/**
 * /about regression suite — the owner-approved Forma About recreation.
 *
 * Pins: the approved copy verbatim (content.ts), the measured
 * five-band structure and geometry bindings, the honest-claims
 * contract (nothing from the reference's company story, no invented
 * roducq facts), PR #53 LCP safety on the hero, and the labelled
 * fictional illustration. Measurements: docs/FORMA_ABOUT_REFERENCE.md.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ABOUT_CARDS,
  ABOUT_CTA,
  ABOUT_HERO,
  ABOUT_PRINCIPLES,
  ABOUT_STORY,
} from "../../app/(marketing)/about/content.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = read("app/(marketing)/about/page.tsx");
const CONTENT = read("app/(marketing)/about/content.ts");
const CSS = read("app/(marketing)/about/about.css");
const HERO = read("components/marketing/landing/about/AboutHero.tsx");
const STORY = read("components/marketing/landing/about/AboutStory.tsx");
const PRINCIPLES = read(
  "components/marketing/landing/about/AboutPrinciples.tsx"
);
const CARDS = read("components/marketing/landing/about/AboutCards.tsx");
const CTA = read("components/marketing/landing/about/AboutCta.tsx");
const ALL_PUBLIC = [PAGE, CONTENT, HERO, STORY, PRINCIPLES, CARDS, CTA]
  .map(stripComments)
  .join("\n");

describe("/about — shell and metadata are preserved", () => {
  it("delegates to the shared (marketing) layout", () => {
    assert.doesNotMatch(PAGE, /SiteHeader|SiteFooter|AnnouncementBar/);
  });

  it("keeps the published SEO metadata", () => {
    assert.match(PAGE, /export const metadata/);
    assert.match(PAGE, /title:\s*"About — roducq"/);
    assert.match(PAGE, /canonical:\s*"\/about"/);
    assert.match(PAGE, /images:\s*\[SOCIAL_IMAGE\]/);
    assert.match(PAGE, /images:\s*\[TWITTER_IMAGE\]/);
  });

  it("renders the five approved bands in reference order", () => {
    const order = [
      "<AboutHero",
      "<AboutStory",
      "<AboutPrinciples",
      "<AboutCards",
      "<AboutCta",
    ].map((needle) => PAGE.indexOf(needle));
    assert.ok(order.every((i) => i >= 0), "all five bands render");
    assert.deepEqual(
      order,
      [...order].sort((a, b) => a - b),
      "hero → story → principles → cards → cta"
    );
  });

  it("has exactly one h1", () => {
    const count = [HERO, STORY, PRINCIPLES, CARDS, CTA].join("").match(/<h1[\s>]/g);
    assert.equal(count?.length, 1);
  });
});

describe("/about — approved copy", () => {
  it("hero says why we are building roducq", () => {
    assert.equal(ABOUT_HERO.eyebrow, "About");
    assert.equal(ABOUT_HERO.titleBefore, "Why we are");
    assert.equal(ABOUT_HERO.titleAfter, "building roducq");
    assert.match(ABOUT_HERO.intro, /writing studio/);
  });

  it("story band carries the owner's final third paragraph", () => {
    assert.equal(ABOUT_STORY.title, "Where the context gets lost");
    assert.equal(ABOUT_STORY.paragraphs.length, 3);
    assert.equal(ABOUT_STORY.paragraphs[0].emphasis, true);
    assert.equal(
      ABOUT_STORY.paragraphs[2].text,
      "Our goal is to reduce the repeated work of turning scattered client conversations into clear, useful documents."
    );
  });

  it("keeps all five principles, numbered 01–05", () => {
    assert.equal(ABOUT_PRINCIPLES.eyebrow, "Principles");
    assert.equal(ABOUT_PRINCIPLES.title, "How we make product decisions");
    assert.deepEqual(
      ABOUT_PRINCIPLES.items.map((i) => i.number),
      ["01", "02", "03", "04", "05"]
    );
    assert.deepEqual(
      ABOUT_PRINCIPLES.items.map((i) => i.title),
      [
        "Start from what the client said",
        "Gaps are flagged, not guessed",
        "Every source stays attached",
        "One pipeline, not a pile of docs",
        "We say what it doesn't do",
      ]
    );
  });

  it("cards point at real destinations with visible-label link names", () => {
    assert.deepEqual(
      ABOUT_CARDS.map((c) => c.href),
      ["/changelog", "/vs", "mailto:contact@nanexi.com"]
    );
    // WCAG 2.5.3: the accessible name is the visible label — the card
    // uses a stretched link, never an aria-label override.
    assert.doesNotMatch(stripComments(CARDS), /aria-label\s*=/);
    assert.match(CARDS, /ab-card-link/);
    assert.match(CSS, /\.ab-card-link::after/);
    assert.match(CSS, /\.ab-card:focus-within/);
    assert.match(CARDS, /opens your email client/);
  });

  it("CTA uses the approved actions and note", () => {
    assert.equal(ABOUT_CTA.titleLine1, "Try roducq with");
    assert.equal(ABOUT_CTA.titleLine2, "your own client work");
    assert.deepEqual(ABOUT_CTA.primaryCta, {
      label: "Create account",
      href: "/signup",
    });
    assert.deepEqual(ABOUT_CTA.secondaryCta, {
      label: "See pricing",
      href: "/pricing",
    });
    assert.equal(
      ABOUT_CTA.note,
      "Creating an account does not activate a paid plan."
    );
  });

  it("checklist illustration is labelled fictional", () => {
    assert.equal(
      ABOUT_CTA.illustrationLabel,
      "Illustrative example · fictional client"
    );
    assert.equal(ABOUT_CTA.checklistItems.length, 4);
    assert.deepEqual(
      ABOUT_CTA.checklistItems.map((i) => i.state),
      ["Done", "Done", "Next", "Later"]
    );
    assert.match(CTA, /aria-hidden="true"/);
    assert.match(CTA, /<figcaption/);
    assert.match(CTA, /illustrationLabel/);
  });
});

describe("/about — honest claims contract", () => {
  it("carries none of the reference's company story or product claims", () => {
    for (const banned of [
      /Forma/,
      /Fewer notifications/,
      /Your tools, not ours/,
      /Automation you can see/,
      /Your data stays yours/,
      /CSV/,
      /JSON/,
      /Connect your calendar/,
      /Import an existing board/,
      /Invite your team/,
      /Getting started/,
      /pull requests/,
    ]) {
      assert.doesNotMatch(ALL_PUBLIC, banned, String(banned));
    }
  });

  it("makes no unverifiable offer claims", () => {
    assert.doesNotMatch(ALL_PUBLIC, /Try the demo/);
    assert.doesNotMatch(ALL_PUBLIC, /[Nn]o credit card/);
    assert.doesNotMatch(ALL_PUBLIC, /Start for free/);
    assert.doesNotMatch(ALL_PUBLIC, /free plan/i);
  });

  it("invents no company facts", () => {
    assert.doesNotMatch(ALL_PUBLIC, /founders?|founded|headquarters/i);
    assert.doesNotMatch(ALL_PUBLIC, /\bteam of \d|employees|customer(s)? (use|love)/i);
    assert.doesNotMatch(ALL_PUBLIC, /testimonial|award|funding|raised \$/i);
  });
});

describe("/about — motion follows the measured, LCP-safe contract", () => {
  it("hero uses the clip-mask ladder, never an opacity-0 start", () => {
    assert.match(HERO, /lm-hero-in/);
    assert.match(HERO, /lm-hero-word/);
    assert.match(HERO, /lm-hero-accent-inline/);
    assert.match(HERO, /lm-text-gradient/);
    assert.doesNotMatch(HERO, /opacity:\s*0/);
    assert.doesNotMatch(HERO, /Reveal/, "the LCP hero is never scroll-gated");
  });

  it("below-fold bands reveal through the shared Reveal + word rise", () => {
    for (const src of [STORY, PRINCIPLES, CARDS, CTA]) {
      assert.match(src, /from "@\/components\/marketing\/landing\/Reveal"/);
    }
    assert.match(STORY, /<Words/);
    assert.match(PRINCIPLES, /<Words/);
    assert.match(PRINCIPLES, /as="li"/, "rows stay list items");
    assert.match(CTA, /lm-line/);
    assert.match(CTA, /lm-text-gradient-soft/);
  });

  it("adds no new animation library or continuous decoration", () => {
    assert.doesNotMatch(ALL_PUBLIC, /framer-motion|gsap|animejs|@react-spring/);
    assert.doesNotMatch(ALL_PUBLIC, /spin_\d+s|animate-pulse|animate-spin/);
    assert.doesNotMatch(CSS, /@keyframes/, "motion stays in landing.css/Motion");
  });
});

describe("/about — measured geometry bindings", () => {
  it("binds the off-scale type steps measured on the reference", () => {
    assert.match(CSS, /43\.2px/, "split-band H2");
    assert.match(CSS, /18\.5px/, "split-band body");
    assert.match(CSS, /16\.5px/, "principle descriptions");
    assert.match(CSS, /64\.8px/, "CTA heading");
    assert.match(CSS, /54px/, "principles H2");
  });

  it("binds the measured band rhythm and grids", () => {
    assert.match(CSS, /padding-top:\s*120px/);
    assert.match(CSS, /45fr\s+55fr/);
    assert.match(CSS, /70px\s+300px/);
    assert.match(CSS, /border-radius:\s*18px/, "cards");
    assert.match(CSS, /border-radius:\s*28px/, "CTA panel");
    assert.match(CSS, /565px/, "CTA text column");
  });

  it("reuses the shell, gradient and token system instead of literals", () => {
    for (const src of [HERO, STORY, PRINCIPLES, CARDS, CTA]) {
      assert.match(src, /lm-shell/);
    }
    assert.match(CTA, /lm-cta-card/);
    assert.doesNotMatch(ALL_PUBLIC, /BriefSourceArt/, "hero is type-only now");
    assert.doesNotMatch(PAGE, /ClientWorkArt|components\/workflow/);
  });
});
