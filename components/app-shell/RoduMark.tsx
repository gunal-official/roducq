"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * The RoduCQ mark — an original, hand-authored SVG (Forma Phase B).
 *
 * The plate is a squircle carrying a plum → purple gradient, and the
 * glyph is a monoline "R" drawn as a single stroked path: stem, bowl,
 * leg. Because the glyph is a path rather than a font letter, it stays
 * crisp at any size, inherits the theme's purple ramp through the
 * gradient stops, and can be animated as a stroke.
 *
 * Every colour is a token reference (`var(--forma-*)`) or the `white`
 * keyword — the palette stays centralised in app/globals.css, exactly as
 * the Phase A design-guide gate requires.
 *
 * The gradient ids are per-instance (React's useId, sanitised into a
 * valid id fragment). A shared id would be a real bug: `url(#id)`
 * resolves to the FIRST matching element in the document, so a copy
 * inside a `display:none` subtree — the auth brand panel below 1024px —
 * would become the paint server for every other copy, and Chromium
 * refuses to paint a gradient that lives in a hidden subtree. The plate
 * would silently disappear.
 */

/** Length of the monoline glyph, used for the draw-on animation. */
const GLYPH_LENGTH = 48;

export function RoduMark({
  className,
  size = 32,
  animated = false,
  title,
  solid = false,
}: {
  className?: string;
  size?: number;
  /** Draw the glyph on mount (the rail and the auth panel). */
  animated?: boolean;
  title?: string;
  /** Render plate in a single solid purple color instead of gradient. */
  solid?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const plateId = `roducq-plate-${uid}`;
  const sheenId = `roducq-sheen-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        {!solid && (
          <linearGradient
            id={plateId}
            x1="3"
            y1="2"
            x2="29"
            y2="30"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="var(--forma-plum)" />
            <stop offset="0.52" stopColor="var(--forma-purple)" />
            <stop offset="1" stopColor="var(--forma-purple-hover)" />
          </linearGradient>
        )}
        <radialGradient
          id={sheenId}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(9 7) rotate(48) scale(19)"
        >
          <stop stopColor="white" stopOpacity="0.22" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9.5"
        fill={solid ? "var(--forma-purple)" : `url(#${plateId})`}
      />
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9.5"
        fill={`url(#${sheenId})`}
      />

      {/* The monoline "R" — one path: stem, bowl, leg. */}
      <path
        d="M11 23V9.6h5.1a3.85 3.85 0 0 1 0 7.7H11m4.4 0 5.9 5.7"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? "forma-draw" : undefined}
      />

      {/* A live spark in the corner: the plate reads as active, not static. */}
      <circle cx="24.4" cy="7.6" r="2.5" fill="white" fillOpacity="0.92" />
      <circle
        cx="24.4"
        cy="7.6"
        r="2.5"
        fill="white"
        fillOpacity="0.45"
        className={animated ? "forma-pulse-ring" : undefined}
      />
    </svg>
  );
}

/**
 * The wordmark. Entire wordmark renders in one color when monochrome is true.
 */
export function Wordmark({
  className,
  monochrome = false,
}: {
  className?: string;
  /** Render entire wordmark in one inherited color (no accent on "cq"). */
  monochrome?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-display text-[17px] font-extrabold leading-none tracking-[-0.035em] text-text",
        className
      )}
    >
      rodu<span className={monochrome ? "text-inherit" : "text-accent"}>cq</span>
    </span>
  );
}
