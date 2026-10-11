/** Regression gates for the Ember Studio Phase 1 design system. */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

import {
  FONT_STACKS,
  hexToRgb,
  RADIUS,
  RADIUS_CONTROL,
  RADIUS_PILL,
  RADIUS_SURFACE,
  TOKENS,
} from "../../lib/design-tokens.ts";
import { COLORS } from "../../lib/pdf/layout.ts";
import { buildProposalPdf } from "../../lib/pdf/documents.ts";
import { decodePdf, pageStreams } from "./pdf-read.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

/** `--name: value;` pairs in the first `{ … }` block after `selector`. */
function block(css: string, selector: string): Map<string, string> {
  const at = css.indexOf(selector);
  assert.notEqual(at, -1, `app/globals.css has no "${selector}" block`);
  const open = css.indexOf("{", at);
  assert.notEqual(open, -1, `malformed "${selector}" block`);
  let depth = 0;
  let close = -1;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  assert.notEqual(close, -1, `unterminated "${selector}" block`);
  const declared = new Map<string, string>();
  for (const match of css.slice(open + 1, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    declared.set(match[1], match[2].trim().toLowerCase());
  }
  return declared;
}

/** Every `.ts`, `.tsx` and `.css` source under the given roots. */
function sources(...roots: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(tsx?|css)$/.test(name)) out.push(full);
    }
  };
  for (const root of roots) walk(join(ROOT, root));
  return out;
}

/** PDF writer's 2dp RGB operator, used to assert the authored accent in bytes. */
function rg(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const part = (n: number) =>
    (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, "") || "0";
  return `${part(r)} ${part(g)} ${part(b)} rg`;
}

const CSS = read("app/globals.css");
const LIGHT = block(CSS, ":root {");
const DARK = block(CSS, ".dark {");
const PRINT = block(CSS, ":root,");

const LIGHT_PALETTE = {
  "--ember-terracotta": "#c2410c",
  "--ember-terracotta-hover": "#9a3412",
  "--ember-amber": "#f59e0b",
  "--ember-background": "#fafaf9",
  "--ember-surface": "#f5f5f4",
  "--ember-surface-raised": "#e7e5e4",
  "--ember-text": "#1c1917",
  "--ember-secondary-text": "#57534e",
  "--ember-neutral": "#78716c",
  "--ember-border": "#d6d3d1",
} as const;

const DARK_PALETTE = {
  "--ember-background": "#1c1917",
  "--ember-surface": "#292524",
  "--ember-surface-raised": "#44403c",
  "--ember-terracotta": "#fb923c",
  "--ember-terracotta-hover": "#fdba74",
  "--ember-amber": "#fbbf24",
  "--ember-text": "#fafaf9",
  "--ember-secondary-text": "#e7e5e4",
  "--ember-neutral": "#a8a29e",
  "--ember-border": "#57534e",
} as const;

