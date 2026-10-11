/**
 * Ember Studio design tokens shared by the browser, PDF exports, invite
 * emails, and the root error boundary.
 *
 * The CSS layer exposes the same canonical palette as `--ember-*` custom
 * properties and keeps the former `--bg`, `--accent`, `--card`, and related
 * aliases alive while existing screens migrate. `tests/lib/design-tokens.test.ts`
 * checks the CSS/TypeScript mirror so those surfaces cannot drift apart.
 */

/** `#rrggbb`, lowercase — exactly as authored in app/globals.css. */
export type Hex = `#${string}`;

/** Canonical light-theme tokens consumed outside CSS (not legacy aliases). */
const CORE_TOKENS = {
  background: "#fafaf9",
  surface: "#f5f5f4",
  surfaceRaised: "#e7e5e4",
  terracotta: "#c2410c",
  terracottaHover: "#9a3412",
  amber: "#f59e0b",
  text: "#1c1917",
  secondaryText: "#57534e",
  neutral: "#78716c",
  border: "#d6d3d1",
  error: "#e5484d",
  success: "#1f9d68",
  successSoft: "#e3f5ec",
  info: "#2f6fed",
} as const satisfies Record<string, Hex>;

export type TokenName = keyof typeof CORE_TOKENS;

/**
 * Public token object. The legacy keys are deliberate aliases: retaining
 * them lets PDF/email consumers and older UI code migrate incrementally.
 */
export const TOKENS = {
  ...CORE_TOKENS,
  bg: CORE_TOKENS.background,
  accent: CORE_TOKENS.terracotta,
  muted: CORE_TOKENS.surfaceRaised,
  card: CORE_TOKENS.surface,
  dark: CORE_TOKENS.text,
} as const;

/** Canonical token name → CSS custom property in `:root`. */
export const TOKEN_CSS_VAR: Record<TokenName, string> = {
  background: "--ember-background",
  surface: "--ember-surface",
  surfaceRaised: "--ember-surface-raised",
  terracotta: "--ember-terracotta",
  terracottaHover: "--ember-terracotta-hover",
  amber: "--ember-amber",
  text: "--ember-text",
  secondaryText: "--ember-secondary-text",
  neutral: "--ember-neutral",
  border: "--ember-border",
  error: "--error",
  success: "--success",
  successSoft: "--success-soft",
  info: "--info",
};

/** Control corners are 8px; cards, dialogs, and popovers are 12px. */
export const RADIUS_CONTROL = "8px";
export const RADIUS_SURFACE = "12px";
export const RADIUS_PILL = "9999px";

/** Legacy single-radius alias; new code should pick a semantic radius. */
export const RADIUS = RADIUS_CONTROL;

/**
 * Font stacks for surfaces outside the Tailwind/next-font pipeline. Family
 * names are single-quoted so the stacks can be embedded in a double-quoted
 * inline HTML `style="…"` attribute (email).
 */
export const FONT_STACKS = {
  /** Self-hosted Playfair Display, with common serif fallbacks. */
  display: "'Playfair Display', Georgia, 'Times New Roman', Times, serif",
  /** Self-hosted Source Sans 3, with system UI fallbacks. */
  body: "'Source Sans 3', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
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

/** `#c2410c` → `{ r: 0.757…, g: 0.255…, b: 0.047… }`. */
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
