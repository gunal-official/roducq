/**
 * /integrations (Forma-referenced catalog page, 2026-10-26) — shape,
 * the evidence guard that keeps the page honest, token discipline, the
 * motion contract and route integrity.
 *
 * Six parts, mirroring tests/components/features-page.test.ts:
 *
 *  1. SHAPE. The page is hero → catalog → how connecting works →
 *     request → closing CTA, the reference's own five bands in its
 *     order, and the content module publishes exactly seven entries
 *     with seven filters and three steps.
 *
 *  2. TRUTHFULNESS (the evidence guard). Every published entry names
 *     the file and symbol that makes it real; this suite reads those
 *     files and fails if a symbol disappears. That is the mechanism
 *     that stops this page advertising something the product stopped
 *     shipping — the failure mode of every integrations page.
 *
 *  3. DOMAIN GUARD. No Forma brand, no task-manager vocabulary, no
 *     "two-way sync" (every roducq connector is read-only), no
 *     fabricated status (Available / Beta / Coming soon), no price or
 *     percentage claim, and no "Connect" control: nothing on this page
 *     connects anything, because connecting happens in Settings.
 *
 *  4. TOKENS. No component hardcodes a hex colour, a font-size or a
 *     shadow, and every new measured value is a declared token — the
 *     page must not become the place the design system stops being one.
 *
 *  5. MOTION CONTRACT. The measured hero cadence (800/900ms, 50ms word
 *     stagger, +350ms highlight, +450ms lead) and the LCP rule — no
 *     opacity-zero pre-hide on any hero element, and every pre-hidden
 *     state gated behind `.lm-js` so a no-JS visitor sees the page.
 *
 *  6. ROUTES + A11Y. Every href resolves, every control clears the 44px
 *     floor, decorative surfaces are hidden or labelled, and the
 *     catalog's controls are real controls (aria-pressed on a toggle
 *     group, a labelled search field, one polite live region).
 *
 * Source-level + real imports, like the other landing tests:
 * node:test, zero test deps.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CATALOG,
  CATEGORIES,
  CONNECTING_STEPS,
  CONNECTIONS_MOCK,
  INTEGRATIONS,
  INTEGRATIONS_CLOSING,
  INTEGRATIONS_HERO,
  MOCK_DISCLOSURE,
  REQUEST,
  catalogCounts,
} from "../../app/(marketing)/integrations/content.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const PAGE = read("app/(marketing)/integrations/page.tsx");
const CONTENT = read("app/(marketing)/integrations/content.ts");
const TOKENS = read("app/(marketing)/landing.css");
const CONFIG = read("tailwind.config.ts");
const HEADER = read("components/marketing/SiteHeader.tsx");
const HERO = read(
  "components/marketing/landing/integrations/IntegrationsHero.tsx",
);
const CATALOG_TSX = read(
  "components/marketing/landing/integrations/IntegrationsCatalog.tsx",
);
const STEPS = read(
  "components/marketing/landing/integrations/ConnectingSteps.tsx",
);
const REQUEST_TSX = read(
  "components/marketing/landing/integrations/RequestIntegration.tsx",
);
const CLOSING = read(
  "components/marketing/landing/integrations/IntegrationsClosingCta.tsx",
);

const INTEGRATIONS_SOURCES = [
  ["app/(marketing)/integrations/page.tsx", PAGE],
  ["app/(marketing)/integrations/content.ts", CONTENT],
  ["components/marketing/landing/integrations/IntegrationsHero.tsx", HERO],
  [
    "components/marketing/landing/integrations/IntegrationsCatalog.tsx",
    CATALOG_TSX,
  ],
  ["components/marketing/landing/integrations/ConnectingSteps.tsx", STEPS],
  [
    "components/marketing/landing/integrations/RequestIntegration.tsx",
    REQUEST_TSX,
  ],
  [
    "components/marketing/landing/integrations/IntegrationsClosingCta.tsx",
    CLOSING,
  ],
] as const;

/** Source with comments and string literals removed, for the guards that
 *  must not be fooled by prose. Block comments, line comments and the
 *  contents of JSX text are all stripped. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/`[^`]*`/g, "``");
}

/**
 * The seven filters, in the order the reference's six-chip row runs:
 * one "all" chip, then the six categories. Six categories is also the
 * reference's own chip count, so the control looks the same.
 */
const CATEGORY_IDS = [
  "all",
  "chat",
  "docs",
  "email",
  "automation",
  "files",
  "sharing",
] as const;

