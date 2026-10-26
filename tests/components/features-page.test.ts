/**
 * /features (Forma-referenced feature showcase, 2026-10-26) —
 * structure, design-token discipline, the measured motion
 * contract, the truthfulness guards and route integrity.
 *
 * Five halves, mirroring tests/components/solutions-page.test.ts:
 *
 *  1. SHAPE. The page is hero → sticky six-chip jump strip →
 *     six-article showcase with one persistent stage → details
 *     band → closing CTA, and the content module publishes
 *     exactly six features, each with the reference's measured
 *     skeleton (three bold-lead points and one miniature).
 *
 *  2. DOMAIN GUARD. Nothing from the reference's task-manager
 *     domain may appear on this page: no "Forma", no ticket ids,
 *     no calendar, board/timeline, command-menu, CSV/JSON,
 *     two-way-sync or task-comment vocabulary. The miniatures
 *     are fabricated sample data and stay inside the content
 *     module's FEATURE_MOCKS block.
 *
 *  3. TOKENS. No landing component hardcodes a hex colour, a
 *     font-size or a shadow: these tests fail if a visual value
 *     escapes the token layer, because that is exactly how a
 *     redesign stops being a system.
 *
 *  4. MOTION CONTRACT. The measured values are locked in
 *     landing.css (shared with /solutions): the 900ms blur
 *     dissolve, the 700ms/80ms mock crossfade, the 0.3
 *     intersection trigger in the showcase, and the LCP rule —
 *     opacity never leaves 1 in the dissolve keyframes, and
 *     every pre-hidden state is gated behind .lm-js so a no-JS
 *     visitor sees the finished page.
 *
 *  5. ROUTES + A11Y. Every href resolves (file, mailto, home
 *     anchor or rendered article id), decorative miniatures are
 *     labelled or hidden correctly, the static bands stay
 *     static, and no fixed width can overflow a 320px viewport.
 *
 * Source-level + real imports, like the other landing tests:
 * node:test, zero test deps.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DETAILS_BAND,
  FEATURES,
  FEATURES_CHECKLIST,
  FEATURES_CLOSING,
  FEATURES_HERO,
  FEATURE_MOCKS,
  MOCK_DISCLOSURE,
  SECTION_NAV,
} from "../../app/(marketing)/features/content.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const PAGE = read("app/(marketing)/features/page.tsx");
const CONTENT = read("app/(marketing)/features/content.ts");
const TOKENS = read("app/(marketing)/landing.css");
const CONFIG = read("tailwind.config.ts");
const HEADER = read("components/marketing/SiteHeader.tsx");
const HERO = read(
  "components/marketing/landing/features/FeaturesHero.tsx",
);
const NAV = read(
  "components/marketing/landing/features/FeaturesSectionNav.tsx",
);
const SHOWCASE = read(
  "components/marketing/landing/features/FeaturesShowcase.tsx",
);
const PANEL = read(
  "components/marketing/landing/features/FeatureMockPanel.tsx",
);
const MOCKS_TSX = read(
  "components/marketing/landing/features/FeatureMocks.tsx",
);
const DETAILS = read(
  "components/marketing/landing/features/DetailsBand.tsx",
);
const CLOSING = read(
  "components/marketing/landing/features/FeaturesClosingCta.tsx",
);

const FEATURES_SOURCES = [
  ["app/(marketing)/features/page.tsx", PAGE],
  ["app/(marketing)/features/content.ts", CONTENT],
  ["components/marketing/landing/features/FeaturesHero.tsx", HERO],
  ["components/marketing/landing/features/FeaturesSectionNav.tsx", NAV],
  ["components/marketing/landing/features/FeaturesShowcase.tsx", SHOWCASE],
  ["components/marketing/landing/features/FeatureMockPanel.tsx", PANEL],
  ["components/marketing/landing/features/FeatureMocks.tsx", MOCKS_TSX],
  ["components/marketing/landing/features/DetailsBand.tsx", DETAILS],
  [
    "components/marketing/landing/features/FeaturesClosingCta.tsx",
    CLOSING,
  ],
] as const;

/** Source with comments and strings removed, for the
 *  guards that must not be fooled by prose. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/`[^`]*`/g, "``");
}

/** The six mock keys the content module is allowed to reference. */
const MOCK_KEYS = [
  "automation",
  "plan",
  "update",
  "connections",
  "rollup",
  "roster",
] as const;

