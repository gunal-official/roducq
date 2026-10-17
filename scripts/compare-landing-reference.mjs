#!/usr/bin/env node
/**
 * compare-landing-reference — measured difference report between two captures.
 *
 * It reads the two `*-metrics.json` files produced by
 * `capture-landing-reference.mjs` and prints, per viewport and theme, the
 * measured differences that matter for fidelity: document height, overflow,
 * band geometry and background, and the computed typography / colour /
 * box of the landmark elements in each band.
 *
 * THE COMPARISON IS ROLE-BASED, NOT SELECTOR-BASED. The two pages have
 * different class names (Framer generates them per build) and different
 * copy, so there is no selector to match on. What does match is the
 * *role* of an element inside its band: the first heading, the first
 * paragraph, the first call-to-action, the first card. Comparing role to
 * role is what makes the result a statement about the design rather than
 * about the markup.
 *
 * It never invents a verdict: it prints the two measured numbers and the
 * difference, and the reader decides whether the difference matters.
 *
 * RUN
 *   node scripts/compare-landing-reference.mjs \
 *     --a docs/screenshots/forma-reference/forma-metrics.json \
 *     --b docs/screenshots/forma-reference/roducq-metrics.json \
 *     --label-a forma --label-b roducq
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const A_PATH = arg("a", "docs/screenshots/forma-reference/forma-metrics.json");
const B_PATH = arg("b", "docs/screenshots/forma-reference/roducq-metrics.json");
const LABEL_A = arg("label-a", "A");
const LABEL_B = arg("label-b", "B");

const A = JSON.parse(readFileSync(resolve(A_PATH), "utf8"));
const B = JSON.parse(readFileSync(resolve(B_PATH), "utf8"));

/** Style keys worth reporting, in report order. */
const KEYS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "color",
  "backgroundColor",
  "borderTopWidth",
  "borderTopColor",
  "borderRadius",
  "boxShadow",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "gap",
  "gridTemplateColumns",
  "maxWidth",
  "transitionDuration",
  "transitionTimingFunction",
  "animationName",
  "animationDuration",
  "animationDelay",
  "animationTimingFunction",
];

/** The capture writes `viewport` as either a name or as {w,h}. Normalise. */
const viewportName = (entry) =>
  typeof entry.viewport === "string"
    ? entry.viewport
    : `${entry.viewport.w}x${entry.viewport.h}`;

const key = (entry) => `${viewportName(entry)}|${entry.theme}`;

/**
 * The reference serves Manrope as a variable font and names the family
 * "Manrope Variable"; this page serves the same typeface under the name
 * "Manrope". The family STRING differs but the typeface does not, so the
 * report would otherwise report a difference that is not one.
 */
const normalise = (value) => {
  if (typeof value !== "string") return value;
  return value
    .replace(/Manrope Variable/g, "Manrope")
    .replace(/Placeholder/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const byKey = new Map(B.map((e) => [key(e), e]));
const out = [];
const say = (line = "") => out.push(line);

say("MEASURED LANDING DIFFERENCE REPORT");
say(`  A (reference) = ${LABEL_A}  ${A_PATH}`);
say(`  B (this page) = ${LABEL_B}  ${B_PATH}`);
say("  Every value below is read from getBoundingClientRect()/getComputedStyle()");
say("  on a live page. Nothing is hand-entered.");
say("");

/* ── Fonts ─────────────────────────────────────────────────────────── */
say("── FONT STACKS ──────────────────────────────────────────────────────");
const fontsFor = (entry) =>
  (entry.fonts || [])
    .map((f) => `${f.family} ×${f.count}`)
    .sort((a, b) => b.split("×")[1] - a.split("×")[1])
    .slice(0, 4)
    .join("  |  ");
const first = A[0];
if (first) {
  say(`${LABEL_A}: ${fontsFor(first)}`);
  say(`${LABEL_B}: ${fontsFor(B[0] || {})}`);
}
say("");

/* ── Per viewport ──────────────────────────────────────────────────── */
for (const entryA of A) {
  const entryB = byKey.get(key(entryA));
  if (!entryB) continue;
  const vp = `${entryA.viewport} ${entryA.theme}`;

  say(`── ${vp} ${"─".repeat(Math.max(0, 60 - vp.length))}`);
  say(
    `  document height   ${LABEL_A} ${entryA.document.scrollHeight}px   ` +
      `${LABEL_B} ${entryB.document.scrollHeight}px   ` +
      `Δ ${entryB.document.scrollHeight - entryA.document.scrollHeight}px`,
  );
  say(
    `  horizontal overflow ${LABEL_A} ${entryA.document.overflowX}px   ` +
      `${LABEL_B} ${entryB.document.overflowX}px`,
  );
  say(
    `  bands             ${LABEL_A} ${entryA.sections.length}   ` +
      `${LABEL_B} ${entryB.sections.length}`,
  );
  say(
    `  page background   ${LABEL_A} ${entryA.document.bodyBg}   ` +
      `${LABEL_B} ${entryB.document.bodyBg}`,
  );

  const bands = Math.min(entryA.sections.length, entryB.sections.length);
  for (let i = 0; i < bands; i += 1) {
    const sa = entryA.sections[i];
    const sb = entryB.sections[i];
    say(
      `  band ${String(i).padStart(2, "0")} height  ` +
        `${LABEL_A} ${sa.box.h}px  ${LABEL_B} ${sb.box.h}px  ` +
        `Δ ${Math.round((sb.box.h - sa.box.h) * 10) / 10}px` +
        `   | background ${LABEL_A} ${sa.style.backgroundColor} ` +
        `${LABEL_B} ${sb.style.backgroundColor}` +
        `   | pad ${LABEL_A} ${sa.style.paddingTop}/${sa.style.paddingBottom} ` +
        `${LABEL_B} ${sb.style.paddingTop}/${sb.style.paddingBottom}`,
    );
  }

  // Band-aware comparison. Matching by DOM order compares a section
  // heading on one page against a card heading on the other, which is
  // noise. The first heading inside the SAME band is the like-for-like
  // comparison, so the report groups by band and takes the first
  // heading of each kind inside it.
  const firstOfKind = (entry, band, kinds) => {
    const top = band.box.y;
    const bottom = top + band.box.h;
    const hit = entry.elements
      .filter((e) => kinds.includes(e.tag) && e.box.y >= top - 4 && e.box.y < bottom)
      .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)[0];
    return hit;
  };

  const kinds = ["h1", "h2", "h3", "p", "a", "button"];
  for (let i = 0; i < bands; i += 1) {
    for (const kind of kinds) {
      const a = firstOfKind(entryA, entryA.sections[i], [kind]);
      const b = firstOfKind(entryB, entryB.sections[i], [kind]);
      if (!a || !b) continue;
      const diffs = [];
      for (const k of KEYS) {
        const va = normalise(a.style[k]);
        const vb = normalise(b.style[k]);
        if (va === undefined || vb === undefined) continue;
        if (va === vb) continue;
        diffs.push(`${k}: ${LABEL_A} ${va} → ${LABEL_B} ${vb}`);
      }
      if (!diffs.length) continue;
      say(`  band ${String(i).padStart(2, "0")} ${kind} "${String(a.text || "").slice(0, 40)}"`);
      for (const d of diffs.slice(0, 8)) say(`      ${d}`);
    }
  }
  say("");
}

console.log(out.join("\n"));