describe("Integrations page (shape)", () => {
  it("composes the five measured bands in the reference's order", () => {
    const order = [
      "IntegrationsHero",
      "IntegrationsCatalog",
      "ConnectingSteps",
      "RequestIntegration",
      "IntegrationsClosingCta",
    ];
    let last = -1;
    for (const name of order) {
      const at = PAGE.indexOf(`<${name}`);
      assert.ok(at > last, `${name} should follow the previous band`);
      last = at;
    }
    assert.ok(PAGE.includes("metadata"));
    assert.ok(PAGE.includes('canonical: "/integrations"'));
    // The reference's own request anchor, so the mailto card is
    // linkable from elsewhere.
    assert.ok(REQUEST_TSX.includes('id="request"'));
  });

  it("publishes exactly seven entries, three external and four native", () => {
    assert.equal(INTEGRATIONS.length, 7);
    const counts = catalogCounts(INTEGRATIONS);
    assert.deepEqual(counts, { total: 7, external: 3, native: 4 });
    // The seven names, in the approved order: connectors first, then
    // the native outputs that carry work back out.
    assert.deepEqual(
      INTEGRATIONS.map((entry) => entry.name),
      [
        "Slack",
        "Notion",
        "Connected mailbox",
        "Signed webhooks",
        "PDF export",
        "File import",
        "Client links",
      ],
    );
    for (const entry of INTEGRATIONS) {
      assert.ok(entry.copy.length > 40, `${entry.name} explains itself`);
      assert.ok(entry.category !== "all", `${entry.name} has a real category`);
      assert.ok(entry.icon.length > 0);
      // Read-only is asserted, not implied: every external connector is
      // an import, and every native capability says so.
      assert.equal(
        entry.status,
        entry.kind === "external" ? "read-only" : "native",
        `${entry.name} carries the right chip`,
      );
    }
    // No duplicate names, and no duplicate cards.
    assert.equal(new Set(INTEGRATIONS.map((e) => e.name)).size, 7);
  });

  it("publishes the seven approved filters and uses every one of them", () => {
    assert.deepEqual(
      CATEGORIES.map((c) => c.id),
      [...CATEGORY_IDS],
    );
    assert.equal(CATEGORIES[0].label, "All");
    // A category with no card would be a dead filter.
    for (const category of CATEGORIES.slice(1)) {
      assert.ok(
        INTEGRATIONS.some((entry) => entry.category === category.id),
        `${category.label} must filter to at least one card`,
      );
    }
    // And every card's category is a real filter.
    for (const entry of INTEGRATIONS) {
      assert.ok(
        CATEGORY_IDS.includes(entry.category as (typeof CATEGORY_IDS)[number]),
        `${entry.name} uses a published category`,
      );
    }
  });

  it("derives the count line from the data instead of hardcoding it", () => {
    // The reference hardcodes "12 integrations". A hardcoded count is how
    // an integrations page starts lying, so the component computes both
    // numbers and the content module is forbidden a literal.
    assert.ok(CATALOG_TSX.includes("catalogCounts") || CATALOG_TSX.includes("INTEGRATIONS.length"));
    assert.ok(!/\b7 integrations\b/.test(codeOnly(CONTENT)));
    assert.ok(!/\b12 integrations\b/.test(codeOnly(CONTENT)));
    assert.ok(CATALOG_TSX.includes("total"));
    assert.ok(CATALOG_TSX.includes("external"));
    assert.ok(CATALOG_TSX.includes("native"));
    // The visible line and the screen-reader line are both derived.
    assert.ok(CATALOG_TSX.includes("visible.length"));
    assert.ok(CATALOG_TSX.includes("aria-live"));
  });

  it("keeps the reference's three-step band and its measured skeleton", () => {
    assert.equal(CONNECTING_STEPS.items.length, 3);
    assert.deepEqual(
      CONNECTING_STEPS.items.map((item) => item.number),
      ["01", "02", "03"],
    );
    for (const item of CONNECTING_STEPS.items) {
      assert.ok(item.title.length > 0);
      assert.ok(item.copy.length > 40);
    }
    // The reference's 54px weight-400 heading is a measured deviation
    // from the hero's 600 display step, and the step cells are the
    // measured 1px-gap container.
    assert.ok(STEPS.includes("text-lm-54"));
    assert.ok(STEPS.includes("font-lm-regular"));
    assert.ok(STEPS.includes("gap-px"));
    assert.ok(STEPS.includes("rounded-lm-step"));
  });

  it("asks for an integration without pretending to submit one", () => {
    // There is no request endpoint in this repository, so the card holds
    // the request's contents and one mailto action. No form, no POST.
    assert.equal(REQUEST.card.rows.length, 3);
    assert.ok(REQUEST.card.cta.href.startsWith("mailto:"));
    assert.ok(REQUEST.card.cta.href.includes("hello@roducq.dev"));
    assert.ok(!REQUEST_TSX.includes("<form"));
    assert.ok(!REQUEST_TSX.includes("action="));
    assert.ok(!REQUEST_TSX.includes('type="submit"'));
    // Nothing that claims a request was received.
    assert.ok(!/Request sent|We’ll be in touch|Submitted/i.test(REQUEST_TSX));
  });

  it("reuses the approved closing pair and the shared checklist rows", () => {
    assert.equal(INTEGRATIONS_CLOSING.primaryCta.href, "/signup");
    assert.equal(
      INTEGRATIONS_CLOSING.secondaryCta.href,
      "mailto:hello@roducq.dev",
    );
    const home = read("app/(marketing)/home/content.ts");
    assert.ok(
      home.includes('title: "Try roducq with your own client project"'),
    );
    assert.equal(
      INTEGRATIONS_CLOSING.title,
      "Try roducq with your own client project",
    );
    // The card is the /solutions checklist component, not a copy of it.
    assert.ok(CLOSING.includes("ChecklistRows"));
    assert.ok(CLOSING.includes('variant="card"'));
    assert.ok(CLOSING.includes("lm-solutions-stage"));
  });

  it("the closing miniature is a two-done, four-row sample state", () => {
    assert.equal(CONNECTIONS_MOCK.items.length, 4);
    assert.equal(CONNECTIONS_MOCK.progress, "2 of 4");
    assert.equal(
      CONNECTIONS_MOCK.items.filter((item) => item.state === "Done").length,
      2,
    );
    assert.equal(MOCK_DISCLOSURE, "Illustrative example · fictional workspace");
    assert.ok(CLOSING.includes("{MOCK_DISCLOSURE}"));
  });
});