describe("Ember Studio — palette and migration aliases", () => {
  test("the required light palette is exact in CSS and shared TypeScript tokens", () => {
    for (const [property, hex] of Object.entries(LIGHT_PALETTE)) {
      assert.equal(LIGHT.get(property), hex, `:root ${property}`);
    }
    assert.equal(TOKENS.terracotta, LIGHT_PALETTE["--ember-terracotta"]);
    assert.equal(TOKENS.terracottaHover, LIGHT_PALETTE["--ember-terracotta-hover"]);
    assert.equal(TOKENS.amber, LIGHT_PALETTE["--ember-amber"]);
    assert.equal(TOKENS.background, LIGHT_PALETTE["--ember-background"]);
    assert.equal(TOKENS.surface, LIGHT_PALETTE["--ember-surface"]);
    assert.equal(TOKENS.surfaceRaised, LIGHT_PALETTE["--ember-surface-raised"]);
    assert.equal(TOKENS.text, LIGHT_PALETTE["--ember-text"]);
    assert.equal(TOKENS.secondaryText, LIGHT_PALETTE["--ember-secondary-text"]);
    assert.equal(TOKENS.neutral, LIGHT_PALETTE["--ember-neutral"]);
    assert.equal(TOKENS.border, LIGHT_PALETTE["--ember-border"]);
  });

  test("dark theme uses warm surfaces, text and accents rather than inverted light gray", () => {
    for (const [property, hex] of Object.entries(DARK_PALETTE)) {
      assert.equal(DARK.get(property), hex, `.dark ${property}`);
    }
    assert.equal(DARK.get("--on-accent"), "#1c1917");
    assert.match(CSS, /\.dark\s*\{\s*color-scheme:\s*dark;/);
    assert.notEqual(DARK.get("--ember-background"), "#000000");
    assert.match(CSS, /Warm charcoal surfaces[\s\S]*intentional/);
  });

  test("legacy CSS and TypeScript token aliases remain available during migration", () => {
    for (const [name, value] of Object.entries({
      "--bg": "var(--ember-background)",
      "--text": "var(--ember-text)",
      "--accent": "var(--ember-terracotta)",
      "--accent-hover": "var(--ember-terracotta-hover)",
      "--muted": "var(--surface-raised)",
      "--card": "var(--surface)",
      "--border": "var(--ember-border)",
    })) {
      assert.equal(LIGHT.get(name), value, `legacy ${name} alias`);
    }
    assert.equal(TOKENS.bg, TOKENS.background);
    assert.equal(TOKENS.accent, TOKENS.terracotta);
    assert.equal(TOKENS.card, TOKENS.surface);
    assert.equal(TOKENS.muted, TOKENS.surfaceRaised);
    assert.equal(RADIUS, RADIUS_CONTROL, "the former generic radius remains exported");
  });

  test("paper changes only the print canvas; all other canonical tokens match light mode", () => {
    for (const property of Object.keys(LIGHT_PALETTE)) {
      if (property === "--ember-background") continue;
      assert.equal(PRINT.get(property), LIGHT.get(property), `print ${property}`);
    }
    assert.equal(PRINT.get("--ember-background"), "#ffffff");
    assert.equal(LIGHT.get("--bg"), "var(--ember-background)");
  });
});

describe("Ember Studio — radii and core components", () => {
  test("the semantic radius tokens are 8px / 12px / pill and keep the old alias", () => {
    assert.equal(RADIUS_CONTROL, "8px");
    assert.equal(RADIUS_SURFACE, "12px");
    assert.equal(RADIUS_PILL, "9999px");
    assert.equal(RADIUS, "8px");
    assert.equal(LIGHT.get("--radius-control"), "8px");
    assert.equal(LIGHT.get("--radius-surface"), "12px");
    assert.equal(LIGHT.get("--radius"), "var(--radius-control)");
  });

  test("Tailwind maps control and surface utilities to the corresponding tokens", () => {
    const config = read("tailwind.config.ts");
    const radii = /borderRadius:\s*\{([\s\S]*?)\n\s*\}/.exec(config)?.[1] ?? "";
    assert.match(radii, /control:\s*"var\(--radius-control\)"/);
    assert.match(radii, /surface:\s*"var\(--radius-surface\)"/);
    assert.match(radii, /md:\s*"var\(--radius-control\)"/);
    assert.match(radii, /lg:\s*"var\(--radius-surface\)"/);
    assert.match(radii, /xl:\s*"var\(--radius-surface\)"/);
  });

  test("buttons and inputs use 8px; cards, dialogs and popovers use 12px", () => {
    const button = read("components/ui/button.tsx");
    assert.match(button, /rounded-control/);
    assert.match(button, /bg-accent[\s\S]*hover:bg-accent-hover/);
    assert.doesNotMatch(button, /rounded-full/);

    for (const path of [
      "components/ui/input.tsx",
      "components/ui/textarea.tsx",
      "components/ui/select.tsx",
    ]) {
      assert.match(read(path), /rounded-control/, `${path} is an 8px control`);
    }
    for (const path of [
      "components/app-shell/Sidebar.tsx",
      "components/app-shell/MobileNav.tsx",
      "app/(app)/search/page.tsx",
    ]) {
      assert.match(read(path), /min-h-11[^\"]*rounded-control/, `${path} interactive rows use the 8px control radius`);
    }
    for (const [path, surfaceClass] of [
      ["components/ui/card.tsx", "rounded-surface"],
      ["components/ui/dialog.tsx", "rounded-surface"],
      ["components/ui/select.tsx", "rounded-surface"],
      ["components/ui/menu.tsx", "rounded-surface"],
      ["components/ui/toast.tsx", "rounded-surface"],
    ]) {
      assert.match(read(path), new RegExp(surfaceClass), `${path} has a 12px surface radius`);
    }

    const pillControls: string[] = [];
    for (const file of sources("app", "components")) {
      const path = relative(ROOT, file);
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/<(?:button|input|textarea)\b[^>]*>/gi)) {
        if (/rounded-full/.test(match[0])) pillControls.push(path);
      }
    }
    assert.deepEqual(pillControls, [], "buttons and inputs use 8px controls, not pill corners");
  });

  test("badges stay pill-shaped, avatars stay circular, and tabs are underlined", () => {
    assert.match(read("components/ui/badge.tsx"), /rounded-full/);
    assert.match(read("components/ui/avatar.tsx"), /rounded-full/);

    const tabs = read("components/ui/tabs.tsx");
    assert.match(tabs, /border-b-2/);
    assert.match(tabs, /data-\[state=active\]:border-accent/);
    assert.match(tabs, /data-\[state=active\]:text-accent/);
    assert.doesNotMatch(tabs, /data-\[state=active\]:bg-card|data-\[state=active\]:shadow/);
  });

  test("there are no arbitrary one-off radii", () => {
    const offenders: string[] = [];
    for (const file of sources("app", "components", "lib")) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/\brounded(?:-[a-z]{1,2})?-\[[^\]]+\]/g)) {
        offenders.push(`${relative(ROOT, file)}: ${match[0]}`);
      }
    }
    assert.deepEqual(offenders, [], "use the token radius scale or rounded-full for pills/circles");
  });
});