describe("Features page (shape)", () => {
  it("composes the five measured bands in the reference's order", () => {
    const order = [
      "FeaturesHero",
      "FeaturesSectionNav",
      "FeaturesShowcase",
      "DetailsBand",
      "FeaturesClosingCta",
    ];
    let last = -1;
    for (const name of order) {
      const at = PAGE.indexOf(`<${name}`);
      assert.ok(at > last, `${name} should follow the previous band`);
      last = at;
    }
    assert.ok(PAGE.includes("metadata"));
    assert.ok(PAGE.includes('canonical: "/features"'));
  });

  it("publishes exactly six features, each with the measured skeleton", () => {
    assert.equal(FEATURES.length, 6);
    for (const feature of FEATURES) {
      assert.equal(feature.points.length, 3, `${feature.id} has three points`);
      assert.ok(feature.id);
      assert.ok(feature.index);
      assert.ok(feature.label);
      assert.ok(feature.title);
      assert.ok(feature.copy);
      assert.ok(
        MOCK_KEYS.includes(feature.mock),
        `${feature.id} must key a real miniature`,
      );
      for (const point of feature.points) {
        assert.ok(point.lead.length > 0);
        assert.ok(point.text.length > 0);
      }
    }
    // The six index numbers the reference counts with.
    assert.deepEqual(
      FEATURES.map((f) => f.index),
      ["01", "02", "03", "04", "05", "06"],
    );
    // The six anchors the jump strip uses.
    assert.deepEqual(
      FEATURES.map((f) => f.id),
      [
        "automations",
        "projects",
        "cadence",
        "connected",
        "insights",
        "collaboration",
      ],
    );
  });

  it("renders one miniature component per mock key, no more and no fewer", () => {
    assert.deepEqual(
      Object.keys(FEATURE_MOCKS).sort(),
      [...MOCK_KEYS].sort(),
    );
    for (const key of MOCK_KEYS) {
      assert.ok(
        MOCKS_TSX.includes(`${key}:`),
        `FeatureMocks must implement the ${key} miniature`,
      );
    }
  });

  it("every section-nav chip resolves to a rendered article anchor", () => {
    assert.equal(SECTION_NAV.length, 6);
    for (const chip of SECTION_NAV) {
      assert.ok(chip.href.startsWith("#"), "chips are page anchors");
      assert.ok(
        FEATURES.some((f) => f.id === chip.href.slice(1)),
        `${chip.href} must match a feature id`,
      );
      assert.ok(SHOWCASE.includes("id={feature.id}"));
    }
  });

  it("the hero splits its headline like the reference (ink words, gradient rest)", () => {
    assert.ok(FEATURES_HERO.titleBefore.length > 0);
    assert.ok(FEATURES_HERO.titleAfter.length > 0);
    assert.equal(
      `${FEATURES_HERO.titleBefore} ${FEATURES_HERO.titleAfter}`,
      FEATURES_HERO.title,
    );
    assert.ok(HERO.includes("lm-hero-word"));
    assert.ok(HERO.includes("lm-text-gradient"));
    // The reference hero carries two CTAs; the /solutions hero does not.
    assert.equal(FEATURES_HERO.primaryCta.href, "/signup");
    assert.ok(FEATURES_HERO.secondaryCta.href.startsWith("mailto:"));
  });

  it("the article-04 link is the only in-article text link and points home", () => {
    const withLink = FEATURES.filter((f) => f.link);
    assert.equal(withLink.length, 1, "exactly one article carries a link");
    assert.equal(withLink[0].id, "connected");
    assert.equal(withLink[0].link?.href, "/#integrations");
    assert.ok(SHOWCASE.includes('href={feature.link.href}'));
  });

  it("the closing CTA reuses the homepage's approved closing copy", () => {
    const home = read("app/(marketing)/home/content.ts");
    assert.ok(
      home.includes('title: "Try roducq with your own client project"'),
    );
    assert.equal(
      FEATURES_CLOSING.title,
      "Try roducq with your own client project",
    );
    assert.equal(FEATURES_CLOSING.primaryCta.href, "/signup");
    assert.equal(
      FEATURES_CLOSING.secondaryCta.href,
      "mailto:hello@roducq.dev",
    );
  });

  it("the getting-started miniature is a four-step, two-done checklist", () => {
    assert.equal(FEATURES_CHECKLIST.items.length, 4);
    assert.equal(FEATURES_CHECKLIST.progress, "2 of 4");
    assert.equal(
      FEATURES_CHECKLIST.items.filter((i) => i.state === "Done").length,
      2,
    );
  });

  it("the details band keeps the measured four-cell structure with real capabilities", () => {
    assert.equal(DETAILS_BAND.cells.length, 4);
    // The reference's command-menu and CSV/JSON cells are replaced by
    // real roducq capabilities; the four measured icons are lucide names
    // the component actually imports.
    for (const cell of DETAILS_BAND.cells) {
      assert.ok(DETAILS.includes(cell.icon), `${cell.icon} is imported`);
      assert.ok(cell.title.length > 0);
      assert.ok(cell.copy.length > 0);
    }
  });
});

