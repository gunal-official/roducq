/**
 * The pixel-parity contract between screen and print.
 *
 * The two surfaces used to carry their own copy of the palette, and the two
 * copies drifted (the PDF's ink was #1a1a1f while the app's --text was
 * #17171c). These tests are the thing that was missing: they fail when one
 * side moves without the other.
 *
 * NOTE ON WHAT THIS IS NOT. This locks the palette to one source of truth. It
 * does NOT compare rendered output against the 15 reference PDFs — that pass
 * is still parked in docs/step-34-closeout.md §4 until the reference renders
 * land in the workspace, and no pixel goldens are generated here.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  hexToRgb,
  mix,
  rgbToHex,
  soft,
  SOFT_WEIGHT,
  TOKENS,
  TOKEN_CSS_VAR,
} from "../../lib/design-tokens.ts";
import { COLORS } from "../../lib/pdf/layout.ts";
import { buildInvoicePdf, INVOICE_STATUS_TONES } from "../../lib/pdf/documents.ts";
import { decodePdf, pageStreams } from "./pdf-read.ts";
import type { InvoicePdfInput } from "../../lib/pdf/documents.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

/**
 * Every `--name: value;` pair inside the first `{ … }` following `selector`.
 * Used twice: once for the light `:root` block and once for the `@media print`
 * block, which re-declares the whole palette onto paper.
 */
function declarations(css: string, selector: string): Map<string, string> {
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
    declared.set(match[1], match[2].trim());
  }
  return declared;
}

/** Mirrors the writer's 2dp RGB formatting (lib/pdf/writer.ts `fmt`). */
function rg(color: { r: number; g: number; b: number }): string {
  const part = (n: number) => {
    const rounded = Math.round(n * 100) / 100;
    return (Object.is(rounded, -0) ? 0 : rounded).toFixed(2).replace(/\.?0+$/, "") || "0";
  };
  return `${part(color.r)} ${part(color.g)} ${part(color.b)} rg`;
}

const CSS = read("app/globals.css");
/** Light theme: the `:root` block near the top of the file. */
const DECLARED = declarations(CSS, ":root");
/**
 * Print theme: the `:root, .dark` re-declaration inside `@media print`. The
 * app already collapses its palette onto paper there — a PDF is that same
 * collapse, so it is the closest thing in the repo to a print palette.
 */
const PRINT = declarations(CSS, ":root,");