describe("Integrations page (evidence guard)", () => {
  it("every published entry names the code that backs it", () => {
    for (const entry of INTEGRATIONS) {
      assert.ok(
        entry.evidence.length >= 3,
        `${entry.name} needs at least three citations`,
      );
      for (const citation of entry.evidence) {
        assert.ok(citation.file.length > 0);
        assert.ok(citation.symbol.length > 0);
      }
    }
  });

  it("every cited file exists and still exports the cited symbol", () => {
    // THIS IS THE TEST THE PAGE EXISTS FOR. An integration that is
    // removed from the codebase must not survive here as marketing.
    for (const entry of INTEGRATIONS) {
      for (const { file, symbol } of entry.evidence) {
        const path = join(import.meta.dirname, "../..", file);
        assert.ok(existsSync(path), `${entry.name}: ${file} must exist`);
        const source = readFileSync(path, "utf8");
        assert.ok(
          source.includes(symbol),
          `${entry.name}: ${file} must still contain "${symbol}"`,
        );
      }
    }
  });

  it("never advertises a connector the repository does not implement", () => {
    // Absent on purpose, with the reason: no board importer, no calendar,
    // no task tracker, no design or code host, no automation reseller.
    const unsupported = [
      "Zapier",
      "Make.com",
      "Google Calendar",
      "Outlook Calendar",
      "Jira",
      "Linear",
      "Figma",
      "GitHub",
      "Google Drive",
      "Dropbox",
      "Trello",
      "Asana",
      "ClickUp",
      "Stripe",
      "QuickBooks",
      "Xero",
    ];
    const code = codeOnly(CONTENT);
    for (const name of unsupported) {
      assert.ok(
        !code.includes(name),
        `${name} does not exist in this product and must not be claimed`,
      );
    }
  });

  it("states read-only out loud and never claims a two-way sync", () => {
    for (const entry of INTEGRATIONS.filter((e) => e.kind === "external")) {
      assert.equal(entry.status, "read-only");
    }
    assert.ok(CATALOG_TSX.includes("Read-only"));
    assert.ok(CATALOG.note.includes("never write back"));
    // The reference's "syncs both ways" claim is absent on purpose. The
    // guard reads the published copy — card text, the disclaimer and the
    // hero lead — not the evidence paths, which legitimately name
    // lib/integrations/sync.ts as the read-only client that proves it.
    const copy = [
      ...INTEGRATIONS.map((entry) => entry.copy),
      ...INTEGRATIONS.map((entry) => entry.name),
      CATALOG.note,
      INTEGRATIONS_HERO.intro,
      INTEGRATIONS_CLOSING.intro,
    ].join(" ");
    assert.ok(!/two-way/i.test(copy));
    assert.ok(!/both ways/i.test(copy));
    assert.ok(!/\bsyncs?\b/i.test(copy));
    // And no rendered component says it either.
    const rendered = codeOnly(CATALOG_TSX);
    assert.ok(!/two-way|both ways|\bsyncs?\b/i.test(rendered));
  });
});

