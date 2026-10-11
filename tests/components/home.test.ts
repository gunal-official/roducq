/**
 * Home page (redesign, 2026-10-10) — structural tests plus the truthfulness
 * guards that keep a landing page from outgrowing the product it describes.
 *
 * Three halves.
 *
 *  1. SHAPE. The seven bands (A→G) exist, in order, and the two ways into
 *     the funnel point at /signup and /vs. The pricing teaser points at
 *     /pricing. The limitation callout is on the page — not buried, not
 *     implied — because roducq collects no e-signatures and takes no
 *     payments, and a landing page that forgets to say so is selling
 *     something that doesn't exist.
 *
 *  2. TRUTHFULNESS. Every string a visitor reads lives in a data module and
 *     is asserted here: no invented customer counts, no invented numbers
 *     (the only figure on the page is the free plan's $0), and every mention
 *     of signatures, cards, payments or accounting belongs to the LIMITATION
 *     block — i.e. it is there to say roducq does NOT do it.
 *
 *  3. TOKENS. Per-item colour comes from an explicit class map, never from a
 *     template-interpolated class Tailwind cannot see. The page uses the
 *     display face for headings and 44px tap targets for inline links.
 *
 * Source-level + real imports, like tests/components/pricing.test.ts:
 * node:test, zero test deps.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CLOSING,
  COMPARE,
  FEATURES,
  FEATURES_SECTION,
  HERO,
  LIMITATION,
  PIPELINE,
  PIPELINE_SECTION,
  PRICING_TEASER,
  RAIL,
  TONE_CHIP_CLASS,
  TONE_RULE_CLASS,
} from "../../app/(marketing)/home/content.ts";
import { VS_PAGE_LIST } from "../../app/(marketing)/vs/[slug]/vs-pages.ts";

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const PAGE = read("app/(marketing)/page.tsx");
const CONTENT = read("app/(marketing)/home/content.ts");
const HARNESS = read("scripts/verify-responsive.mjs");
const SHOTS = read("scripts/build-home-screenshots.py");

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
  HERO,
  RAIL,
  PIPELINE_SECTION,
  PIPELINE,
  FEATURES_SECTION,
  FEATURES,
  COMPARE,
  PRICING_TEASER,
  CLOSING,
  LIMITATION,
]);

const LIMITATION_COPY = strings(LIMITATION);

/* ── Shape: sections A → G ──────────────────────────────────────────────── */

describe("/ home page structure", () => {
  it("renders all seven bands, in order", () => {
    const markers = ["A. Hero", "B. Capability rail", "C. The pipeline",
      "D. Feature grid", "E. Compare teaser", "F. Pricing teaser",
      "G. Closing CTA"];
    let at = -1;
    for (const marker of markers) {
      const found = PAGE.indexOf(marker, at + 1);
      assert.notEqual(found, -1, `page is missing section "${marker}"`);
      assert.ok(found > at, `section "${marker}" is out of order`);
      at = found;
    }
  });

  it("documents the band order in the module docstring too", () => {
    assert.match(CONTENT, /A\s+Hero/);
    assert.match(CONTENT, /G\s+Closing CTA/);
  });

  it("is a server component with no client interactivity to hydrate", () => {
    assert.doesNotMatch(PAGE, /"use client"/);
    assert.doesNotMatch(PAGE, /useState|useEffect|onClick/);
  });
});