describe("Ember Studio — self-hosted typography", () => {
  const fonts = [
    {
      family: "Playfair Display",
      path: "app/fonts/playfair-display-latin-wght-normal.woff2",
      variable: "--font-playfair",
      binding: "playfair.variable",
      weight: "400 900",
    },
    {
      family: "Source Sans 3",
      path: "app/fonts/source-sans-3-latin-wght-normal.woff2",
      variable: "--font-source-sans",
      binding: "sourceSans.variable",
      weight: "200 900",
    },
    {
      family: "Fira Code",
      path: "app/fonts/fira-code-latin-wght-normal.woff2",
      variable: "--font-fira-code",
      binding: "firaCode.variable",
      weight: "300 700",
    },
  ] as const;

  test("all three families are self-hosted, variable-weight local fonts", () => {
    const layout = read("app/layout.tsx");
    assert.match(layout, /from "next\/font\/local"/);
    assert.doesNotMatch(layout, /fonts\.googleapis\.com|next\/font\/google/);

    for (const font of fonts) {
      assert.ok(statSync(join(ROOT, font.path)).size > 0, `${font.path} exists`);
      assert.ok(layout.includes(font.path.replace("app/", "./")), `${font.family} is locally loaded`);
      assert.ok(layout.includes(`variable: "${font.variable}"`), `${font.variable} is wired`);
      assert.ok(layout.includes(`weight: "${font.weight}"`), `${font.family} variable range`);
      assert.ok(layout.includes(font.binding), `${font.variable} is applied to body`);
    }
    assert.match(read("tailwind.config.ts"), /var\(--font-playfair\)/);
    assert.match(read("tailwind.config.ts"), /var\(--font-source-sans\)/);
    assert.match(read("tailwind.config.ts"), /var\(--font-fira-code\)/);
  });

  test("shared email and error-page font stacks match the Ember Studio families", () => {
    assert.match(FONT_STACKS.display, /^'Playfair Display'/);
    assert.match(FONT_STACKS.body, /^'Source Sans 3'/);
    assert.match(FONT_STACKS.mono, /^'Fira Code'/);
    assert.match(read("lib/invite-email.ts"), /FONT_STACKS\.body/);
    assert.match(read("app/global-error.tsx"), /FONT_STACKS\.display/);
  });

  test("each bundled font keeps its OFL license", () => {
    for (const name of ["Playfair-Display", "Source-Sans-3", "Fira-Code"]) {
      const license = read(`app/fonts/OFL-${name}.txt`);
      assert.match(license, /SIL OPEN FONT LICENSE/i, `${name} license`);
    }
  });
});