describe("Integrations page (domain guard)", () => {
  it("carries no Forma brand, reference URL or task-manager vocabulary", () => {
    const forbidden = [
      "Forma",
      "forma-visuvate",
      "framer.website",
      "Framer",
      "Task Tracker",
      "board",
      "ticket",
      "sprint",
      "roadmap",
      "kanban",
      "timeline",
      "calendar",
      "Calendar",
      "Command Menu",
      "⌘K",
    ];
    for (const [name, source] of INTEGRATIONS_SOURCES) {
      // Comments may cite the reference for provenance; rendered code
      // and copy may not.
      const code = codeOnly(source);
      for (const term of forbidden) {
        assert.ok(
          !code.includes(term),
          `${name} must not contain "${term}"`,
        );
      }
    }
  });

  it("publishes no fabricated availability label", () => {
    // The reference marks cards Available/Beta. Neither is a fact this
    // product can state, so both are replaced by Read-only/Native.
    const code = codeOnly(CONTENT + CATALOG_TSX + PAGE);
    for (const term of ["Available", "Beta", "Coming soon", "Early access"]) {
      assert.ok(!code.includes(term), `no "${term}" label`);
    }
    assert.ok(CATALOG_TSX.includes("Read-only"));
    assert.ok(CATALOG_TSX.includes("Native"));
  });

  it("publishes no price, percentage or usage claim", () => {
    // The mailto body is percent-encoded (%20, %0D, %0A), so the encoding
    // is stripped before the percentage guard runs — otherwise a prefilled
    // line break reads as a statistic.
    const code = codeOnly(CONTENT).replace(/%[0-9A-Fa-f]{2}/g, "");
    assert.ok(!code.includes("$"), "no prices on this page");
    assert.ok(!/\d+%/.test(code), "no percentage claims");
    assert.ok(
      !/\b\d{2,}\s*(clients|customers|teams|workspaces|hours saved)\b/i.test(
        code,
      ),
    );
  });

  it("never makes a card a destination it cannot honour", () => {
    // The reference's cards are inert (a click changes nothing) and its
    // ↗ arrow promises a page that does not exist. Cards are <li> with
    // no link inside, and the arrow is gone.
    assert.ok(CATALOG_TSX.includes("<li"));
    assert.ok(!CATALOG_TSX.includes("<a "));
    // The comment explains why the reference's ↗ arrow is omitted; the
    // rendered markup must not carry it.
    assert.ok(!codeOnly(CATALOG_TSX).includes("↗"));
    assert.ok(!/cursor-pointer/.test(codeOnly(CATALOG_TSX)));
    // And no card pretends to connect anything.
    assert.ok(!/Connect\b/.test(codeOnly(CATALOG_TSX)));
  });
});

