/**
 * /solutions (Forma-referenced practice showcase, 2026-10-18) —
 * structure, design-token discipline, the measured motion
 * contract, the truthfulness guards and route integrity.
 *
 * Five halves, mirroring tests/components/home.test.ts:
 *
 *  1. SHAPE. The page is hero → sticky jump strip → four-block
 *     showcase → plan band → closing CTA, and the content
 *     module publishes exactly four practices, each with the
 *     reference's measured skeleton (three workflows, a
 *     templates line, one miniature).
 *
 *  2. DOMAIN GUARD. Nothing from the reference's task-manager
 *     domain may appear on this page: no "Forma", no ticket
 *     ids, no release/task vocabulary. The miniatures are
 *     fabricated sample data and are asserted to stay inside
 *     the content module's MOCKS block.
 *
 *  3. TOKENS. No landing component hardcodes a hex colour, a
 *     font-size or a shadow: these tests fail if a visual
 *     value escapes the token layer, because that is exactly
 *     how a redesign stops being a system.
 *
 *  4. MOTION CONTRACT. The measured values are locked in
 *     landing.css: the 900ms blur dissolve on
 *     cubic-bezier(0.16, 1, 0.3, 1), the 500/700ms mock
 *     crossfade on cubic-bezier(0.2, 0.7, 0.2, 1), the
 *     500ms status-pill swap on cubic-bezier(0.42, 0, 0.58, 1),
 *     the 0.3 intersection trigger in the showcase, and the
 *     LCP rule — opacity never leaves 1 in the dissolve
 *     keyframes, and every pre-hidden state is gated behind
 *     .lm-js so a no-JS visitor sees the finished page.
 *
 *  5. ROUTES + A11Y. Every href resolves (file, mailto or a
 *     rendered anchor id), decorative miniatures are hidden
 *     from assistive tech where they duplicate content, and
 *     no fixed width can overflow a 320px viewport.
 *
 * Source-level + real imports, like the other landing tests:
 * node:test, zero test deps.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  CATEGORIES,
  MOCKS,
  PLAN_BAND,
  SECTION_NAV,
  SOLUTIONS_CHECKLIST,
  SOLUTIONS_CLOSING,
  SOLUTIONS_HERO,
  TEMPLATES_LABEL,
  WORKFLOWS_LABEL,
} from "../../app/(marketing)/solutions/content.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const PAGE = read("app/(marketing)/solutions/page.tsx");
const CONTENT = read("app/(marketing)/solutions/content.ts");
const TOKENS = read("app/(marketing)/landing.css");
const CONFIG = read("tailwind.config.ts");
const HERO = read("components/marketing/landing/solutions/SolutionsHero.tsx");
const NAV = read("components/marketing/landing/solutions/SectionNav.tsx");
const SHOWCASE = read(
  "components/marketing/landing/solutions/SolutionsShowcase.tsx",
);
const PANEL = read("components/marketing/landing/solutions/MockPanel.tsx");
const MOCKS_TSX = read(
  "components/marketing/landing/solutions/PracticeMocks.tsx",
);
const PLAN = read("components/marketing/landing/solutions/PlanBand.tsx");
const CLOSING = read(
  "components/marketing/landing/solutions/ClosingCta.tsx",
);

const SOLUTIONS_SOURCES = [
  ["app/(marketing)/solutions/page.tsx", PAGE],
  ["app/(marketing)/solutions/content.ts", CONTENT],
  ["components/marketing/landing/solutions/SolutionsHero.tsx", HERO],
  ["components/marketing/landing/solutions/SectionNav.tsx", NAV],
  ["components/marketing/landing/solutions/SolutionsShowcase.tsx", SHOWCASE],
  ["components/marketing/landing/solutions/MockPanel.tsx", PANEL],
  ["components/marketing/landing/solutions/PracticeMocks.tsx", MOCKS_TSX],
  ["components/marketing/landing/solutions/PlanBand.tsx", PLAN],
  ["components/marketing/landing/solutions/ClosingCta.tsx", CLOSING],
] as const;

/** Source with comments and strings removed, for the
 *  guards that must not be fooled by prose. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/`[^`]*`/g, "``");
}

describe("Solutions page (shape)", () => {
  it("composes the five measured bands in the reference's order", () => {
    const order = [
      "SolutionsHero",
      "SectionNav",
      "SolutionsShowcase",
      "PlanBand",
      "ClosingCta",
    ];
    let last = -1;
    for (const name of order) {
      const at = PAGE.indexOf(`<${name}`);
      assert.ok(at > last, `${name} should follow the previous band`);
      last = at;
    }
    assert.ok(PAGE.includes('metadata'));
    assert.ok(PAGE.includes('canonical: "/solutions"'));
  });

  it("publishes exactly four practices, each with the measured skeleton", () => {
    assert.equal(CATEGORIES.length, 4);
    for (const category of CATEGORIES) {
      assert.equal(category.workflows.length, 3);
      assert.ok(category.templates.length >= 2);
      assert.ok(category.id);
      assert.ok(category.index);
      assert.ok(category.label);
      assert.ok(category.title);
      assert.ok(category.copy);
      assert.ok(
        ["trail", "brief", "proposal", "week"].includes(category.mock),
        `${category.id} must key a real miniature`,
      );
    }
    // The four index numbers the reference counts with.
    assert.deepEqual(
      CATEGORIES.map((c) => c.index),
      ["01", "02", "03", "04"],
    );
  });

  it("every section-nav chip resolves to a rendered article anchor", () => {
    assert.equal(SECTION_NAV.length, 4);
    for (const chip of SECTION_NAV) {
      assert.ok(chip.href.startsWith("#"), "chips are page anchors");
      assert.ok(
        CATEGORIES.some((c) => c.id === chip.href.slice(1)),
        `${chip.href} must match a category id`,
      );
      assert.ok(SHOWCASE.includes(`id={category.id}`));
    }
  });

  it("the hero splits its headline like the reference (ink words, gradient rest)", () => {
    assert.ok(SOLUTIONS_HERO.titleBefore.length > 0);
    assert.ok(SOLUTIONS_HERO.titleAfter.length > 0);
    assert.equal(
      `${SOLUTIONS_HERO.titleBefore} ${SOLUTIONS_HERO.titleAfter}`,
      SOLUTIONS_HERO.title,
    );
    assert.ok(HERO.includes("lm-hero-word"));
    assert.ok(HERO.includes("lm-text-gradient"));
  });

  it("the closing CTA reuses the homepage's approved closing copy", () => {
    const home = read("app/(marketing)/home/content.ts");
    assert.ok(home.includes('title: "Try roducq with your own client project"'));
    assert.equal(
      SOLUTIONS_CLOSING.title,
      "Try roducq with your own client project",
    );
    assert.equal(SOLUTIONS_CLOSING.primaryCta.href, "/signup");
    assert.equal(SOLUTIONS_CLOSING.secondaryCta.href, "mailto:hello@roducq.dev");
  });

  it("the getting-started miniature is a four-step, two-done checklist", () => {
    assert.equal(SOLUTIONS_CHECKLIST.items.length, 4);
    assert.equal(SOLUTIONS_CHECKLIST.progress, "2 of 4");
    assert.equal(
      SOLUTIONS_CHECKLIST.items.filter((i) => i.state === "Done").length,
      2,
    );
  });
});

describe("Solutions page (domain guard)", () => {
  it("carries no Forma brand, domain or task-manager vocabulary", () => {
    const forbidden = [
      "Forma",
      "FRM-",
      "forma-visuvate",
      "framer.website",
      "My tasks",
      "task board",
      "ticket",
      "Release 2.4",
      "Ships Sep",
      "Autumn launch",
      "New hire onboarding",
      "sprint",
      "roadmap",
    ];
    for (const [name, source] of SOLUTIONS_SOURCES) {
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
    // components render them through MOCKS, never inline.
    for (const name of ["Northwind Bakery", "Harbor Coffee", "Meridian Retail"]) {
      assert.ok(CONTENT.includes(name), `${name} belongs in the content module`);
      for (const [file, source] of SOLUTIONS_SOURCES) {
        if (file.endsWith("content.ts")) continue;
        assert.ok(
          !source.includes(name),
          `${file} must not hardcode the fabricated client "${name}"`,
        );
      }
    }
  });

  it("publishes no price, count or percentage claim", () => {
    const code = codeOnly(CONTENT);
    assert.ok(!code.includes("$"), "no prices on this page");
    assert.ok(!/\d+%/.test(code), "no percentage claims");
    assert.ok(!/\b\d{2,}\s*(clients|customers|teams|hours saved)\b/i.test(code));
  });
});

describe("Solutions page (tokens)", () => {
  it("no component hardcodes a hex colour, font-size or shadow", () => {
    for (const [name, source] of SOLUTIONS_SOURCES) {
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

  it("the measured type steps and radii are declared as tokens", () => {
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
    ]) {
      assert.ok(TOKENS.includes(token), `landing.css declares ${token}`);
    }
    for (const utility of ["lm-42", "lm-44", "lm-67", "lm-stage", "lm-mock"]) {
      assert.ok(CONFIG.includes(`"${utility}"`), `tailwind maps ${utility}`);
    }
  });
});

describe("Solutions page (motion contract)", () => {
  it("locks the measured word dissolve: 900ms, blur 10px, display easing", () => {
    assert.ok(TOKENS.includes("@keyframes lm-word-dissolve"));
    assert.ok(TOKENS.includes("filter: blur(10px)"));
    assert.ok(TOKENS.includes("filter: blur(0px)"));
    assert.ok(TOKENS.includes("var(--lm-motion-display)"));
    assert.ok(TOKENS.includes("var(--lm-ease-display)"));
    // The measured display step is 900ms on cubic-bezier(0.16, 1, 0.3, 1).
    assert.ok(TOKENS.includes("--lm-motion-display: 900ms"));
    assert.ok(TOKENS.includes("--lm-ease-display: cubic-bezier(0.16, 1, 0.3, 1)"));
  });

  it("keeps opacity at 1 in the dissolve keyframes (the LCP rule)", () => {
    const block = TOKENS.slice(
      TOKENS.indexOf("@keyframes lm-word-dissolve"),
      TOKENS.indexOf("@keyframes lm-word-dissolve") + 200,
    );
    assert.ok(block.includes("opacity: 1"));
    assert.ok(!block.includes("opacity: 0"), "no opacity-zero start on headline words");
    assert.ok(!block.includes("opacity: 0.001"));
  });

  it("pre-hides below-fold words only behind .lm-js (no-JS visibility)", () => {
    assert.ok(
      TOKENS.includes(".lm-js .lm-reveal .lm-word-blur > span"),
      "the hidden state must be gated on .lm-js",
    );
    assert.ok(
      TOKENS.includes('.lm-js .lm-reveal[data-visible="true"] .lm-word-blur > span'),
      "the reveal state is data-visible driven",
    );
    // And the hero words are never pre-hidden at all.
    assert.ok(!TOKENS.includes(".lm-js .lm-hero-word"));
  });

  it("locks the measured mock crossfade: 700ms in, 500ms out, body easing", () => {
    assert.ok(TOKENS.includes(".lm-js .lm-mock-layer"));
    assert.ok(TOKENS.includes("opacity 500ms var(--lm-ease-body)"));
    assert.ok(TOKENS.includes("opacity 700ms var(--lm-ease-body)"));
    assert.ok(TOKENS.includes('visibility 0s 500ms'));
  });

  it("locks the measured status-pill swap easing", () => {
    assert.ok(
      TOKENS.includes("transition: opacity 500ms cubic-bezier(0.42, 0, 0.58, 1)"),
    );
  });

  it("triggers the mock swap at the measured 0.3 intersection threshold", () => {
    assert.ok(SHOWCASE.includes("threshold: 0.3"));
    assert.ok(SHOWCASE.includes("data-practice-index"));
    assert.ok(PANEL.includes("data-active"));
  });

  it("covers the new classes in the reduced-motion block", () => {
    const reduced = TOKENS.slice(TOKENS.indexOf("@media (prefers-reduced-motion: reduce)"));
    assert.ok(reduced.includes(".lm-hero-word"));
    assert.ok(reduced.includes(".lm-word-blur"));
    assert.ok(reduced.includes(".lm-mock-layer"));
    assert.ok(reduced.includes(".lm-pill-swap"));
  });

  it("the sticky stage and the jump strip clear the shared header", () => {
    assert.ok(SHOWCASE.includes("lg:sticky lg:top-[150px]"));
    assert.ok(NAV.includes("sticky top-16"));
    assert.ok(NAV.includes("md:top-18"));
  });

  it("the stage geometry exists only under .lm-js (no-JS stacking)", () => {
    // Without JavaScript the stage keeps its natural height
    // and the four miniatures stack in flow; the fixed
    // 710px stage, the absolute layer box and the absolute
    // counter foot are all .lm-js-gated.
    assert.ok(TOKENS.includes(".lm-js .lm-solutions-stage"));
    assert.ok(TOKENS.includes("height: 710px"));
    assert.ok(TOKENS.includes(".lm-js .lm-mock-stage"));
    assert.ok(TOKENS.includes("inset: 215px 52px 84px"));
    assert.ok(TOKENS.includes(".lm-js .lm-mock-stage-foot"));
    // And the component does not hardcode the height.
    assert.ok(!PANEL.includes("h-[710px]"));
  });
});

describe("Solutions page (routes + a11y)", () => {
  it("every published href resolves to a file, a mailto or a rendered anchor", () => {
    const hrefs = [
      ...CONTENT.matchAll(/href: "([^"]+)"/g),
    ].map((m) => m[1]);
    assert.ok(hrefs.length >= 4);
    for (const href of hrefs) {
      if (href.startsWith("mailto:")) continue;
      if (href.startsWith("#")) {
        assert.ok(
          SHOWCASE.includes(`id="${href.slice(1)}"` as never) ||
            CATEGORIES.some((c) => c.id === href.slice(1)),
          `anchor ${href} must match a category id`,
        );
        continue;
      }
      const leaf = href === "/" ? "page.tsx" : `${href}/page.tsx`;
      const groups = ["app", "app/(marketing)", "app/(auth)"];
      assert.ok(
        groups.some((group) =>
          existsSync(join(import.meta.dirname, "../..", group, leaf)),
        ),
        `${href} must resolve to a route`,
      );
    }
  });

  it("decorative miniatures and icons are hidden from assistive tech", () => {
    assert.ok(CLOSING.includes('aria-hidden="true"'));
    assert.ok(MOCKS_TSX.includes('aria-hidden="true"'));
    // The panel itself is real content on desktop (the only
    // place the miniatures exist there), so its root carries
    // a label, not aria-hidden; only the counter footer is
    // decorative duplication.
    assert.ok(PANEL.includes('aria-label="Practice miniature"'));
    assert.ok(
      !PANEL.includes('lg:block" aria-hidden'),
      "the stage root must stay exposed to assistive tech",
    );
  });

  it("keeps every interactive element at or above the 44px floor", () => {
    assert.ok(NAV.includes("min-h-11"));
    assert.ok(PLAN.includes("min-h-11"));
    assert.ok(CLOSING.includes("min-h-11"));
  });

  it("no fixed pixel width that can overflow a 320px viewport", () => {
    for (const [name, source] of SOLUTIONS_SOURCES) {
      const code = codeOnly(source);
      // A max-width ceiling cannot overflow; a hard width can.
      assert.ok(
        !/(?<!max-)\bw-\[\d{3,}px\]/.test(code),
        `${name}: no fixed widths of 100px or more`,
      );
    }
  });
});
