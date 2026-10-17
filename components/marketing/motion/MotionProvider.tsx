"use client";

import { MotionConfig } from "motion/react";

/**
 * Motion.dev configuration for the marketing surface.
 *
 * `reducedMotion="user"` is the belt to the per-component braces: Motion
 * itself will drop transform and layout animations when the visitor has
 * asked for reduced motion, even if a component forgets to read the
 * preference. The default transition is the reference's recorded entrance
 * curve — 620ms on `cubic-bezier(0.22, 1, 0.36, 1)` — so a new motion
 * component cannot silently invent a spring or a different duration.
 *
 * WHY A PROVIDER AT ALL. The landing page is deliberately assembled from
 * server components; this client boundary wraps them without turning them
 * into client components. Next serialises the children as RSC payload and
 * keeps the server render intact.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionConfig>
  );
}
