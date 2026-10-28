import { Fragment } from "react";

import { ABOUT_HERO } from "@/app/(marketing)/about/content";

/**
 * /about hero — the reference's centred three-element composition
 * (eyebrow, ink + gradient headline, lead) at its measured geometry
 * (docs/FORMA_ABOUT_REFERENCE.md §4). Same construction as
 * ChangelogHero: the reference ships this hero as an identical kit
 * on both pages, and the /about capture matches its measurements —
 * 67.2px ≥1200, 45.4px at 1024, 44px below, weight 600, −0.03em.
 *
 * PR #53 LCP safety: every entrance is the CSS clip-path mask
 * (`lm-hero-in` / `lm-hero-word` / `lm-hero-accent-inline`), whose
 * keyframes hold opacity at 1 — the headline and lead are valid LCP
 * candidates from the first paint and fully visible without JS.
 */
export function AboutHero() {
  const before = ABOUT_HERO.titleBefore.split(/\s+/).filter(Boolean);

  return (
    <section className="ab-hero">
      <div className="lm-shell">
        <div className="mx-auto flex max-w-full flex-col items-center text-center">
          <p
            className="lm-hero-in text-lm-14 font-lm-semibold leading-lm-label text-lm-ink-accent"
            style={
              {
                "--lm-hero-duration": "800ms",
                "--lm-hero-delay": "0ms",
                "--lm-hero-rise": "16px",
              } as React.CSSProperties
            }
          >
            {ABOUT_HERO.eyebrow}
          </p>

          {/* One inline line ≥768px, two centred lines below — the
              gradient phrase wraps as a centred block exactly where
              the reference's does (`.lm-hero-accent-inline`). */}
          <h1 className="mt-2.5 max-w-full font-lm-semibold tracking-[-0.03em] text-lm-44 text-lm-ink min-[1024px]:text-lm-45-4 min-[1200px]:text-lm-67">
            {before.map((word, index) => (
              <Fragment key={`${word}-${index}`}>
                <span
                  className="lm-hero-word"
                  style={
                    {
                      "--lm-word-delay": `${(index + 1) * 50}ms`,
                    } as React.CSSProperties
                  }
                >
                  {word}
                </span>{" "}
              </Fragment>
            ))}
            <span
              className="lm-hero-accent-inline lm-text-gradient"
              style={
                {
                  "--lm-hero-delay": "350ms",
                  "--lm-hero-rise": "28px",
                } as React.CSSProperties
              }
            >
              {ABOUT_HERO.titleAfter}
            </span>
          </h1>

          {/* Measured: 32px below the H1, 640px measure, 19px/1.65 at
              ≥1024 and 16.5px/1.65 below. Muted slate #687083 on the
              white band — contrast-checked in the audit (≥4.5:1). */}
          <p
            className="lm-hero-in mt-8 w-full max-w-lm-measure-lead text-lm-16-5 text-lm-muted-slate min-[1024px]:text-lm-19 min-[1024px]:leading-[1.65]"
            style={
              {
                "--lm-hero-duration": "800ms",
                "--lm-hero-delay": "450ms",
                "--lm-hero-rise": "16px",
              } as React.CSSProperties
            }
          >
            {ABOUT_HERO.intro}
          </p>
        </div>
      </div>
    </section>
  );
}