describe("Ember Studio — shared PDF/email and brand-color regressions", () => {
  test("PDF palette reads the shared light tokens and writes the terracotta accent", () => {
    assert.deepEqual(COLORS.accent, hexToRgb(TOKENS.terracotta));
    assert.deepEqual(COLORS.ink, hexToRgb(TOKENS.text));
    assert.deepEqual(COLORS.hairline, hexToRgb(TOKENS.border));
    assert.deepEqual(COLORS.muted, hexToRgb(TOKENS.secondaryText));
    assert.deepEqual(COLORS.zebra, hexToRgb(TOKENS.surface));
    assert.deepEqual(COLORS.white, hexToRgb(TOKENS.background));

    const bytes = buildProposalPdf({
      workspaceName: "Brightloop Co.",
      generatedAt: new Date("2026-09-27T10:30:00Z"),
      title: "Website relaunch proposal",
      clientName: "Aurora Labs",
      status: "sent",
      deliverables: [{ text: "Discovery workshop", checked: true }],
      budgetTimeline: "$18,000 over 8 weeks",
      briefTitle: null,
      createdAt: "2026-09-18T09:00:00Z",
      updatedAt: "2026-09-26T09:00:00Z",
    }).bytes;
    assert.ok(pageStreams(decodePdf(bytes))[0].includes(rg(TOKENS.terracotta)));
  });

  test("email and root error surfaces use shared tokens and semantic radii", () => {
    const email = read("lib/invite-email.ts");
    const error = read("app/global-error.tsx");
    for (const [path, source] of [["lib/invite-email.ts", email], ["app/global-error.tsx", error]]) {
      assert.match(source, /design-tokens/);
      assert.match(source, /TOKENS\.(?:terracotta|text|background|secondaryText)/);
      assert.match(source, /RADIUS_CONTROL/);
      const paletteHexes = (source.match(/#[0-9a-f]{3,8}\b/gi) ?? []).filter(
        (hex) => !/^#fff(fff)?$/i.test(hex)
      );
      assert.deepEqual(paletteHexes, [], `${path} hardcodes ${paletteHexes.join(", ")}`);
    }
    assert.match(email, /FONT_STACKS\.body/);
    assert.match(email, /TOKENS\.neutral/);
  });

  test("brand colors are only authored in the token layer, CSS theme, and static app icon", () => {
    const light = Object.values(LIGHT_PALETTE);
    const dark = Object.values(DARK_PALETTE);
    const forbidden = [...new Set([...light, ...dark])].map((value) => value.toLowerCase());
    const allowed = new Set(["app/globals.css", "lib/design-tokens.ts", "app/icon.svg"]);
    const offenders: string[] = [];

    for (const file of sources("app", "components", "lib")) {
      const path = relative(ROOT, file);
      if (allowed.has(path)) continue;
      const source = readFileSync(file, "utf8").toLowerCase();
      for (const hex of forbidden) {
        if (source.includes(hex)) offenders.push(`${path}: ${hex}`);
      }
    }
    assert.deepEqual(offenders, [], "use a design token instead of a hardcoded Ember color");

    const icon = read("app/icon.svg").toLowerCase();
    assert.match(icon, new RegExp(`fill="${TOKENS.terracotta}"`));
    assert.doesNotMatch(icon, /#c12c01/);
  });

  test("amber is reserved for highlights/notifications and never used by primary CTAs", () => {
    const button = read("components/ui/button.tsx");
    assert.doesNotMatch(button, /highlight|amber/);
    assert.match(read("components/ui/toast.tsx"), /border-l-highlight/);
    assert.match(read("app/(app)/search/page.tsx"), /bg-highlight-soft/);
    assert.match(read("app/(marketing)/pricing/page.tsx"), /bg-highlight-soft/);

    const allowed = new Set([
      "components/ui/toast.tsx",
      "app/(app)/search/page.tsx",
      "app/(marketing)/pricing/page.tsx",
      "app/(marketing)/pricing/pricing-plans.tsx",
    ]);
    const offenders: string[] = [];
    for (const file of sources("app", "components")) {
      const path = relative(ROOT, file);
      const source = readFileSync(file, "utf8");
      if (!allowed.has(path) && /\b(?:bg|text|border(?:-[trbl])?)-(?:highlight|amber)(?:-[\w-]+)?(?:\/\d+)?\b/.test(source)) {
        offenders.push(path);
      }
    }
    assert.deepEqual(offenders, [], "amber highlight styles belong only on highlight/notification surfaces");
  });
});
