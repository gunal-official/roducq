"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Pipeline SVG with animated particles that respect viewport visibility
 * and reduced-motion preferences. Uses IntersectionObserver for visibility
 * and matchMedia for reduced-motion, with proper cleanup.
 *
 * This is a client component that must be wrapped in a server component.
 */
export function PipelineSVG() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  // Conservative initialization: assume reduced motion until we can check
  const [reduceMotion, setReduceMotion] = useState(true);

  // Generate stable, unique prefix for path IDs using useId
  const idPrefix = useId();

  // Track viewport visibility with IntersectionObserver (not once: true)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      }
    );

    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  // Track reduced-motion preference with live updates
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handler = (event: MediaQueryListEvent | { matches: boolean }) => {
      setReduceMotion(event.matches);
    };

    // Read actual preference and update state
    handler({ matches: mediaQuery.matches });

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      // Legacy browsers (Safari < 14)
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  // Should animate: visible AND not reduced motion
  const shouldAnimate = isVisible && !reduceMotion;

  // Connector paths with unique IDs generated from useId prefix
  const paths = [
    { id: `${idPrefix}-1`, d: "M 4 28 C 72 28, 92 90, 140 90", stroke: "var(--lm-border-soft)", strokeWidth: "1.5" },
    { id: `${idPrefix}-2`, d: "M 4 70 C 72 70, 92 90, 140 90", stroke: "var(--lm-border-soft)", strokeWidth: "1.5" },
    { id: `${idPrefix}-3`, d: "M 4 114 C 72 114, 92 90, 140 90", stroke: "var(--lm-accent)", strokeWidth: "1.75" },
    { id: `${idPrefix}-4`, d: "M 4 152 C 72 152, 92 90, 140 90", stroke: "var(--lm-border-soft)", strokeWidth: "1.5" },
    { id: `${idPrefix}-5`, d: "M 140 90 L 276 90", stroke: "var(--lm-border)", strokeWidth: "1.5" },
  ];

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 280 180"
      className="pointer-events-none hidden h-40 w-full lg:block"
      aria-hidden="true"
    >
      {/* Connector paths - always visible */}
      {paths.map((path) => (
        <path
          key={path.id}
          id={path.id}
          className="lm-connector"
          d={path.d}
          fill="none"
          stroke={path.stroke}
          strokeWidth={path.strokeWidth}
          strokeDasharray="4 4"
        />
      ))}

      {/* Animated particles - conditionally rendered based on visibility and reduced motion */}
      {shouldAnimate && (
        <>
          <circle r="3" fill="var(--lm-accent)">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin="0s"
            >
              <mpath href={`#${idPrefix}-1`} />
            </animateMotion>
          </circle>
          <circle r="3" fill="var(--lm-accent)">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin="0.5s"
            >
              <mpath href={`#${idPrefix}-2`} />
            </animateMotion>
          </circle>
          <circle r="3" fill="var(--lm-accent)">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin="1s"
            >
              <mpath href={`#${idPrefix}-3`} />
            </animateMotion>
          </circle>
          <circle r="3" fill="var(--lm-accent)">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin="1.5s"
            >
              <mpath href={`#${idPrefix}-4`} />
            </animateMotion>
          </circle>
          <circle r="3" fill="var(--lm-accent)">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin="2s"
            >
              <mpath href={`#${idPrefix}-5`} />
            </animateMotion>
          </circle>
        </>
      )}
    </svg>
  );
}
