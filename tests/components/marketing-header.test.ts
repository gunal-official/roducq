import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Regression tests for the site-wide marketing consistency pass
 * (docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md).
 *
 * These pin the three things that pass actually changed on shared or
 * cross-page surfaces, so a later page milestone cannot quietly reintroduce
 * them:
 *
 *   1. ONE header. No pathname variant gate, one destination list, every
 *      route on the approved /solutions chrome.
 *   2. Every `lm-*` utility the marketing markup names resolves to a real
 *      rule. The audit found eight classes that compiled to nothing
 *      (tracking-lm-*, leading-lm-*, bg-lm-chip-wash, text-lm-26,
 *      text-lm-11, border-lm-border-hairline) and two of them were visibly
 *      wrong on screen.
 *   3. The two accessibility / LCP fixes: the changelog verify link's
 *      accessible name starts with its visible label, and no marketing hero
 *      heading starts at opacity 0 behind a scroll reveal.
 */
const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const HEADER = read("components/marketing/SiteHeader.tsx");
const CSS = read("app/(marketing)/landing.css");
const CONFIG = read("tailwind.config.ts");
const PRICING_PAGE = read("app/(marketing)/pricing/page.tsx");
const CHANGELOG_FEED = read("components/marketing/landing/changelog/ChangelogFeed.tsx");
const FEATURES_SHOWCASE = read("components/marketing/landing/features/FeaturesShowcase.tsx");
const CARD_LABEL = read("components/marketing/landing/SectionHeading.tsx");

describe("Marketing header — one header for every marketing route", () => {
  it("renders the approved /solutions chrome unconditionally", () => {
    assert.ok(
      HEADER.includes('className="lm-header sticky top-0 z-40 bg-lm-card'),
      "the header must paint the opaque card plane at every route",
    );
    // The two pre-redesign branches are gone: no translucent wash, no
    // hairline border, no per-route conditional background.
    assert.ok(!HEADER.includes("bg-lm-header-wash"));
    assert.ok(!HEADER.includes("border-b border-lm-border-soft bg-lm"));
    assert.ok(!HEADER.includes("showcase"));
  });

  it("has no pathname variant gate left", () => {
    assert.ok(!HEADER.includes("const solutions ="));
    assert.ok(!HEADER.includes("SOLUTIONS_NAV"));
    assert.ok(!HEADER.includes("const features ="));
    assert.ok(!HEADER.includes("const integrations ="));
    assert.ok(!HEADER.includes("const changelog ="));
    assert.ok(HEADER.includes("const items = NAV;"));
  });

  it("carries the reference's five destinations plus every real roducq route", () => {
    const expected = [
      ["/features", "Features"],
      ["/solutions", "Solutions"],
      ["/integrations", "Integrations"],
      ["/pricing", "Pricing"],
      ["/changelog", "Changelog"],
      ["/about", "About"],
      ["/vs", "Compare"],
    ];
    for (const [href, label] of expected) {
      assert.ok(
        HEADER.includes(`{ href: "${href}", label: "${label}" }`),
        `header is missing ${label} → ${href}`,
      );
    }
    assert.equal(expected.length, 7);
    // The reference publishes Features/Integrations as in-page anchors because
    // those pages do not exist there. Both exist here, so no hash hrefs.
    assert.ok(!HEADER.includes("hash:"));
    assert.ok(!HEADER.includes("/#"));
  });

  it("keeps the active-state underline, the icon theme button and Get started", () => {
    assert.ok(HEADER.includes('aria-current={active(item.href) ? "page" : undefined}'));
    assert.ok(HEADER.includes("bg-lm-ink transition-transform"));
    assert.ok(HEADER.includes("<ThemeIconToggle />"));
    assert.ok(HEADER.includes("Get started"));
    // The phone menu still offers the theme switch and the sign-in path.
    assert.ok(HEADER.includes("<ThemeToggle />"));
    assert.ok(HEADER.includes('href="/login"'));
  });

  it("tightens the row only in the desktop band the reference never rendered", () => {
    assert.ok(HEADER.includes("px-2.5 text-lm-15"));
    assert.ok(HEADER.includes("min-[1200px]:px-3"));
  });

  it("keeps every destination a 44px touch target", () => {
    assert.ok(HEADER.includes("min-h-11 min-w-11 items-center rounded-lm-control"));
  });
});

