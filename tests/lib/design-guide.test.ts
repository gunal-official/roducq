/** Regression gates for the Forma Phase A design foundation. */

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
  TOKEN_CSS_VAR,
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

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const linear = (value: number) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const CSS = read("app/globals.css");
const LIGHT = block(CSS, ":root {");
const DARK = block(CSS, ".dark {");
const PRINT = block(CSS, ":root,");

const LIGHT_PALETTE = {
  "--forma-background": "#faf8fc",
  "--forma-surface": "#ffffff",
  "--forma-surface-raised": "#f2ecf7",
  "--forma-purple": "#7c3aed",
  "--forma-purple-hover": "#6d28d9",
  "--forma-lavender": "#ede5f8",
  "--forma-plum": "#2c1b36",
  "--forma-amber": "#9a5b0a",
  "--forma-text": "#261d2d",
  "--forma-secondary-text": "#665c70",
  "--forma-neutral": "#74677f",
  "--forma-border": "#e4ddea",
  "--forma-error": "#c93d52",
  "--forma-success": "#18794e",
  "--forma-success-soft": "#e8f4ec",
  "--forma-info": "#245fce",
} as const;

const DARK_PALETTE = {
  "--forma-background": "#17131e",
  "--forma-surface": "#211b29",
  "--forma-surface-raised": "#30283a",
  "--forma-purple": "#bba4ff",
  "--forma-purple-hover": "#ccb9ff",
  "--forma-lavender": "#342840",
  "--forma-amber": "#f1c36d",
  "--forma-text": "#faf7ff",
  "--forma-secondary-text": "#d2c9dc",
  "--forma-neutral": "#aca2b6",
  "--forma-border": "#483d54",
  "--forma-error": "#ff8c9a",
  "--forma-success": "#64dca5",
  "--forma-success-soft": "#163a2b",
  "--forma-info": "#8bb4ff",
} as const;

