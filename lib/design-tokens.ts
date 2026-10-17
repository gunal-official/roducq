/**
 * Forma design tokens shared by the browser, PDF exports, invite emails,
 * and the root error boundary.
 *
 * `app/globals.css` declares the same canonical light palette as `--forma-*`
 * custom properties. The old Ember names and the `--bg` / `--accent` /
 * `--card` aliases remain available so existing app and integration code can
 * migrate incrementally without a breaking token rename.
 */

/** `#rrggbb`, lowercase — exactly as authored in app/globals.css. */
export type Hex = `#${string}`;

/** Canonical light-theme tokens consumed outside CSS (not legacy aliases). */
const CORE_TOKENS = {
  background: "#faf8fc",
  surface: "#ffffff",
  surfaceRaised: "#f2ecf7",
  purple: "#7c3aed",
  purpleHover: "#6d28d9",
  lavender: "#ede5f8",
  plum: "#2c1b36",
  amber: "#9a5b0a",
  text: "#261d2d",
  secondaryText: "#665c70",
  neutral: "#74677f",
  border: "#e4ddea",
  error: "#c93d52",
  success: "#18794e",
  successSoft: "#e8f4ec",
  info: "#245fce",
} as const satisfies Record<string, Hex>;

/**
 * Public token key type. The two pre-Forma names remain accepted for
 * integrations compiled against the earlier token contract.
 */
export type TokenName = keyof typeof CORE_TOKENS | "terracotta" | "terracottaHover";

/**
 * Public token object. Legacy names deliberately alias Forma values: PDF/email
 * consumers and older UI integrations can migrate without a breaking change.
 */
export const TOKENS = {
  ...CORE_TOKENS,
  bg: CORE_TOKENS.background,
  accent: CORE_TOKENS.purple,
  muted: CORE_TOKENS.surfaceRaised,
  card: CORE_TOKENS.surface,
  dark: CORE_TOKENS.plum,
  /** @deprecated Use `purple`. Retained for pre-Forma integrations. */
  terracotta: CORE_TOKENS.purple,
  /** @deprecated Use `purpleHover`. Retained for pre-Forma integrations. */
  terracottaHover: CORE_TOKENS.purpleHover,
} as const;

/**
 * Dark-theme canvas, mirrored for the one consumer that cannot read CSS
 * custom properties: the root layout's `themeColor` (browser chrome tint).
 * Must stay equal to `.dark { --forma-background }` in app/globals.css.
 */
export const DARK_BACKGROUND: Hex = "#17131e";

/** Forma token key → CSS custom property; deprecated keys map to Forma values. */
export const TOKEN_CSS_VAR: Record<TokenName, string> = {
  background: "--forma-background",
  surface: "--forma-surface",
  surfaceRaised: "--forma-surface-raised",
  purple: "--forma-purple",
  purpleHover: "--forma-purple-hover",
  lavender: "--forma-lavender",
  plum: "--forma-plum",
  amber: "--forma-amber",
  text: "--forma-text",
  secondaryText: "--forma-secondary-text",
  neutral: "--forma-neutral",
  border: "--forma-border",
  error: "--forma-error",
  success: "--forma-success",
  successSoft: "--forma-success-soft",
  info: "--forma-info",
  /** @deprecated Use `purple`; retained as a CSS-variable lookup alias. */
  terracotta: "--forma-purple",
  /** @deprecated Use `purpleHover`; retained as a CSS-variable lookup alias. */
  terracottaHover: "--forma-purple-hover",
};

/** Control corners are 8px; cards, dialogs, and popovers are 12px. */
export const RADIUS_CONTROL = "8px";
export const RADIUS_SURFACE = "12px";
export const RADIUS_PILL = "9999px";

/** Legacy single-radius alias; new code should pick a semantic radius. */
export const RADIUS = RADIUS_CONTROL;

/**
 * Font stacks for surfaces outside the Tailwind/next-font pipeline.
 * Family names are single-quoted so the stacks can be embedded in a
 * double-quoted inline HTML `style="…"` attribute (email).
 */
export const FONT_STACKS = {
  /** Forma's self-hosted Manrope family for headings and body copy. */
  display: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  body: "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  /** Self-hosted Fira Code, with common monospace fallbacks. */
  mono: "'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

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

/** `#7c3aed` → `{ r: 0.486…, g: 0.227…, b: 0.929… }`. */
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

/** The tint ratio CSS uses for subtle brand and notification fills. */
export const SOFT_WEIGHT = 0.12;

/** A token's soft tint — the wash behind a status chip or accent band. */
export function soft(color: string): Hex {
  return mix(color, TOKENS.surface, SOFT_WEIGHT);
}
