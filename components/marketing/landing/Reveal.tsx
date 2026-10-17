"use client";

import { useRef, useSyncExternalStore } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

import { clsx as cn } from "clsx";

/**
 * Scroll reveal — Motion.dev, one observer, one recorded curve.
 *
 * THE MEASURED CONTRACT (all values come from the reference's recorded
 * entrance, not from a generic spring preset):
 *   duration     620ms desktop / 420ms below 768px
 *   easing       cubic-bezier(0.22, 1, 0.36, 1)
 *   distance     14px desktop / 8px compact
 *   stagger      whatever the section passes, scaled ×0.6 on compact
 *   trigger      once, when ~8% of the element crosses 8% above the fold
 *
 * WHY THE ELEMENT IS VISIBLE IN THE SERVER HTML. Motion would happily render
 * `opacity: 0` on the server, which turns a scroll reveal into a blank page
 * for a crawler or a visitor whose JS failed. Instead the hidden state lives
 * in CSS behind the `.lm-js` marker (added before first paint by the
 * marketing layout), and this component only writes inline styles after it
 * has mounted. Without JS the page is complete; with JS the CSS pre-hide
 * means the transform is invisible until Motion takes over.
 *
 * REDUCED MOTION. `useReducedMotion()` resolves every reveal immediately:
 * zero duration, zero delay, no displacement. `MotionConfig` in
 * MotionProvider applies the same preference to every other Motion
 * component as a second line of defence.
 */
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger, in ms. Siblings pass index * 60–90 for the reference cascade. */
  delay?: number;
  as?: "div" | "li" | "section" | "article";
}

const TAGS = {
  div: motion.div,
  li: motion.li,
  section: motion.section,
  article: motion.article,
} as const;

/** The reference's recorded curve. Shared with landing.css. */
const EASE = [0.22, 1, 0.36, 1] as const;

/** A store that never changes: the only signal is "we are on the client". */
const emptySubscribe = () => () => {};

function subscribeCompact(onChange: () => void) {
  const query = window.matchMedia("(max-width: 767px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, {
    once: true,
    margin: "0px 0px -8% 0px",
    amount: 0.08,
  });
  const reduce = useReducedMotion();
  // `false` on the server, `true` after hydration. useSyncExternalStore is
  // the hydration-safe way to gate inline Motion styles: no state-setting
  // effect, no mismatch, and no inline opacity in the server HTML.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
  // Very old browsers can have JS but no IntersectionObserver. Matching the
  // previous implementation's fallback, those visitors get the end state
  // immediately rather than a page of invisible bands.
  const observerSupported = useSyncExternalStore(
    emptySubscribe,
    () => typeof IntersectionObserver !== "undefined",
    () => true,
  );

  const show = inView || Boolean(reduce) || !observerSupported;
  const distance = reduce ? 0 : compact ? 8 : 14;
  const duration = reduce ? 0 : compact ? 0.42 : 0.62;
  const stagger = reduce ? 0 : compact ? delay * 0.6 : delay;

  const MotionTag = TAGS[Tag] as React.ElementType;

  return (
    <MotionTag
      // The ref is one HTMLElement across every allowed tag; the cast keeps
      // the `as` set closed without giving up the shared prop surface.
      ref={ref as React.Ref<HTMLElement>}
      initial={false}
      animate={
        mounted
          ? show
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: distance }
          : undefined
      }
      transition={{
        duration,
        delay: stagger / 1000,
        ease: [...EASE],
      }}
      data-visible={mounted && show ? "true" : "false"}
      data-motion={mounted && compact ? "compact" : "desktop"}
      data-reveal-duration={mounted ? Math.round(duration * 1000) : 620}
      className={cn("lm-reveal", className)}
      style={
        delay
          ? ({ "--lm-reveal-delay": `${delay}ms` } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </MotionTag>
  );
}
