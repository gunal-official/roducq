import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Regression tests for the two WCAG 2.2 AA contrast fixes recorded in
 * docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md §7.2.
 *
 * The failures were measured on rendered pixels, not on token arithmetic, so
 * these tests pin both halves of the fix:
 *
 *   1. the values — the gradient's last stop (`#c084fc` -> `#a855fb`) and the
 *      on-stage white steps (`--lm-cta-faint` 60% -> 76%, the stage's body
 *      copy and 11px mock disclosure -> 94%);
 *   2. the arithmetic — every measured worst-case backdrop, re-composited
 *      against the shipped alpha, must clear its WCAG floor. These backdrops
 *      are the lightest glyph pixel each surface sits on, captured with the
 *      text made transparent; they are the numbers the fixes were sized
 *      against. scripts/sample-marketing-contrast.mjs re-measures them.
 */
const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const CSS = read("app/(marketing)/landing.css");
const CHANGELOG_CLOSING = read(
  "components/marketing/landing/changelog/ChangelogClosingCta.tsx",
);
const INTEGRATIONS_CLOSING = read(
  "components/marketing/landing/integrations/IntegrationsClosingCta.tsx",
);

/** WCAG 2.x relative luminance and contrast ratio, sRGB. */
const channel = (value: number) => {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: number[]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** White at `alpha` painted over `bg`. */
const blend = (alpha: number, bg: number[]) =>
  bg.map((c) => Math.round(255 * alpha + c * (1 - alpha)));

const WHITE = [255, 255, 255];
const CANVAS = [249, 247, 252];
const CANVAS_ALT = [242, 238, 248];

describe("Marketing contrast — gradient headline last stop", () => {
  it("ships a final stop that clears 3:1 on both light planes", () => {
    const stop = [168, 85, 251]; // #a855fb
    assert.ok(
      contrast(stop, WHITE) >= 3,
      `#a855fb on white is ${contrast(stop, WHITE).toFixed(2)}:1`,
    );
    assert.ok(
      contrast(stop, CANVAS) >= 3,
      `#a855fb on the canvas wash is ${contrast(stop, CANVAS).toFixed(2)}:1`,
    );
    assert.ok(
      contrast(stop, CANVAS_ALT) >= 3,
      `#a855fb on the alt wash is ${contrast(stop, CANVAS_ALT).toFixed(2)}:1`,
    );
  });

  it("records why the reference stop could not stay", () => {
    const reference = [192, 132, 252]; // #c084fc — the measured reference
    assert.ok(
      contrast(reference, WHITE) < 3,
      "the reference stop must stay below the large-text floor; otherwise the fix is unnecessary",
    );
  });

  it("declares #a855fb in .lm-text-gradient and nowhere else", () => {
    assert.ok(
      CSS.includes("#a855fb 100%"),
      "landing.css ends .lm-text-gradient on #a855fb",
    );
    assert.ok(
      !CSS.includes("#c084fc 100%"),
      "no gradient stop may still paint the reference colour",
    );
  });
});

describe("Marketing contrast — on-stage white steps", () => {
  it("raises the 14px note step to the smallest passing alpha", () => {
    assert.ok(
      CSS.includes("--lm-cta-faint: rgba(255, 255, 255, 0.76);"),
      "the shared note step is 76% white",
    );
  });

  it("scopes a 94% step to the stage's 11px disclosure and body copy", () => {
    assert.ok(
      CSS.includes(".lm-stage-disclosure,") &&
        CSS.includes(".lm-solutions-stage .text-lm-cta-muted {") &&
        CSS.includes("color: rgba(255, 255, 255, 0.94);"),
      "the stage's small labels and body copy share one 94% rule",
    );
    // The measured reference steps stay on the tokens; the contrast rule
    // paints over them, so a reader can still see what the capture read.
    assert.ok(CSS.includes("--lm-cta-muted: rgba(255, 255, 255, 0.76);"));
    assert.ok(CSS.includes("--lm-cta-muted: rgba(255, 255, 255, 0.74);"));
  });

  it("wires the rule onto both mock disclosures", () => {
    for (const [name, source] of [
      ["/changelog", CHANGELOG_CLOSING],
      ["/integrations", INTEGRATIONS_CLOSING],
    ] as const) {
      assert.ok(
        source.includes("lm-stage-disclosure"),
        `${name} disclosure carries the contrast class`,
      );
      assert.match(
        source,
        /lm-stage-disclosure[^"]*text-lm-chip/,
        `${name} disclosure keeps its 11px step`,
      );
    }
  });
});

describe("Marketing contrast — measured worst cases", () => {
  /** [label, alpha as shipped, lightest glyph backdrop, WCAG floor] */
  const CASES: Array<[string, number, number[], number]> = [
    ["stage body at 768px", 0.94, [116, 93, 212], 4.5],
    ["stage body at 768px (/changelog)", 0.94, [115, 93, 211], 4.5],
    ["stage body at 1024px", 0.94, [112, 88, 211], 4.5],
    ["stage body at 390px", 0.94, [100, 79, 194], 4.5],
    ["mock disclosure at 320px", 0.94, [126, 87, 217], 4.5],
    ["mock disclosure at 390px", 0.94, [125, 86, 214], 4.5],
    ["stage note at 1440px", 0.76, [99, 68, 197], 4.5],
    ["stage note at 320px", 0.76, [88, 63, 207], 4.5],
  ];

  it("clears the small-text floor on every captured backdrop", () => {
    for (const [label, alpha, bg, floor] of CASES) {
      const measured = contrast(blend(alpha, bg), bg);
      assert.ok(
        measured >= floor,
        `${label}: ${alpha * 100}% white on rgb(${bg.join(",")}) is ${measured.toFixed(2)}:1, needs ${floor}`,
      );
    }
  });

  it("confirms the steps it replaced would still fail those backdrops", () => {
    // 60% white was the documented note step, 76% the body step. Both are
    // pinned so a later "softening" of the stage copy fails here instead of
    // shipping silently.
    assert.ok(contrast(blend(0.6, [99, 68, 197]), [99, 68, 197]) < 4.5);
    assert.ok(contrast(blend(0.6, [126, 87, 217]), [126, 87, 217]) < 4.5);
    assert.ok(contrast(blend(0.76, [126, 87, 217]), [126, 87, 217]) < 4.5);
    assert.ok(contrast(blend(0.76, [116, 93, 212]), [116, 93, 212]) < 4.5);
  });
});