describe("/ hero (A)", () => {
  it("has an eyebrow, an H1 and supporting copy", () => {
    assert.ok(HERO.eyebrow.trim(), "eyebrow");
    assert.ok(HERO.title.length > 20, "H1 should be a sentence, not a wordmark");
    assert.ok(HERO.intro.length > 120, "intro should explain the product");
    assert.ok(HERO.note.trim(), "note under the CTAs");
  });

  it("renders the H1 from the content module, not a literal", () => {
    assert.match(PAGE, /<h1[^>]*>\s*\{HERO\.title\}\s*<\/h1>/);
    assert.doesNotMatch(
      PAGE,
      /Messy client messages in\./,
      "hero copy belongs in content.ts, not duplicated in page.tsx",
    );
  });

  it("has exactly two hero CTAs, to /signup and /vs", () => {
    assert.equal(HERO.primaryCta.href, "/signup");
    assert.equal(HERO.secondaryCta.href, "/vs");
    assert.ok(HERO.primaryCta.label.trim(), "primary CTA label");
    assert.ok(HERO.secondaryCta.label.trim(), "secondary CTA label");
  });

  it("renders both CTA hrefs from the content module", () => {
    assert.match(PAGE, /href=\{HERO\.primaryCta\.href\}/);
    assert.match(PAGE, /href=\{HERO\.secondaryCta\.href\}/);
  });

  it("the H1 is the display face and the CTA row is 44px", () => {
    assert.match(PAGE, /font-display[^"]*"/, "hero heading uses Playfair Display");
    assert.match(PAGE, /size="lg"/, "hero CTAs use the 48px button size");
  });
});

/* ── The limitation callout (G) ─────────────────────────────────────────── */

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

  it("is rendered on the page as a labelled, test-addressable note", () => {
    assert.match(PAGE, /data-testid="home-limitation"/);
    assert.match(PAGE, /role="note"/);
    assert.match(PAGE, /aria-label=\{LIMITATION\.title\}/);
    assert.match(PAGE, /\{LIMITATION\.summary\}/);
    assert.match(PAGE, /\{LIMITATION\.detail\}/);
  });

  it("points the reader at the comparisons for the long version", () => {
    assert.equal(LIMITATION.href, "/vs");
    assert.match(PAGE, /href=\{LIMITATION\.href\}/);
    assert.ok(LIMITATION.hrefLabel.trim(), "the link needs a label");
  });

  it("sits inside section G, after the closing CTA", () => {
    const closing = PAGE.indexOf("G. Closing CTA");
    const callout = PAGE.indexOf("home-limitation");
    assert.ok(closing > -1 && callout > closing, "callout belongs to section G");
  });
});

/* ── Pricing teaser (F) ─────────────────────────────────────────────────── */

describe("/ pricing teaser", () => {
  it("links to /pricing", () => {
    assert.equal(PRICING_TEASER.cta.href, "/pricing");
    assert.match(PAGE, /href=\{PRICING_TEASER\.cta\.href\}/);
    assert.ok(PRICING_TEASER.cta.label.trim(), "pricing CTA needs a label");
  });

  it("carries the per-workspace, not-per-seat contract", () => {
    const copy = `${PRICING_TEASER.title} ${PRICING_TEASER.intro} ${PRICING_TEASER.bullets.join(" ")}`;
    assert.match(copy, /per workspace/i);
    assert.match(copy, /not per seat|never per seat/i);
  });

  it("claims no brief, seat or AI limits — matching /pricing", () => {
    const copy = PRICING_TEASER.bullets.join(" ");
    assert.match(copy, /No brief, seat or AI limits/i);
    assert.doesNotMatch(copy, /\b\d+\s*(briefs?|seats?|users?)\s*(?:\/|per)\s*month\b/i);
  });

  it("keeps the teaser honest about the free plan", () => {
    assert.match(PRICING_TEASER.intro, /free plan/i);
    assert.match(PRICING_TEASER.intro, /Stripe/);
    assert.match(PRICING_TEASER.intro, /cancel/i);
  });
});

/* ── Compare teaser (E) ─────────────────────────────────────────────────── */

describe("/ compare teaser", () => {
  it("links to the /vs hub", () => {
    assert.equal(COMPARE.cta.href, "/vs");
    assert.match(PAGE, /href=\{COMPARE\.cta\.href\}/);
  });

  it("renders the competitor chips from the live VS_PAGE_LIST", () => {
    assert.match(PAGE, /VS_PAGE_LIST\.map/);
    assert.match(PAGE, /href=\{`\/vs\/\$\{entry\.slug\}`\}/);
    // ...and therefore cannot advertise a comparison /vs does not serve.
    for (const entry of VS_PAGE_LIST) {
      assert.ok(entry.slug.trim(), "comparison slug");
      assert.ok(entry.competitor.trim(), "comparison name");
    }
    assert.ok(VS_PAGE_LIST.length >= 8, "the /vs hub should have real breadth");
  });
});

