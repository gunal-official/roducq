"use client";

import { useId } from "react";

/**
 * The auth panel artwork (Forma Phase B) — an original, hand-authored
 * SVG.
 *
 * It draws what the product actually does: a stream of client work
 * moving along one continuous ribbon — intake, brief, proposal,
 * invoice — with each stage a small document card riding the curve, and
 * a dash running along the ribbon so the work reads as in motion.
 *
 * Every colour is a token reference, so the artwork follows the theme
 * without a second palette to maintain. It is decoration: the whole
 * graphic is `aria-hidden`. The gradient ids are per-instance for the
 * same reason as the brand mark: a shared id would let a hidden copy
 * become the paint server for every visible one.
 */
export function AuthArtwork({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ribbonId = `auth-ribbon-${uid}`;
  const glowId = `auth-glow-${uid}`;
  const cardId = `auth-card-${uid}`;

  return (
    <svg
      viewBox="0 0 560 560"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={ribbonId}
          x1="70"
          y1="450"
          x2="450"
          y2="110"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--forma-lavender)" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="var(--forma-purple)" stopOpacity="0.95" />
          <stop offset="1" stopColor="var(--forma-surface)" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient
          id={glowId}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="translate(270 250) rotate(90) scale(280)"
        >
          <stop stopColor="var(--forma-purple)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--forma-purple)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={cardId} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--forma-surface)" stopOpacity="0.24" />
          <stop offset="1" stopColor="var(--forma-surface)" stopOpacity="0.07" />
        </linearGradient>
      </defs>

      <circle cx="270" cy="250" r="265" fill={`url(#${glowId})`} />

      {/* The pipeline ribbon, and the dash that runs along it. */}
      <path
        d="M92 436c0-104 74-142 140-176s96-104 190-128"
        stroke={`url(#${ribbonId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        className="forma-flow"
        d="M92 436c0-104 74-142 140-176s96-104 190-128"
        stroke="var(--forma-surface)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />

      {/* Four stages riding the ribbon. */}
      <g className="forma-drift-node">
        <g transform="translate(62 406) rotate(-7)">
          <rect
            width="60"
            height="60"
            rx="18"
            fill={`url(#${cardId})`}
            stroke="var(--forma-surface)"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
          <rect x="14" y="19" width="32" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.6" />
          <rect x="14" y="30" width="22" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.4" />
          <rect x="14" y="41" width="26" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.25" />
        </g>
      </g>

      <g className="forma-drift-node" style={{ animationDelay: "90ms" }}>
        <g transform="translate(150 292) rotate(6)">
          <rect
            width="60"
            height="60"
            rx="18"
            fill={`url(#${cardId})`}
            stroke="var(--forma-surface)"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
          <rect x="14" y="19" width="26" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.6" />
          <rect x="14" y="30" width="32" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.4" />
          <rect x="14" y="41" width="18" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.25" />
        </g>
      </g>

      <g className="forma-drift-node" style={{ animationDelay: "180ms" }}>
        <g transform="translate(242 210) rotate(-5)">
          <rect
            width="60"
            height="60"
            rx="18"
            fill={`url(#${cardId})`}
            stroke="var(--forma-surface)"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
          <rect x="14" y="19" width="30" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.6" />
          <rect x="14" y="30" width="20" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.4" />
          <rect x="14" y="41" width="28" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.25" />
        </g>
      </g>

      <g className="forma-drift-node" style={{ animationDelay: "270ms" }}>
        <g transform="translate(392 100) rotate(8)">
          <rect
            width="60"
            height="60"
            rx="18"
            fill={`url(#${cardId})`}
            stroke="var(--forma-surface)"
            strokeOpacity="0.28"
            strokeWidth="1.5"
          />
          <rect x="14" y="19" width="24" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.6" />
          <rect x="14" y="30" width="32" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.4" />
          <rect x="14" y="41" width="16" height="5" rx="2.5" fill="var(--forma-surface)" fillOpacity="0.25" />
        </g>
      </g>

      {/* Two loose chips, still in flight. */}
      <g opacity="0.5">
        <rect
          x="452"
          y="286"
          width="54"
          height="16"
          rx="8"
          fill="var(--forma-surface)"
          fillOpacity="0.16"
        />
        <rect
          x="52"
          y="176"
          width="38"
          height="13"
          rx="6.5"
          fill="var(--forma-surface)"
          fillOpacity="0.12"
        />
      </g>
    </svg>
  );
}