describe("Marketing tokens — every named lm-* utility resolves", () => {
  it("maps the numbered strip's measured chip wash", () => {
    assert.ok(CSS.includes("--lm-chip-wash: rgba(255, 255, 255, 0.72)"));
    assert.match(CONFIG, /"chip-wash":\s*"var\(--lm-chip-wash\)"/);
  });

  it("declares the 26px statistic step the homepage asks for", () => {
    assert.match(CSS, /--lm-size-26:\s*26px/);
    assert.match(CONFIG, /"lm-26":\s*\["var\(--lm-size-26\)"/);
  });

  it("maps every tracking-lm-* and leading-lm-* step the pricing page names", () => {
    for (const step of ["display", "eyebrow", "label", "title", "price"]) {
      assert.match(
        CSS,
        new RegExp(`--lm-tracking-${step}:\\s*-?[0-9.]+em`),
        `missing --lm-tracking-${step}`,
      );
      assert.match(
        CONFIG,
        new RegExp(`"lm-${step}":\\s*"var\\(--lm-tracking-${step}\\)"`),
        `tailwind has no tracking-lm-${step}`,
      );
    }
    for (const step of ["body", "heading", "normal"]) {
      assert.match(
        CSS,
        new RegExp(`--lm-leading-${step}:\\s*[0-9.]+`),
        `missing --lm-leading-${step}`,
      );
      assert.match(
        CONFIG,
        new RegExp(`"lm-${step}":\\s*"var\\(--lm-leading-${step}\\)"`),
        `tailwind has no leading-lm-${step}`,
      );
    }
    // The two documented values from the pricing specification.
    assert.match(CSS, /--lm-tracking-display:\s*-0\.03em/);
    assert.match(CSS, /--lm-tracking-eyebrow:\s*0\.14em/);
    // And the page's own documented line-heights.
    assert.match(CSS, /--lm-leading-heading:\s*1\.1/);
    assert.match(CSS, /--lm-leading-body:\s*1\.65/);
  });

  it("uses the token names that actually exist", () => {
    // `border-lm-border-hairline` is not a utility (the key is `hairline`);
    // it silently fell back to the neutral border colour.
    assert.ok(!read("components/marketing/landing/WorkspacePreview.tsx").includes("border-lm-border-hairline"));
    assert.ok(!read("components/marketing/landing/FinalCta.tsx").includes("border-lm-border-hairline"));
    // CardLabel declared 11px through a step that was never activated; the
    // measured 11px chip step already exists.
    assert.ok(CARD_LABEL.includes("text-lm-chip font-lm-regular"));
    assert.ok(!CARD_LABEL.includes("text-lm-11"));
  });
});

describe("Marketing hero entrance — no opacity-zero LCP candidate", () => {
  it("runs the pricing hero on the shared clip-path ladder, not a scroll reveal", () => {
    // The hero block only — from its wrapper div to the offer banner.
    const hero = PRICING_PAGE.slice(
      PRICING_PAGE.indexOf('<div className="mx-auto max-w-2xl text-center">'),
      PRICING_PAGE.indexOf("Optional Launch Offer Banner"),
    );
    assert.ok(hero.includes('id="pricing-page-heading"'));
    assert.ok(hero.includes("lm-hero-in"));
    assert.ok(!hero.includes("<Reveal"));
    assert.ok(!hero.includes("lm-reveal"));
  });

  it("switches the pricing display band at the reference's 1200px boundary", () => {
    assert.ok(PRICING_PAGE.includes("min-[1200px]:text-lm-54"));
    assert.ok(!PRICING_PAGE.includes("lg:text-lm-54"));
  });
});

describe("Marketing accessibility regressions", () => {
  it("names each changelog verify link with its visible label first", () => {
    // WCAG 2.5.3: axe flagged all eight entries when the visible "PR #63"
    // only appeared inside the aria-label's parentheses.
    assert.ok(
      CHANGELOG_FEED.includes("aria-label={`${entry.sourceLabel} — verify ${entry.title} on GitHub`}"),
    );
  });

  it("gives the /features inline link the 44px floor every other link has", () => {
    assert.ok(FEATURES_SHOWCASE.includes("inline-flex min-h-11 w-fit items-center gap-1.5 text-lm-15"));
  });
});