/* ── Pipeline (C) + feature grid (D) ────────────────────────────────────── */

describe("/ pipeline (C)", () => {
  it("is the five real stages, in product order", () => {
    assert.deepEqual(
      PIPELINE.map((p) => p.title),
      ["Intake", "Brief", "Proposal", "Plan", "Update"],
    );
    assert.deepEqual(
      PIPELINE.map((p) => p.step),
      [1, 2, 3, 4, 5],
    );
  });

  it("every stage names an icon and a tone the page can resolve", () => {
    for (const step of PIPELINE) {
      assert.ok(step.copy.length > 60, `${step.title}: needs real copy`);
      assert.ok(step.tone in TONE_CHIP_CLASS, `${step.title}: unknown tone`);
      assert.ok(step.tone in TONE_RULE_CLASS, `${step.title}: unknown tone`);
    }
    // The page maps icon keys → components; every key in the data must exist.
    for (const step of PIPELINE) {
      assert.match(
        PAGE,
        new RegExp(`^\\s+${step.icon}: \\w+,`, "m"),
        `page.tsx has no icon mapped for "${step.icon}"`,
      );
    }
  });

  it("renders as an ordered list, because order is the point", () => {
    assert.match(PAGE, /<ol[\s\S]*?PIPELINE\.map[\s\S]*?<\/ol>/);
  });
});

describe("/ feature grid (D)", () => {
  it("covers the supporting surfaces, once each", () => {
    assert.equal(FEATURES.length, 6);
    const titles = FEATURES.map((f) => f.title);
    assert.equal(new Set(titles).size, titles.length, "no duplicate features");
    for (const feature of FEATURES) {
      assert.ok(feature.copy.length > 60, `${feature.title}: needs real copy`);
      assert.ok(feature.tone in TONE_CHIP_CLASS, `${feature.title}: unknown tone`);
      assert.match(
        PAGE,
        new RegExp(`^\\s+${feature.icon}: \\w+,`, "m"),
        `page.tsx has no icon mapped for "${feature.icon}"`,
      );
    }
  });

  it("has a section heading of its own", () => {
    assert.ok(FEATURES_SECTION.title.trim());
    assert.ok(PIPELINE_SECTION.title.trim());
    assert.ok(FEATURES_SECTION.intro.length > 60);
  });
});

/* ── Truthfulness ───────────────────────────────────────────────────────── */

describe("/ home truthfulness", () => {
  it("publishes no invented customer, team or usage numbers", () => {
    for (const line of ALL_COPY) {
      assert.doesNotMatch(
        line,
        /\b\d[\d,]*\+?\s*(?:customers?|users?|teams?|companies|freelancers|studios|hours saved)\b/i,
        `invented social proof: "${line}"`,
      );
      assert.doesNotMatch(line, /\b\d+[kKmM]\+/, `rounded vanity metric: "${line}"`);
      assert.doesNotMatch(line, /\b\d+%/, `unsupported percentage: "${line}"`);
    }
  });

  it("the only price figure anywhere on the page is the free plan's $0", () => {
    const figures = ALL_COPY.join("\n").match(/\$\d[\d,]*(?:\.\d{2})?/g) ?? [];
    assert.deepEqual(figures, ["$0"], "no invented prices on the landing page");
  });

  it("every signature / payment / accounting mention belongs to the limits", () => {
    for (const line of ALL_COPY) {
      if (!/signature|e-sign|card|payment|accounting/i.test(line)) continue;
      assert.ok(
        LIMITATION_COPY.includes(line),
        `copy about money or signatures must live in LIMITATION, got: "${line}"`,
      );
    }
    assert.ok(LIMITATION_COPY.length > 0, "LIMITATION must not be empty");
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
    assert.match(metadata, /no e-signature/i);
    assert.match(metadata, /payment collection/i);
  });

  it("claims only capabilities the repo actually ships", () => {
    // Each of these is a real surface under app/(app)/.
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
    ]) {
      assert.doesNotThrow(() => readFileSync(new URL(`../../${path}`, import.meta.url)), `missing ${path}`);
    }
  });
});