describe("Features page (domain guard)", () => {
  it("carries no Forma brand, domain or task-manager vocabulary", () => {
    const forbidden = [
      "Forma",
      "FRM-",
      "forma-visuvate",
      "framer.website",
      "My tasks",
      "task board",
      "ticket",
      "sprint",
      "roadmap",
      "calendar",
      "kanban",
      "timeline",
      "command menu",
      "⌘K",
      "CSV",
      "JSON",
      "two-way",
      "focus time",
      "priority",
      "priorities",
      // bare "board"/"comment" would catch the reference's board views
      // and task comments; roducq ships neither.
      "board",
      "comment",
    ];
    for (const [name, source] of FEATURES_SOURCES) {
      // Comments may cite the reference for provenance;
      // rendered code and copy may not.
      const code = codeOnly(source);
      for (const term of forbidden) {
        assert.ok(
          !code.includes(term),
          `${name} must not contain "${term}"`,
        );
      }
    }
  });

  it("keeps every fabricated mock string inside the content module", () => {
    // The invented client names live in content.ts only; the
    // components render them through FEATURE_MOCKS, never inline.
    for (const name of ["Northwind Bakery", "Meridian Retail"]) {
      assert.ok(
        CONTENT.includes(name),
        `${name} belongs in the content module`,
      );
      for (const [file, source] of FEATURES_SOURCES) {
        if (file.endsWith("content.ts")) continue;
        assert.ok(
          !source.includes(name),
          `${file} must not hardcode the fabricated client "${name}"`,
        );
      }
    }
  });

  it("publishes no price or percentage claim", () => {
    const code = codeOnly(CONTENT);
    assert.ok(!code.includes("$"), "no prices on this page");
    assert.ok(!/\d+%/.test(code), "no percentage claims");
    assert.ok(
      !/\b\d{2,}\s*(clients|customers|teams|hours saved)\b/i.test(code),
    );
  });

  it("every miniature carries the fictional-client disclosure", () => {
    assert.equal(
      MOCK_DISCLOSURE,
      "Illustrative example · fictional client",
    );
    // The disclosure is rendered once per miniature shell, including the
    // inline stages, and inside the desktop stage's accessibility label.
    assert.ok(MOCKS_TSX.includes("{MOCK_DISCLOSURE}"));
    assert.ok(PANEL.includes("Illustrative example, fictional client"));
  });
});

describe("Features page (tokens)", () => {
  it("no component hardcodes a hex colour, font-size or shadow", () => {
    for (const [name, source] of FEATURES_SOURCES) {
      const code = codeOnly(source);
      assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(code), `${name}: no hex colours`);
      assert.ok(
        !/font-size\s*:/.test(code),
        `${name}: no inline font-size (use text-lm-*)`,
      );
      assert.ok(
        !/box-shadow\s*:/.test(code),
        `${name}: no inline box-shadow (use shadow-lm-*)`,
      );
      assert.ok(
        !/text-\[\d/.test(code),
        `${name}: no arbitrary font-size utilities`,
      );
    }
  });

  it("the measured type steps, radii and stage fills are declared as tokens", () => {
    for (const token of [
      "--lm-size-42",
      "--lm-size-44",
      "--lm-size-67",
      "--lm-radius-stage",
      "--lm-radius-mock",
      "--lm-shadow-mock",
      "--lm-shadow-stage",
      "--lm-cta-faint",
      "--lm-cta-track",
      "--lm-cta-fill",
    ]) {
      assert.ok(TOKENS.includes(token), `landing.css declares ${token}`);
    }
    for (const utility of [
      "lm-42",
      "lm-44",
      "lm-67",
      "lm-stage",
      "lm-mock",
      // The stage foot/rail mappings were missing when /solutions
      // shipped; /features requires them, so the config now maps all
      // three and both pages render the measured rail.
      "cta-faint",
      "cta-track",
      "cta-fill",
    ]) {
      assert.ok(CONFIG.includes(`"${utility}"`), `tailwind maps ${utility}`);
    }
  });
});