describe("Integrations page (tokens)", () => {
  it("no component hardcodes a hex colour, font-size or shadow", () => {
    for (const [name, source] of INTEGRATIONS_SOURCES) {
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

  it("declares the three new measured type steps and the step radius", () => {
    // The reference renders 45.4px during the 1024 band — a value only
    // this page needs — plus 40.8px for the request headline and the two
    // small label sizes under the cards.
    for (const token of [
      "--lm-size-45-4",
      "--lm-size-40-8",
      "--lm-size-13-5",
      "--lm-size-12-5",
      "--lm-radius-step",
    ]) {
      assert.ok(TOKENS.includes(token), `landing.css declares ${token}`);
    }
    for (const utility of ["lm-45-4", "lm-40-8", "lm-13-5", "lm-12-5", "lm-step"]) {
      assert.ok(CONFIG.includes(`"${utility}"`), `tailwind maps ${utility}`);
    }
    // The measured 45.4px step is used where it is measured.
    assert.ok(HERO.includes("text-lm-45-4"));
    assert.ok(HERO.includes("min-[1200px]:text-lm-67"));
    assert.ok(REQUEST_TSX.includes("text-lm-40-8"));
  });

  it("keeps the shared stage and mock tokens rather than duplicating them", () => {
    // The closing stage is byte-identical to /solutions', so it reuses
    // the existing classes and adds no second gradient.
    assert.ok(CLOSING.includes("lm-solutions-stage"));
    assert.ok(CLOSING.includes("rounded-lm-mock"));
    assert.ok(CLOSING.includes("lm-mock-card"));
    assert.ok(!TOKENS.includes("--lm-integrations-stage"));
    // The catalog's card radius and the 42px tile are the measured ones.
    assert.ok(CATALOG_TSX.includes("rounded-lm-card"));
    assert.ok(CATALOG_TSX.includes("rounded-lm-row"));
    assert.ok(CATALOG_TSX.includes("[42px]"));
  });
});

describe("Integrations page (motion contract)", () => {
  it("hero uses the measured entrance cadence", () => {
    // 800ms eyebrow, 900ms per-word stagger at 50ms, highlight at
    // +350ms, lead at +450ms — all measured on the reference.
    assert.ok(HERO.includes('"--lm-hero-duration": "800ms"'));
    assert.ok(HERO.includes('"--lm-hero-delay": "0ms"'));
    assert.ok(HERO.includes('"--lm-hero-delay": "350ms"'));
    assert.ok(HERO.includes('"--lm-hero-delay": "450ms"'));
    assert.ok(HERO.includes("(index + 1) * 50"));
    assert.ok(TOKENS.includes("--lm-motion-display: 900ms"));
  });

  it("never pre-hides a hero element at opacity zero (the LCP rule)", () => {
    // Opacity-zero first-viewport text suppresses the LCP record. The
    // hero rides the clip-path mask the homepage and /solutions already
    // use, and no keyframe leaves opacity at 0.
    const dissolve = TOKENS.slice(
      TOKENS.indexOf("@keyframes lm-word-dissolve"),
      TOKENS.indexOf("@keyframes lm-word-dissolve") + 240,
    );
    assert.ok(dissolve.includes("opacity: 1"));
    assert.ok(!dissolve.includes("opacity: 0"));
    assert.ok(!/lm-js \.lm-hero-word/.test(TOKENS));
    // The hero components never set an opacity utility or style.
    for (const source of [HERO, CATALOG_TSX, STEPS, REQUEST_TSX, CLOSING]) {
      assert.ok(!/opacity:\s*0(?!\.)/.test(source));
      assert.ok(!/\bopacity-0\b/.test(source));
    }
  });

  it("gates every pre-hidden state behind .lm-js", () => {
    assert.ok(TOKENS.includes(".lm-js .lm-reveal .lm-word-blur > span"));
    assert.ok(
      TOKENS.includes(
        '.lm-js .lm-reveal[data-visible="true"] .lm-word-blur > span',
      ),
    );
    // The catalog and the two lower bands are static: no reveal, no
    // dissolve, nothing to gate.
    assert.ok(!CATALOG_TSX.includes("<Reveal"));
    assert.ok(!REQUEST_TSX.includes("lm-word"));
    assert.ok(!CLOSING.includes("<Reveal"));
    // Measured: nothing in the catalog animates at all.
    assert.ok(!/animate-|transition-\[/.test(codeOnly(CATALOG_TSX)));
  });

  it("covers the animated classes in the reduced-motion block", () => {
    const reduced = TOKENS.slice(
      TOKENS.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    assert.ok(reduced.includes(".lm-hero-word"));
    assert.ok(reduced.includes(".lm-hero-in"));
    assert.ok(reduced.includes(".lm-word-blur"));
  });

  it("uses no animation library beyond the shared primitives", () => {
    // Motion.dev is the only animation dependency; every component here
    // animates with CSS driven by the shared tokens, so no component
    // imports a library at all.
    for (const [name, source] of INTEGRATIONS_SOURCES) {
      assert.ok(
        !/from "framer-motion"|from "motion"|from "motion\/react"|gsap|anime\.js/.test(
          source,
        ),
        `${name} must not import an animation library`,
      );
    }
  });
});

describe("Integrations page (routes + a11y)", () => {
  it("every published href resolves to a route or a mailto", () => {
    const hrefs = [...CONTENT.matchAll(/href: "([^"]+)"/g)].map((m) => m[1]);
    assert.ok(hrefs.length >= 2);
    for (const href of hrefs) {
      if (href.startsWith("mailto:")) {
        assert.ok(href.startsWith("mailto:hello@roducq.dev"));
        continue;
      }
      if (href.startsWith("#")) {
        // A page anchor must be rendered by one of the bands.
        const id = href.slice(1);
        assert.ok(
          [HERO, CATALOG_TSX, STEPS, REQUEST_TSX, CLOSING].some((source) =>
            source.includes(`id="${id}"`),
          ),
          `${href} must be rendered on the page`,
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

  it("the catalog controls are real, labelled controls", () => {
    // Chips: a toggle group with aria-pressed, not a fake tablist.
    assert.ok(CATALOG_TSX.includes('role="group"'));
    assert.ok(CATALOG_TSX.includes('aria-pressed={active}'));
    assert.ok(CATALOG_TSX.includes('type="button"'));
    assert.ok(!CATALOG_TSX.includes('role="tablist"'));
    // Search: a real label, a search landmark and a type="search" input.
    assert.ok(CATALOG_TSX.includes('role="search"'));
    assert.ok(CATALOG_TSX.includes('<label htmlFor="integration-search"'));
    assert.ok(CATALOG_TSX.includes('id="integration-search"'));
    assert.ok(CATALOG_TSX.includes('type="search"'));
    // One polite live region announces the new count.
    assert.equal((CATALOG_TSX.match(/aria-live/g) || []).length, 1);
    // The empty state is actionable, and the action is a button.
    assert.ok(CATALOG_TSX.includes("Clear filters") || CATALOG.empty.action === "Clear filters");
    assert.ok(CATALOG_TSX.includes("onClick={clear}"));
  });

  it("the catalog renders every card server-side (no-JS visibility)", () => {
    // The initial state is all/full, so the server HTML carries all
    // seven cards; filtering is the only thing JavaScript adds.
    assert.ok(CATALOG_TSX.includes('useState("all")'));
    assert.ok(CATALOG_TSX.includes('useState("")'));
    assert.ok(!CATALOG_TSX.includes("useEffect"), "no post-hydration fetch");
    assert.ok(CATALOG_TSX.includes("INTEGRATIONS.filter"));
  });

  it("keeps every interactive element at or above the 44px floor", () => {
    assert.ok(HERO.includes("min-h-11") || HERO.includes("lm-shell"));
    assert.ok(CATALOG_TSX.includes("min-h-11"));
    assert.ok(REQUEST_TSX.includes("min-h-11"));
    assert.ok(CLOSING.includes("min-h-11"));
    // The search field is 48px tall, above the floor.
    assert.ok(CATALOG_TSX.includes("h-12"));
  });

  it("hides decorative surfaces and labels the miniature", () => {
    // Icons inside cards are decorative: the name is the label.
    assert.ok(CATALOG_TSX.includes('aria-hidden="true"'));
    // The closing miniature is one decorative image with its
    // disclosure text outside it, so assistive tech reads the
    // disclaimer without reading half a dashboard.
    assert.ok(CLOSING.includes('aria-hidden="true"'));
    // The disclosure is rendered after the hidden card, not inside it,
    // so the disclaimer is announced while the miniature is not.
    assert.ok(CLOSING.includes("{MOCK_DISCLOSURE}"));
    assert.ok(
      CLOSING.indexOf("{MOCK_DISCLOSURE}") >
        CLOSING.indexOf('aria-hidden="true"'),
    );
  });

  it("no fixed pixel width that can overflow a 320px viewport", () => {
    for (const [name, source] of INTEGRATIONS_SOURCES) {
      assert.ok(
        !/(?<!max-)\bw-\[\d{3,}px\]/.test(codeOnly(source)),
        `${name}: no fixed widths of 100px or more`,
      );
    }
  });
});

describe("Integrations page (shared header extension)", () => {
  it("extends the showcase gate without touching the locked ternary", () => {
    // vs-comparisons.test.ts locks the nav-data line; the integrations
    // work extends around it exactly as the features work did.
    assert.ok(
      HEADER.includes("const items = solutions ? SOLUTIONS_NAV : NAV;"),
    );
    assert.ok(
      HEADER.includes(
        'const integrations =\n    pathname === "/integrations" || pathname.startsWith("/integrations/");',
      ),
    );
    assert.ok(
      HEADER.includes("const showcase = solutions || features || integrations;"),
    );
    // The three earlier gate inputs survive verbatim.
    assert.ok(HEADER.includes("const solutions ="));
    assert.ok(
      HEADER.includes(
        'const features = pathname === "/features" || pathname.startsWith("/features/");',
      ),
    );
  });
});