describe("Forma — palette, themes, and compatibility aliases", () => {
  test("the light Forma palette is exact in CSS and shared TypeScript tokens", () => {
    for (const [property, hex] of Object.entries(LIGHT_PALETTE)) {
      assert.equal(LIGHT.get(property), hex, `:root ${property}`);
    }
    for (const [name, cssVar] of Object.entries(TOKEN_CSS_VAR)) {
      assert.equal(LIGHT.get(cssVar), TOKENS[name as keyof typeof TOKENS]);
    }
  });

  test("dark mode is a distinct, intentional plum palette", () => {
    for (const [property, hex] of Object.entries(DARK_PALETTE)) {
      assert.equal(DARK.get(property), hex, `.dark ${property}`);
    }
    assert.equal(DARK.get("--on-accent"), "#21162d");
    assert.match(CSS, /\.dark\s*\{\s*color-scheme:\s*dark;/);
    assert.notEqual(DARK.get("--forma-background"), LIGHT.get("--forma-background"));
    assert.notEqual(DARK.get("--forma-surface"), LIGHT.get("--forma-surface"));
    assert.notEqual(DARK.get("--forma-purple"), LIGHT.get("--forma-purple"));
    assert.match(CSS, /Dark mode is a distinct plum\/charcoal palette/);
  });

  test("Forma foreground colors keep readable contrast in both themes", () => {
    const lightBg = LIGHT.get("--forma-background")!;
    const darkBg = DARK.get("--forma-background")!;
    for (const property of [
      "--forma-text",
      "--forma-secondary-text",
      "--forma-neutral",
      "--forma-purple",
      "--forma-amber",
      "--forma-error",
      "--forma-success",
      "--forma-info",
    ]) {
      assert.ok(contrast(LIGHT.get(property)!, lightBg) >= 4.5, `${property} light contrast`);
      assert.ok(contrast(DARK.get(property)!, darkBg) >= 4.5, `${property} dark contrast`);
    }
    assert.ok(contrast("#ffffff", LIGHT.get("--forma-purple")!) >= 4.5);
    assert.ok(contrast(DARK.get("--on-accent")!, DARK.get("--forma-purple")!) >= 4.5);
  });

  test("print overrides dark mode with the full light palette and paper background", () => {
    for (const [property, hex] of Object.entries(LIGHT_PALETTE)) {
      if (property === "--forma-background") continue;
      assert.equal(PRINT.get(property), hex, `print ${property}`);
    }
    assert.equal(PRINT.get("--forma-background"), "#ffffff");
    assert.equal(PRINT.get("--on-accent"), "#ffffff");
  });

  test("semantic, shadcn, and deprecated Ember aliases remain source-compatible", () => {
    for (const [name, value] of Object.entries({
      "--bg": "var(--forma-background)",
      "--text": "var(--forma-text)",
      "--accent": "var(--forma-purple)",
      "--accent-hover": "var(--forma-purple-hover)",
      "--lavender": "var(--forma-lavender)",
      "--plum": "var(--forma-plum)",
      "--muted": "var(--surface-raised)",
      "--card": "var(--surface)",
      "--border": "var(--forma-border)",
      "--ember-background": "var(--forma-background)",
      "--ember-terracotta": "var(--forma-purple)",
      "--ember-text": "var(--forma-text)",
    })) {
      assert.equal(LIGHT.get(name), value, `CSS alias ${name}`);
    }
    assert.equal(TOKENS.bg, TOKENS.background);
    assert.equal(TOKENS.accent, TOKENS.purple);
    assert.equal(TOKENS.terracotta, TOKENS.purple);
    assert.equal(TOKENS.terracottaHover, TOKENS.purpleHover);
    assert.equal(TOKEN_CSS_VAR.terracotta, TOKEN_CSS_VAR.purple);
    assert.equal(TOKEN_CSS_VAR.terracottaHover, TOKEN_CSS_VAR.purpleHover);
    assert.equal(TOKENS.card, TOKENS.surface);
    assert.equal(TOKENS.muted, TOKENS.surfaceRaised);
    assert.equal(TOKENS.dark, TOKENS.plum);

    const config = read("tailwind.config.ts");
    assert.match(config, /forma:\s*\{/);
    assert.match(config, /purple:\s*\{/);
    assert.match(config, /background:\s*"var\(--bg\)"/);
    assert.match(config, /primary:\s*\{/);
    assert.match(config, /input:\s*"var\(--border\)"/);
    const components = JSON.parse(read("components.json")) as { aliases: { ui: string } };
    assert.equal(components.aliases.ui, "@/components/ui");
  });
});

describe("Forma — shared controls, surfaces, and typography", () => {
  test("semantic radii and the legacy radius alias are stable", () => {
    assert.equal(RADIUS_CONTROL, "8px");
    assert.equal(RADIUS_SURFACE, "12px");
    assert.equal(RADIUS_PILL, "9999px");
    assert.equal(RADIUS, RADIUS_CONTROL);
    assert.equal(LIGHT.get("--radius-control"), "8px");
    assert.equal(LIGHT.get("--radius-surface"), "12px");
    assert.equal(LIGHT.get("--radius"), "var(--radius-control)");
  });

  test("shared UI components use semantic tokens, focus rings, and compatible variants", () => {
    const button = read("components/ui/button.tsx");
    assert.match(button, /rounded-control/);
    assert.match(button, /bg-accent[\s\S]*hover:bg-accent-hover/);
    assert.match(button, /focus-visible:ring-2/);
    assert.doesNotMatch(button, /rounded-full/);

    for (const path of [
      "components/ui/input.tsx",
      "components/ui/textarea.tsx",
      "components/ui/select.tsx",
      "components/ui/checkbox.tsx",
    ]) {
      const source = read(path);
      assert.match(source, /focus-visible:ring-2/, `${path} has a clear keyboard focus ring`);
    }
    for (const path of [
      "components/ui/input.tsx",
      "components/ui/textarea.tsx",
      "components/ui/select.tsx",
    ]) {
      assert.match(read(path), /rounded-control/, `${path} uses the control radius`);
    }

    const badge = read("components/ui/badge.tsx");
    assert.match(badge, /rounded-full/);
    assert.match(badge, /info:.*bg-info-soft/);
    assert.match(badge, /warning:.*bg-highlight-soft/);
    assert.match(read("components/ui/card.tsx"), /rounded-surface/);
    assert.match(read("components/ui/dialog.tsx"), /rounded-surface/);
    assert.match(read("components/ui/menu.tsx"), /rounded-surface/);
    assert.match(read("components/ui/tabs.tsx"), /data-\[state=active\]:border-accent/);
  });

  test("all app headings and copy resolve to self-hosted Manrope", () => {
    const layout = read("app/layout.tsx");
    assert.match(layout, /from "next\/font\/local"/);
    assert.match(layout, /manrope-latin-wght-normal\.woff2/);
    assert.match(layout, /variable: "--font-manrope"/);
    assert.match(layout, /weight: "200 800"/);
    assert.match(layout, /fira-code-latin-wght-normal\.woff2/);
    assert.match(layout, /manrope\.variable/);
    assert.match(layout, /font-sans/);

    const tailwind = read("tailwind.config.ts");
    assert.match(tailwind, /display:\s*\["var\(--font-manrope\)"/);
    assert.match(tailwind, /sans:\s*\["var\(--font-manrope\)"/);
    assert.match(tailwind, /manrope:\s*\["var\(--font-manrope\)"/);
    assert.match(tailwind, /var\(--font-fira-code\)/);
    assert.match(FONT_STACKS.display, /^'Manrope'/);
    assert.match(FONT_STACKS.body, /^'Manrope'/);
    assert.match(FONT_STACKS.mono, /^'Fira Code'/);
    assert.match(read("lib/invite-email.ts"), /FONT_STACKS\.body/);
    assert.match(read("app/global-error.tsx"), /FONT_STACKS\.display/);

    for (const name of ["Manrope-Variable", "Fira-Code"]) {
      assert.match(read(`app/fonts/OFL-${name}.txt`), /SIL OPEN FONT LICENSE/i, `${name} license`);
    }
  });

  test("the authenticated shell exposes persistent light, dark, and system choices", () => {
    const provider = read("components/theme-provider.tsx");
    assert.match(provider, /NextThemesProvider/);
    assert.match(read("app/layout.tsx"), /defaultTheme="system"/);
    assert.match(read("app/layout.tsx"), /enableSystem/);

    const topbar = read("components/app-shell/Topbar.tsx");
    assert.match(topbar, /AppearanceMenuItems/);
    const choices = read("components/app-shell/AppearanceMenuItems.tsx");
    assert.match(choices, /useTheme/);
    assert.match(choices, /role="menuitemradio"/);
    for (const choice of ["light", "dark", "system"]) {
      assert.match(choices, new RegExp(`value: "${choice}"`));
    }
    assert.match(read("components/theme-toggle.tsx"), /aria-pressed/);
  });
});

describe("Forma — PDF, email, and brand integration", () => {
  test("PDF palette and output use the canonical Forma purple token", () => {
    assert.deepEqual(COLORS.accent, hexToRgb(TOKENS.purple));
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
    assert.ok(pageStreams(decodePdf(bytes))[0].includes(rg(TOKENS.purple)));
  });

  test("email and root error surfaces consume shared Forma tokens and Manrope", () => {
    const email = read("lib/invite-email.ts");
    const error = read("app/global-error.tsx");
    for (const [path, source] of [["lib/invite-email.ts", email], ["app/global-error.tsx", error]]) {
      assert.match(source, /design-tokens/);
      assert.match(source, /TOKENS\.(?:purple|text|background|secondaryText)/);
      assert.match(source, /RADIUS_CONTROL/);
      const paletteHexes = (source.match(/#[0-9a-f]{3,8}\b/gi) ?? []).filter(
        (hex) => !/^#fff(fff)?$/i.test(hex)
      );
      assert.deepEqual(paletteHexes, [], `${path} hardcodes ${paletteHexes.join(", ")}`);
    }
    assert.match(email, /FONT_STACKS\.body/);
    assert.match(email, /TOKENS\.neutral/);
  });

  test("Forma color literals stay centralized, including the app icon", () => {
    const colors = [...new Set([...Object.values(LIGHT_PALETTE), ...Object.values(DARK_PALETTE)])].filter(
      (color) => color !== "#ffffff"
    );
    const allowed = new Set(["app/globals.css", "lib/design-tokens.ts"]);
    const offenders: string[] = [];
    for (const file of sources("app", "components", "lib")) {
      const path = relative(ROOT, file);
      if (allowed.has(path)) continue;
      const source = readFileSync(file, "utf8").toLowerCase();
      for (const color of colors) {
        if (source.includes(color)) offenders.push(`${path}: ${color}`);
      }
    }
    assert.deepEqual(offenders, [], "use a Forma design token instead of a hardcoded palette value");
    assert.match(read("app/icon.svg").toLowerCase(), new RegExp(`fill="${TOKENS.purple}"`));
  });

  test("amber remains a highlight/notification tone, never a primary action", () => {
    assert.doesNotMatch(read("components/ui/button.tsx"), /highlight|amber/);
    assert.match(read("components/ui/badge.tsx"), /warning:.*bg-highlight-soft/);
    assert.match(read("components/ui/toast.tsx"), /border-l-highlight/);
    assert.match(read("app/(app)/search/page.tsx"), /bg-highlight-soft/);

    const allowed = new Set([
      "components/ui/badge.tsx",
      "components/ui/toast.tsx",
      "app/(app)/search/page.tsx",
      "app/(marketing)/pricing/page.tsx",
      "app/(marketing)/pricing/pricing-plans.tsx",
    ]);
    const offenders: string[] = [];
    for (const file of sources("app", "components")) {
      const path = relative(ROOT, file);
      const source = readFileSync(file, "utf8");
      if (
        !allowed.has(path) &&
        /\b(?:bg|text|border(?:-[trbl])?)-(?:highlight|amber)(?:-[\w-]+)?(?:\/\d+)?\b/.test(source)
      ) {
        offenders.push(path);
      }
    }
    assert.deepEqual(offenders, [], "highlight styles belong only on highlight/notification surfaces");
  });
});
