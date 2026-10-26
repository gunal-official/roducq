import { Fragment } from "react";

import { CHANGELOG_HERO } from "@/app/(marketing)/changelog/content";

function HeroWord({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <span
      className="lm-hero-word"
      style={{ "--lm-word-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </span>
  );
}

/**
 * /changelog hero — the reference's three-element composition (eyebrow,
 * inline dark + gradient headline, lead) rebuilt at its measured geometry
 * (docs/FORMA_CHANGELOG_REFERENCE.md §3).
 */
export function ChangelogHero() {
  const before = CHANGELOG_HERO.titleBefore.split(/\s+/).filter(Boolean);

  return (
    <section
      aria-label="Changelog hero"
      className="bg-lm-card pb-11 pt-14 min-[1024px]:pb-18 min-[1024px]:pt-23"
    >
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
            {CHANGELOG_HERO.eyebrow}
          </p>

          {/* MEASURED on Forma /changelog:
              - 10px spacer below eyebrow (mt-2.5)
              - 67.2px >=1200, 45.4px at 1024, 44px <=768, weight 600, -0.03em
              - Single inline line at >=768px ("What's new in roducq"), wrapping
                cleanly to two centered lines on narrow phones (<768px).
              - LCP-safe clip-path mask reveal (opacity: 1 in both keyframes). */}
          <h1 className="mt-2.5 max-w-full font-lm-semibold tracking-[-0.03em] text-lm-44 text-lm-ink min-[1024px]:text-lm-45-4 min-[1200px]:text-lm-67">
            {before.map((word, index) => (
              <Fragment key={`${word}-${index}`}>
                <HeroWord delay={(index + 1) * 50}>{word}</HeroWord>{" "}
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
              {CHANGELOG_HERO.titleAfter}
            </span>
          </h1>

          {/* MEASURED: 32px gap below H1 (mt-8), 640px measure, 19px/1.65 at
              >=1024 and 16.5px/1.65 below 1024, delay 450ms. */}
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
            {CHANGELOG_HERO.intro}
          </p>
        </div>
      </div>
    </section>
  );
}
