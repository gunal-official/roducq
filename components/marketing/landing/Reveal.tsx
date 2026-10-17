"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll reveal — one IntersectionObserver, one class flip.
 *
 * The reference reveals its sections as they enter the viewport. This does
 * the same with no animation library: the element ships in the server HTML
 * (crawlers and no-JS visitors see the finished page), and the observer
 * only replays the entrance once, then disconnects.
 *
 * REDUCED MOTION IS HANDLED IN CSS, not here — landing.css resolves
 * `.lm-reveal` to its end state and kills the keyframes, so the component
 * never needs to read the media query to stay correct.
 *
 * `as` keeps the wrapper semantic: a <li> inside a feature <ul> must stay a
 * <li>, and a reveal wrapper that silently changes the document outline is
 * the kind of thing that breaks an AT user's list navigation.
 */
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger, in ms. Siblings pass index * 60 for the reference's cascade. */
  delay?: number;
  as?: "div" | "li" | "section" | "article";
}

export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver (very old browsers) → show it immediately
    // rather than leaving the section invisible forever. This writes the
    // attribute the CSS already keys off, so it is a DOM update rather than
    // a render, and the element never depends on a second pass to appear.
    if (typeof IntersectionObserver === "undefined") {
      node.dataset.visible = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setVisible(true);
          observer.disconnect();
        }
      },
      // Fire slightly before the element is fully in view so the motion
      // finishes as the section settles instead of after it has landed.
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // The ref type differs per tag; the `as` prop keeps the set closed and
      // React accepts the matching element ref at runtime.
      ref={ref as React.Ref<never>}
      data-visible={visible}
      className={cn("lm-reveal", className)}
      style={delay ? ({ "--lm-reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