describe("design tokens", () => {
  test("every literal-hex :root token is mirrored in lib/design-tokens.ts", () => {
    // The drift this file exists to prevent: a token added or re-tinted in
    // CSS that the TS side never learned about.
    const hexInCss = [...DECLARED.entries()]
      .filter(([, value]) => /^#[0-9a-f]{6}$/i.test(value))
      .map(([name]) => name)
      .sort();
    const mirrored = Object.values(TOKEN_CSS_VAR).sort();

    assert.deepEqual(
      hexInCss,
      mirrored,
      "app/globals.css and TOKEN_CSS_VAR disagree on which tokens are plain hex — update lib/design-tokens.ts"
    );
  });

  test("each token matches the value CSS declares for it", () => {
    for (const [name, cssVar] of Object.entries(TOKEN_CSS_VAR)) {
      const cssValue = DECLARED.get(cssVar);
      assert.ok(cssValue, `${cssVar} is not declared in :root`);
      assert.equal(
        TOKENS[name as keyof typeof TOKENS],
        cssValue.toLowerCase(),
        `${cssVar}: CSS says ${cssValue}, lib/design-tokens.ts says ${TOKENS[name as keyof typeof TOKENS]}`
      );
    }
  });

  test("print mode re-declares the whole palette, not part of it", () => {
    // @media print is the app collapsing itself onto paper. If it only
    // re-declares some tokens, dark-mode values leak into a printed page.
    const missing = Object.values(TOKEN_CSS_VAR).filter((cssVar) => !PRINT.has(cssVar));
    assert.deepEqual(missing, [], `@media print never re-declares ${missing.join(", ")}`);
  });

  test("print mode agrees with the light theme on every token but the page", () => {
    // The one sanctioned difference is --bg: the screen sits on a warm ivory
    // backdrop, paper is white. Anything else diverging means a token was
    // re-tinted in one mode and forgotten in the other.
    for (const [name, cssVar] of Object.entries(TOKEN_CSS_VAR)) {
      if (name === "bg") continue;
      assert.equal(
        PRINT.get(cssVar)?.toLowerCase(),
        DECLARED.get(cssVar)?.toLowerCase(),
        `${cssVar} differs between screen and print`
      );
    }
  });

  test("TOKENS.bg is the screen backdrop — paper overrides it to white", () => {
    assert.equal(TOKENS.bg, DECLARED.get("--bg")?.toLowerCase());
    assert.equal(PRINT.get("--bg")?.toLowerCase(), "#ffffff");
    // And the shared palette keeps the screen value: --bg means "the surface
    // behind a card", which only the screen has.
    assert.notEqual(TOKENS.bg, PRINT.get("--bg")?.toLowerCase());
  });

  test("hexToRgb / rgbToHex round-trip without losing a step", () => {
    for (const hex of Object.values(TOKENS)) {
      assert.equal(rgbToHex(hexToRgb(hex)), hex);
    }
    assert.deepEqual(hexToRgb("#ff6a2b"), {
      r: 1,
      g: 106 / 255,
      b: 43 / 255,
    });
  });

  test("hexToRgb rejects anything that is not a 6-digit hex colour", () => {
    // A typo'd token should throw at build time, not silently render black.
    for (const bad of ["ff6a2b", "#fff", "#gggggg", "", "#ff6a2bff"]) {
      assert.throws(() => hexToRgb(bad), new RegExp("Not a 6-digit hex colour"), `accepted ${bad}`);
    }
  });

  test("mix is the sRGB blend CSS color-mix() performs", () => {
    assert.equal(mix(TOKENS.text, TOKENS.card, 1), TOKENS.text);
    assert.equal(mix(TOKENS.text, TOKENS.card, 0), TOKENS.card);
    // 50/50 between espresso ink and near-white card.
    assert.equal(mix(TOKENS.text, TOKENS.card, 0.5), "#8b8887");
    // Out-of-range weights clamp instead of producing impossible channels.
    assert.equal(mix(TOKENS.text, TOKENS.card, 4), TOKENS.text);
    assert.equal(mix(TOKENS.text, TOKENS.card, -1), TOKENS.card);
  });

  test("soft() reproduces the 12%-over-card colour-mix CSS uses", () => {
    assert.equal(SOFT_WEIGHT, 0.12);
    assert.equal(soft(TOKENS.info), mix(TOKENS.info, TOKENS.card, 0.12));
    // A soft tint is lighter than its own colour — the point of a wash.
    const info = hexToRgb(TOKENS.info);
    const infoSoft = hexToRgb(soft(TOKENS.info));
    assert.ok(infoSoft.r >= info.r && infoSoft.g >= info.g && infoSoft.b >= info.b);
  });
});

describe("PDF palette", () => {
  test("print colours are the tokens, not a second copy of them", () => {
    // The exact drift this work fixed: ink was #1a1a1f where --text is
    // #17171c, and hairline was #e5e7eb where --border was #e9e9ee.
    for (const [name, token] of [
      ["accent", "accent"],
      ["ink", "text"],
      ["hairline", "border"],
      ["zebra", "muted"],
      ["white", "card"],
      ["success", "success"],
      ["successSoft", "successSoft"],
      ["info", "info"],
      ["error", "error"],
    ] as const) {
      assert.equal(
        rgbToHex(COLORS[name]),
        TOKENS[token],
        `COLORS.${name} should be --${TOKEN_CSS_VAR[token]} (${TOKENS[token]})`
      );
    }
  });

  test("derived print colours still come off --text", () => {
    // `muted` (secondary ink) and `border` (6pt outlines) are mixed, not
    // copied — assert they are mixed off the ink token rather than being
    // free-floating constants.
    assert.equal(rgbToHex(COLORS.muted), mix(TOKENS.text, TOKENS.card, 0.62));
    assert.equal(rgbToHex(COLORS.border), mix(TOKENS.text, TOKENS.card, 0.25));

    for (const name of ["muted", "border"] as const) {
      const derived = hexToRgb(rgbToHex(COLORS[name]));
      const ink = hexToRgb(TOKENS.text);
      assert.ok(
        derived.r > ink.r && derived.r < 1,
        `COLORS.${name} should sit between the ink and the page`
      );
    }
  });
});

const BASE: InvoicePdfInput = {
  workspaceName: "Brightloop Co.",
  generatedAt: new Date("2026-09-27T10:30:00Z"),
  invoiceNumber: 2,
  title: "Website relaunch — phase 1",
  clientName: "Aurora Labs",
  status: "sent",
  items: [{ description: "Discovery workshop", quantity: 2, unit_amount_cents: 45000 }],
  taxPercent: 18,
  notes: "",
  dueDate: "2026-10-11",
  sentAt: "2026-09-27T09:00:00Z",
  paidAt: null,
};

describe("invoice status parity", () => {
  test("each status prints in the colour the on-screen badge uses", () => {
    assert.equal(rgbToHex(INVOICE_STATUS_TONES.sent.bar), TOKENS.info);
    assert.equal(rgbToHex(INVOICE_STATUS_TONES.sent.text), TOKENS.info);

    assert.equal(rgbToHex(INVOICE_STATUS_TONES.paid.bar), TOKENS.success);
    assert.equal(rgbToHex(INVOICE_STATUS_TONES.paid.text), TOKENS.success);
    assert.equal(rgbToHex(INVOICE_STATUS_TONES.paid.fill), TOKENS.successSoft);

    assert.equal(rgbToHex(INVOICE_STATUS_TONES.void.bar), TOKENS.error);
    assert.equal(rgbToHex(INVOICE_STATUS_TONES.void.text), TOKENS.error);
  });

  test("draft stays neutral — it is the one status with no hue", () => {
    // Draft must not borrow the brand accent: on a money document the accent
    // means "look here", and a draft is the absence of anything happening.
    for (const part of ["bar", "text", "fill"] as const) {
      assert.notEqual(
        rgbToHex(INVOICE_STATUS_TONES.draft[part]),
        TOKENS.accent,
        `draft.${part} picked up the accent`
      );
    }
    assert.equal(rgbToHex(INVOICE_STATUS_TONES.draft.fill), TOKENS.muted);
  });

  test("the four statuses are four different colours", () => {
    // The reason the badge redesign happened at all: sent and paid used to
    // share the accent, so "awaiting payment" and "paid" read alike.
    const bars = (["draft", "sent", "paid", "void"] as const).map((s) =>
      rgbToHex(INVOICE_STATUS_TONES[s].bar)
    );
    assert.equal(new Set(bars).size, 4, `status bars are not distinct: ${bars.join(", ")}`);
  });

  test("the bytes carry the status colour, not the brand accent", () => {
    for (const [status, token] of [
      ["paid", "success"],
      ["sent", "info"],
      ["void", "error"],
    ] as const) {
      const stream = pageStreams(
        decodePdf(buildInvoicePdf({ ...BASE, status }).bytes)
      )[0];
      assert.ok(
        stream.includes(rg(hexToRgb(TOKENS[token]))),
        `a ${status} invoice should paint --${TOKEN_CSS_VAR[token]} (${rg(hexToRgb(TOKENS[token]))})`
      );
    }
  });

  test("the on-screen badge uses the same tokens as the PDF tone map", () => {
    // Guards the other direction: recolour the badge in the app and this
    // fails, because the PDF would then be printing the old colour.
    const badge = read("components/invoices/InvoiceStatusBadge.tsx");
    for (const [status, token] of [
      ["sent", "info"],
      ["paid", "success"],
      ["void", "error"],
    ] as const) {
      const block = new RegExp(`${status}:\\s*\\{[\\s\\S]*?\\n  \\},`).exec(badge)?.[0] ?? "";
      assert.ok(block.length > 0, `no ${status} entry found in InvoiceStatusBadge`);
      assert.match(
        block,
        new RegExp(`(bg|text|border)-${token}\\b`),
        `${status} on screen should be drawn with the "${token}" token, matching the PDF`
      );
    }
  });
});

describe("invoice content parity", () => {
  test("an invoice with no due date says 'On receipt', like the app does", () => {
    // The screen renders "On receipt"; the PDF used to print an em dash,
    // which reads as missing data rather than a real payment term.
    const bytes = buildInvoicePdf({ ...BASE, dueDate: null }).bytes;
    const text = readPdfText(bytes);
    assert.match(text, /On receipt/);
    assert.ok(!text.includes("Due \u2014"), "the em dash placeholder should be gone");
  });

  test("a dated invoice still prints the date", () => {
    const text = readPdfText(buildInvoicePdf({ ...BASE, dueDate: "2026-10-11" }).bytes);
    assert.match(text, /Oct 11, 2026/);
  });
});

/** Minimal text extraction — enough to assert on placed strings. */
function readPdfText(bytes: Uint8Array): string {
  return pageStreams(decodePdf(bytes))
    .map((stream) =>
      [...stream.matchAll(/\((?:[^()\\]|\\.)*\)\s*Tj/g)]
        .map((m) => m[0].replace(/\s*Tj$/, "").replace(/^\(|\)$/g, ""))
        .join(" ")
    )
    .join("\n");
}