/* ── Design tokens: no dynamic classes ──────────────────────────────────── */

describe("/ home design tokens", () => {
  it("never builds a Tailwind class at runtime", () => {
    // A template-literal className is invisible to Tailwind's scanner, so a
    // class assembled from a variable silently vanishes from the build.
    assert.doesNotMatch(
      PAGE,
      /className=\{`/,
      "page.tsx interpolates a className — use an explicit class map instead",
    );
    assert.doesNotMatch(PAGE, /className=\{[^}]*\$\{/);
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
      ...PIPELINE.map((p) => p.tone),
      ...FEATURES.map((f) => f.tone),
    ]);
    for (const tone of used) {
      assert.ok(tone in TONE_CHIP_CLASS, `tone "${tone}" has no chip class`);
      assert.ok(tone in TONE_RULE_CLASS, `tone "${tone}" has no rule class`);
    }
  });

  it("uses the token radius and no private hex colours", () => {
    assert.doesNotMatch(PAGE, /rounded-\[/, "bypasses the --radius token");
    assert.doesNotMatch(PAGE, /#[0-9a-fA-F]{3,8}\b/, "hardcodes a hex colour");
    assert.doesNotMatch(CONTENT, /rounded-\[/);
  });

  it("headings use Playfair Display inside a Source Sans 3 body", () => {
    assert.match(PAGE, /font-display/);
    const config = read("tailwind.config.ts");
    assert.match(config, /display:\s*\[\s*"var\(--font-playfair\)"/);
    assert.match(config, /var\(--font-source-sans\)/);
  });

  it("inline text links clear the 44px tap target", () => {
    assert.match(PAGE, /min-h-11/);
  });

  it("icons stay on the 16/20/24 scale with stroke handled globally", () => {
    for (const match of PAGE.matchAll(/className="(h-\d(?: w-\d)?[^"]*)"/g)) {
      const size = match[1].match(/h-(\d)/)?.[1];
      assert.ok(
        size === "4" || size === "5" || size === "6",
        `off-scale icon height h-${size} — the scale is 16/20/24`,
      );
    }
    assert.match(read("app/globals.css"), /svg\.lucide \{\s*stroke-width: 1\.5/);
  });

  it("decorative icons are hidden from assistive tech", () => {
    // Whole self-closing elements, so the aria attribute is inside the match.
    const icons = (PAGE.match(/<[A-Z][A-Za-z]*\b[^>]*\/>/g) ?? []).filter(
      (tag) => /className="h-\d/.test(tag),
    );
    assert.ok(icons.length >= 6, "the page should be illustrated");
    for (const icon of icons) {
      assert.match(
        icon,
        /aria-hidden="true"|aria-label=/,
        `icon without an aria attribute: ${icon}`,
      );
    }
  });
});

/* ── Screenshots + responsive harness ───────────────────────────────────── */

describe("/ home screenshot evidence", () => {
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
    assert.doesNotMatch(
      SHOTS,
      /Messy client messages in\./,
      "copy must come from content.ts, not be hardcoded in the script",
    );
  });

  it("renders one shot per theme", () => {
    assert.match(SHOTS, /render\("light", DOCS \/ "home-light\.png"\)/);
    assert.match(SHOTS, /render\("dark", DOCS \/ "home-dark\.png"\)/);
  });
});

describe("/ home stays in the responsive harness", () => {
  it("the harness still audits / as a marketing route", () => {
    assert.match(
      HARNESS,
      /\{\s*slug:\s*"marketing-home",\s*url:\s*"\/",\s*auth:\s*false\s*\}/,
      "scripts/verify-responsive.mjs must keep the marketing-home route",
    );
  });
});
