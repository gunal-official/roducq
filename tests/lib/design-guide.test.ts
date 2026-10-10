/**
 * Guard for the 2026-09 design guide.
 *
 * tests/lib/design-tokens.test.ts proves screen and print AGREE with each
 * other. This file proves they agree with the GUIDE: the exact palette (light
 * and dark), the single compact radius, the type pairing (Georgia/Times
 * display over Inter body), and that the off-Tailwind surfaces — PDF, invite
 * email, root error boundary — paint with the same tokens instead of private
 * hex. Re-tinting anything here is a design decision; this test makes it a
 * deliberate one.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

import { FONT_STACKS, hexToRgb, RADIUS, TOKENS } from "../../lib/design-tokens.ts";
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
  const close = css.indexOf("}", open);
  const declared = new Map<string, string>();
  for (const m of css.slice(open + 1, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    declared.set(m[1], m[2].trim().toLowerCase());
  }
  return declared;
}

const CSS = read("app/globals.css");
const LIGHT = block(CSS, ":root {");
const DARK = block(CSS, ".dark {");

const GUIDE = {
  light: {
    "--bg": "#fefbfa",
    "--text": "#16100f",
    "--accent": "#c12c01",
    "--muted": "#f6f0ef",
    "--card": "#fffffe",
    "--border": "#e3dcda",
  },
  dark: {
    "--bg": "#120b0a",
    "--text": "#f6f0ef",
    "--accent": "#f35e3d",
    "--muted": "#2a2220",
    "--card": "#1c1412",
    "--border": "#f5ffff1a",
  },
} as const;

/** Every .ts/.tsx/.css file under the given roots. */
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

/** Mirrors the PDF writer's 2dp `r g b rg` fill operator. */
function rg(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const part = (n: number) =>
    (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, "") || "0";
  return `${part(r)} ${part(g)} ${part(b)} rg`;
}

describe("design guide — palette", () => {
  test("light theme matches the guide", () => {
    for (const [name, hex] of Object.entries(GUIDE.light)) {
      assert.equal(LIGHT.get(name), hex, `:root ${name}`);
    }
  });

  test("dark theme matches the guide", () => {
    for (const [name, hex] of Object.entries(GUIDE.dark)) {
      assert.equal(DARK.get(name), hex, `.dark ${name}`);
    }
  });

  test("lib/design-tokens.ts carries the guide's light palette", () => {
    assert.equal(TOKENS.bg, GUIDE.light["--bg"]);
    assert.equal(TOKENS.text, GUIDE.light["--text"]);
    assert.equal(TOKENS.accent, GUIDE.light["--accent"]);
    assert.equal(TOKENS.muted, GUIDE.light["--muted"]);
    assert.equal(TOKENS.card, GUIDE.light["--card"]);
    assert.equal(TOKENS.border, GUIDE.light["--border"]);
  });

  test("print collapses onto the guide's light ink and accent", () => {
    const print = block(CSS, ":root,");
    assert.equal(print.get("--text"), GUIDE.light["--text"]);
    assert.equal(print.get("--accent"), GUIDE.light["--accent"]);
  });
});

describe("design guide — radius", () => {
  test("--radius is the compact 0.35rem, mirrored in TS", () => {
    assert.equal(LIGHT.get("--radius"), "0.35rem");
    assert.equal(RADIUS, "0.35rem");
  });

  test("every Tailwind radius step resolves through --radius", () => {
    const config = read("tailwind.config.ts");
    const radii = /borderRadius:\s*\{([\s\S]*?)\n\s*\}/.exec(config)?.[1] ?? "";
    assert.ok(radii, "tailwind.config.ts has no borderRadius block");
    const values = [...radii.matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1]);
    assert.ok(values.length >= 4, "expected the radius scale to be declared");
    for (const value of values) {
      assert.match(value, /var\(--radius\)/, `radius step "${value}" bypasses the token`);
    }
  });

  test("no arbitrary radii (rounded-[…]) anywhere in app/components/lib", () => {
    const offenders: string[] = [];
    for (const file of sources("app", "components", "lib")) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/\brounded(?:-[a-z]{1,2})?-\[[^\]]+\]/g)) {
        offenders.push(`${relative(ROOT, file)}: ${m[0]}`);
      }
    }
    assert.deepEqual(offenders, [], "use the token scale (rounded/-sm/-md) or rounded-full");
  });

  test("pills keep rounded-full", () => {
    // The compact radius applies to surfaces; pills and avatars stay round.
    const all = sources("components").map((f) => readFileSync(f, "utf8")).join("\n");
    assert.match(all, /\brounded-full\b/);
  });
});

