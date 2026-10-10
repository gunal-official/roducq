/**
 * The roducq design tokens — ONE source of truth for screen and print
 * (pixel-parity).
 *
 * WHY THIS FILE EXISTS. The palette used to live twice:
 *
 *   - `app/globals.css` owned the screen tokens as CSS custom properties
 *     (`--text`, `--border`, `--accent`, …).
 *   - `lib/pdf/layout.ts` carried a hand-copied `COLORS` map, introduced with
 *     the comment "the ui.webp design tokens, as print colours".
 *
 * Two copies of one palette is how a PDF quietly stops looking like the
 * product, and it had already happened: the PDF's `ink` was `#1a1a1f` where
 * the app's `--text` was `#17171c`, and its `hairline` was `#e5e7eb` where
 * `--border` was `#e9e9ee`. Nothing failed, because nothing was checking.
 *
 * Now: these hex values ARE the tokens. `lib/pdf/layout.ts` derives its RGB
 * palette from them, and `tests/lib/design-tokens.test.ts` parses
 * `app/globals.css` back and fails if either side moves alone. Screen and
 * print can no longer drift apart without a test saying so.
 *
 * SCOPE. These are the LIGHT-theme (`:root`) tokens. A PDF is ink on paper,
 * so print always renders against the light set no matter what the reader's
 * dark-mode preference is — which is the same collapse the app already
 * performs in its `@media print` block, and why the parity test checks the
 * two agree on every token.
 *
 * The one token that legitimately differs between screen and print is `bg`:
 * the screen sits on a warm ivory backdrop (#fefbfa), paper is white. `bg`
 * here keeps the screen value because that is what `--bg` means — the
 * surface behind a card, which only a screen has.
 *
 * PALETTE (2026-09 design guide): warm ivory backdrop, near-white card,
 * espresso ink, burnt orange-red accent. The same values feed the PDF
 * (lib/pdf/layout.ts), the invite email (lib/invite-email.ts) and the root
 * error boundary (app/global-error.tsx); tests/lib/design-guide.test.ts
 * pins them to the guide.
 *
 * NOT THE REFERENCE PIXEL PASS. This makes the two surfaces share one
 * palette; it does not prove the result matches the 15 reference PDFs. That
 * pass stays parked (docs/step-34-closeout.md §4) until the reference
 * renders land in the workspace.
 */

/** `#rrggbb`, lowercase — exactly as authored in app/globals.css. */
export type Hex = `#${string}`;

/**
 * The tokens that exist as literal hex in `:root`.
 *
 * `--accent-soft` and `--info-soft` are deliberately NOT listed: CSS defines
 * them as `color-mix(in srgb, var(--x) 12%, var(--card))`, so they are
 * derived by `soft()` below instead of being copied — one formula rather
 * than two constants that can disagree.
 */
export const TOKENS = {
  bg: "#fefbfa",
  text: "#16100f",
  accent: "#c12c01",
  muted: "#f6f0ef",
  card: "#fffffe",
  border: "#e3dcda",
  error: "#e5484d",
  success: "#1f9d68",
  successSoft: "#e3f5ec",
  dark: "#16100f",
  info: "#2f6fed",
} as const satisfies Record<string, Hex>;

export type TokenName = keyof typeof TOKENS;

/**
 * The one corner radius (`--radius` in `:root`). Surfaces that can't read CSS
 * variables — inline-styled email HTML, the root error boundary — use this
 * instead of hardcoding their own number.
 */
export const RADIUS = "0.35rem";

/**
 * Font stacks for surfaces outside the Tailwind/next-font pipeline. Family
 * names are single-quoted so the stacks drop safely into a double-quoted
 * HTML `style="…"` attribute (email).
 */
export const FONT_STACKS = {
  /** Headings, numbers, brand — system serifs, nothing to download. */
  display: "Georgia, 'Times New Roman', Times, serif",
  /** Body copy. Inter when installed/loaded, else the platform UI face. */
  body: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

/**
 * Token name → CSS custom property in `:root`. The parity test walks this
 * map, so a token renamed in CSS without being renamed here fails loudly
 * instead of silently dropping out of the comparison.
 */
export const TOKEN_CSS_VAR: Record<TokenName, string> = {
  bg: "--bg",
  text: "--text",
  accent: "--accent",
  muted: "--muted",
  card: "--card",
  border: "--border",
  error: "--error",
  success: "--success",
  successSoft: "--success-soft",
  dark: "--dark",
  info: "--info",
};

/** 0–255 channels in 0–1 range — the PDF writer's colour space. */
export interface RgbTriplet {
  r: number;
  g: number;
  b: number;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function channelHex(value: number): string {
  return Math.round(clamp01(value) * 255)
    .toString(16)
    .padStart(2, "0");
}

/** `#c12c01` → `{ r: 0.756…, g: 0.172…, b: 0.003… }`. */
export function hexToRgb(hex: string): RgbTriplet {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Not a 6-digit hex colour: ${hex}`);
  const packed = parseInt(match[1], 16);
  return {
    r: ((packed >> 16) & 0xff) / 255,
    g: ((packed >> 8) & 0xff) / 255,
    b: (packed & 0xff) / 255,
  };
}

/** `{ r: 1, g: 0.42, b: 0.17 }` → `#ff6b2b`. Inverse of `hexToRgb`. */
export function rgbToHex(rgb: RgbTriplet): Hex {
  return `#${channelHex(rgb.r)}${channelHex(rgb.g)}${channelHex(rgb.b)}`;
}

/**
 * Linear blend in sRGB, matching what `color-mix(in srgb, …)` does.
 * `weight` is how much of `a` survives: `mix(a, b, 1)` is `a`,
 * `mix(a, b, 0)` is `b`.
 */
export function mix(a: string, b: string, weight: number): Hex {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  const w = clamp01(weight);
  return rgbToHex({
    r: from.r * w + to.r * (1 - w),
    g: from.g * w + to.g * (1 - w),
    b: from.b * w + to.b * (1 - w),
  });
}

/** The soft-tint ratio CSS uses: `color-mix(in srgb, var(--x) 12%, var(--card))`. */
export const SOFT_WEIGHT = 0.12;

/** A token's soft tint — the wash behind a status chip or accent band. */
export function soft(color: string): Hex {
  return mix(color, TOKENS.card, SOFT_WEIGHT);
}