describe("Features page (motion contract)", () => {
  it("locks the measured word dissolve: 900ms, blur 10px, display easing", () => {
    assert.ok(TOKENS.includes("@keyframes lm-word-dissolve"));
    assert.ok(TOKENS.includes("filter: blur(10px)"));
    assert.ok(TOKENS.includes("filter: blur(0px)"));
    assert.ok(TOKENS.includes("var(--lm-motion-display)"));
    assert.ok(TOKENS.includes("var(--lm-ease-display)"));
    assert.ok(TOKENS.includes("--lm-motion-display: 900ms"));
    assert.ok(
      TOKENS.includes("--lm-ease-display: cubic-bezier(0.16, 1, 0.3, 1)"),
    );
  });

  it("keeps opacity at 1 in the dissolve keyframes (the LCP rule)", () => {
    const block = TOKENS.slice(
      TOKENS.indexOf("@keyframes lm-word-dissolve"),
      TOKENS.indexOf("@keyframes lm-word-dissolve") + 200,
    );
    assert.ok(block.includes("opacity: 1"));
    assert.ok(
      !block.includes("opacity: 0"),
      "no opacity-zero start on headline words",
    );
    assert.ok(!block.includes("opacity: 0.001"));
  });

  it("pre-hides below-fold words only behind .lm-js (no-JS visibility)", () => {
    assert.ok(
      TOKENS.includes(".lm-js .lm-reveal .lm-word-blur > span"),
      "the hidden state must be gated on .lm-js",
    );
    assert.ok(
      TOKENS.includes(
        '.lm-js .lm-reveal[data-visible="true"] .lm-word-blur > span',
      ),
      "the reveal state is data-visible driven",
    );
    // The hero words are never pre-hidden at all.
    assert.ok(!TOKENS.includes(".lm-js .lm-hero-word"));
  });

  it("locks the measured mock crossfade: 700ms and 80ms in both directions", () => {
    assert.ok(TOKENS.includes(".lm-js .lm-mock-layer"));
    assert.ok(
      TOKENS.includes("opacity 700ms var(--lm-ease-body) 80ms"),
    );
    assert.ok(
      TOKENS.includes("transform 700ms var(--lm-ease-body) 80ms"),
    );
    assert.ok(TOKENS.includes("visibility 0s 780ms"));
    assert.ok(TOKENS.includes("visibility 0s 80ms"));
    assert.ok(!TOKENS.includes("opacity 500ms var(--lm-ease-body)"));
  });

  it("locks the measured status-pill swap easing", () => {
    assert.ok(
      TOKENS.includes(
        "transition: opacity 500ms cubic-bezier(0.42, 0, 0.58, 1)",
      ),
    );
  });

  it("triggers the mock swap at the measured 0.3 intersection threshold", () => {
    assert.ok(SHOWCASE.includes("threshold: 0.3"));
    assert.ok(SHOWCASE.includes("data-feature-index"));
    assert.ok(PANEL.includes("data-active"));
  });

  it("covers the animated classes in the reduced-motion block", () => {
    const reduced = TOKENS.slice(
      TOKENS.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    assert.ok(reduced.includes(".lm-hero-word"));
    assert.ok(reduced.includes(".lm-word-blur"));
    assert.ok(reduced.includes(".lm-mock-layer"));
    assert.ok(reduced.includes(".lm-pill-swap"));
  });

  it("the sticky stage and the jump strip clear the shared header", () => {
    // The reference hides the stage column below 1200px and pins the
    // sticky child at top:150px; the jump strip re-bases onto Roducq's
    // own 64/72px header, exactly the /solutions construction.
    assert.ok(
      SHOWCASE.includes(
        "min-[1200px]:sticky min-[1200px]:top-[150px]",
      ),
    );
    assert.ok(NAV.includes("sticky top-16"));
    assert.ok(NAV.includes("md:top-18"));
  });

  it("the stage geometry exists only under .lm-js (no-JS stacking)", () => {
    // Without JavaScript the stage keeps its natural height and the six
    // miniatures stack in flow; the fixed 710px stage, the absolute
    // layer box and the absolute counter foot are all .lm-js-gated.
    assert.ok(TOKENS.includes(".lm-js .lm-stage-persistent"));
    assert.ok(TOKENS.includes("height: 710px"));
    assert.ok(TOKENS.includes(".lm-js .lm-mock-stage"));
    assert.ok(TOKENS.includes("inset: 9px 52px 26px"));
    assert.ok(TOKENS.includes(".lm-js .lm-mock-stage-foot"));
    // And the component does not hardcode the height.
    assert.ok(!PANEL.includes("h-[710px]"));
  });
});

describe("Features page (routes + a11y)", () => {
  it("every published href resolves to a file, a mailto or a rendered anchor", () => {
    const hrefs = [
      ...CONTENT.matchAll(/href: "([^"]+)"/g),
    ].map((m) => m[1]);
    assert.ok(hrefs.length >= 4);
    for (const raw of hrefs) {
      const href = raw;
      if (href.startsWith("mailto:")) continue;
      if (href.startsWith("#")) {
        assert.ok(
          FEATURES.some((f) => f.id === href.slice(1)),
          `anchor ${href} must match a feature id`,
        );
        continue;
      }
      // A cross-route hash ("/#integrations") resolves as the route leaf
      // plus an anchor rendered by that route's section component.
      const [route, hash] = href.split("#");
      const leaf = route === "/" ? "page.tsx" : `${route}/page.tsx`;
      const groups = ["app", "app/(marketing)", "app/(auth)"];
      assert.ok(
        groups.some((group) =>
          existsSync(join(import.meta.dirname, "../..", group, leaf)),
        ),
        `${href} must resolve to a route`,
      );
      if (hash) {
        const home = read("components/marketing/landing/IntegrationsSection.tsx");
        assert.ok(
          home.includes(`id="${hash}"`),
          `${href} anchor must be rendered on the home page`,
        );
      }
    }
  });

  it("decorative miniatures and icons are hidden or labelled for assistive tech", () => {
    assert.ok(CLOSING.includes('aria-hidden="true"'));
    assert.ok(MOCKS_TSX.includes('aria-hidden="true"'));
    // The desktop stage is one labelled illustration naming the feature
    // in view and carrying the fictional-client disclosure; the foot is
    // decorative duplication.
    assert.ok(PANEL.includes('role="img"'));
    assert.ok(PANEL.includes("Illustrative example, fictional client"));
    assert.ok(PANEL.includes("category ${step} of ${total}"));
    assert.ok(
      !PANEL.includes('lg:block" aria-hidden'),
      "the stage root must stay exposed to assistive tech",
    );
    // The inline stages are labelled illustrations too, not bare boxes.
    assert.ok(SHOWCASE.includes('role="img"'));
  });

  it("keeps every interactive element at or above the 44px floor", () => {
    assert.ok(NAV.includes("min-h-11"));
    assert.ok(HERO.includes("min-h-11"));
    assert.ok(CLOSING.includes("min-h-11"));
  });

  it("leaves the reference's static bands static (no invented entrance)", () => {
    // The details band and closing CTA render immediately on the
    // reference: no scroll reveal, no word dissolve, nothing pre-hidden.
    assert.ok(!DETAILS.includes("<Reveal"));
    assert.ok(!CLOSING.includes("<Reveal"));
    assert.ok(
      !/lm-word-blur|lm-word-dissolve/.test(DETAILS + CLOSING),
      "the two static bands must not grow an entrance animation",
    );
  });

  it("no fixed pixel width that can overflow a 320px viewport", () => {
    for (const [name, source] of FEATURES_SOURCES) {
      const code = codeOnly(source);
      // A max-width ceiling cannot overflow; a hard width can.
      assert.ok(
        !/(?<!max-)\bw-\[\d{3,}px\]/.test(code),
        `${name}: no fixed widths of 100px or more`,
      );
    }
  });
});

describe("Features page (shared header extension)", () => {
  it("keeps the locked nav ternary and adds only a pathname boolean", () => {
    // vs-comparisons.test.ts locks this exact line; the features work
    // must extend around it, never rewrite it.
    assert.ok(
      HEADER.includes("const items = solutions ? SOLUTIONS_NAV : NAV;"),
    );
    assert.ok(
      HEADER.includes(
        'const features = pathname === "/features" || pathname.startsWith("/features/");',
      ),
    );
    assert.ok(HEADER.includes("const showcase = solutions || features;"));
    // The default nav (and its /vs Compare link) is untouched, so /,
    // /about, /pricing and /vs keep their original header.
    assert.ok(HEADER.includes('{ href: "/vs", label: "Compare" }'));
    // The visual variant follows the combined gate, not a rewrite.
    assert.ok(HEADER.includes('showcase\n          ? "bg-lm-card"'));
  });
});