describe("design guide — typography", () => {
  test("display face is Georgia, falling back to Times", () => {
    const config = read("tailwind.config.ts");
    const display = /display:\s*\[([^\]]*)\]/.exec(config)?.[1] ?? "";
    assert.match(display, /^\s*"Georgia"/, "Georgia leads the display stack");
    assert.match(display, /Times/);
    assert.match(display, /serif"\s*$/);
    assert.match(FONT_STACKS.display, /^Georgia,.*Times.*serif$/);
  });

  test("body face is Inter, self-hosted and bound to --font-inter", () => {
    const layout = read("app/layout.tsx");
    // Inter is self-hosted (either via next/font/google at build time, or
    // via next/font/local pointing at committed woff2s for offline/sandbox
    // builds). The variable binding and tailwind config are identical
    // either way, and visitors never hit fonts.googleapis.com at runtime.
    assert.match(
      layout,
      /next\/font\/(google|local)/,
      "layout must load Inter through next/font"
    );
    assert.match(layout, /inter-latin-.*\.woff2|subsets:\s*\["latin"\]/);
    assert.match(layout, /variable:\s*"--font-inter"/);
    assert.match(read("tailwind.config.ts"), /sans:\s*\[\s*"var\(--font-inter\)"/);
    assert.match(FONT_STACKS.body, /^Inter,|--font-inter/);
  });

  test("the retired faces are gone", () => {
    const layout = read("app/layout.tsx");
    const config = read("tailwind.config.ts");
    const pkg = read("package.json");
    for (const text of [layout, config, pkg]) {
      assert.ok(!/Jakarta/i.test(text), "Plus Jakarta Sans is no longer part of the guide");
      assert.ok(!text.includes("@fontsource"), "fonts load through next/font, not @fontsource");
    }
  });
});

describe("design guide — off-Tailwind surfaces use the tokens", () => {
  test("PDF accent and ink are the guide's accent and ink", () => {
    assert.equal(rg(TOKENS.accent), "0.76 0.17 0 rg");
    assert.deepEqual(COLORS.accent, hexToRgb(GUIDE.light["--accent"]));
    assert.deepEqual(COLORS.ink, hexToRgb(GUIDE.light["--text"]));
    const stream = pageStreams(
      decodePdf(
        buildProposalPdf({
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
        }).bytes
      )
    )[0];
    assert.ok(stream.includes("0.76 0.17 0 rg"), "the PDF bytes paint the new accent");
  });

  test("invite email and global error carry no private hex palette", () => {
    for (const path of ["lib/invite-email.ts", "app/global-error.tsx"]) {
      const text = read(path);
      assert.match(text, /from "(?:\.\/|@\/lib\/)design-tokens(?:\.ts)?"/, `${path} imports the tokens`);
      assert.match(text, /\bTOKENS\./, `${path} paints with TOKENS`);
      assert.match(text, /\bRADIUS\b/, `${path} uses the shared radius`);
      const hex = (text.match(/#[0-9a-f]{3,8}\b/gi) ?? []).filter(
        (h) => !/^#fff(fff)?$/i.test(h) // white ink on the accent is allowed
      );
      assert.deepEqual(hex, [], `${path} hardcodes ${hex.join(", ")}`);
    }
  });
});
