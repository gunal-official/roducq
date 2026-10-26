import { Fragment } from "react";
import Link from "next/link";

import { FEATURES_HERO } from "@/app/(marketing)/features/content";

/**
 * /features hero — the reference's measured three-element composition
 * (eyebrow, two-line headline, lead) plus the two-CTA row this
 * reference hero carries and the /solutions hero does not.
 *
 * GEOMETRY (MEASURED on the live reference at 1440x900 — see
 * docs/FORMA_FEATURES_PAGE_AUDIT.md §3.1; the band padding custom
 * properties are the same values the /solutions hero measured):
 *
 *   band          padding 92px 0 72px 0 from 810px up,
 *                 56px 0 44px 0 below 810px
 *   eyebrow       14px / 16.8px, 600, #5332d6, centred
 *   h1            67.2px / 68.54px, 600, -0.03em, #1b1426
 *                 44px / 44.88px below the desktop band
 *   lead          19px / 31.35px, #687083, measure 640px
 *                 (16.5px on the compact band, same as /solutions)
 *   buttons       52.03px tall, radius 10, 26px side padding,
 *                 12px apart, ~32px under the lead; on phones they
 *                 share one row at half width (MEASURED at 390)
 *
 * The reference puts "Plan, automate, and track" in ink on the first
 * line and the gradient phrase on the second; the approved Roducq
 * copy keeps that exact shape: "Capture, structure, and send" then
 * "client work in one workspace." No <br> is inserted — the gradient
 * unit is a block and wraps naturally at every width.
 *
 * THE ENTRANCE. Same measured cadence the /solutions hero uses:
 *   eyebrow   800ms  cubic-bezier(0.2, 0.7, 0.2, 1)  delay 0
 *   h1 words  900ms  cubic-bezier(0.16, 1, 0.3, 1)  delay 50ms × word
 *   highlight 900ms  display ease                       delay 350ms
 *   lead      800ms  body ease                          delay 450ms
 *   CTA row   800ms  body ease                          delay 550ms
 *
 * THE LCP RULE (PR #53, preserved). The reference starts its words at
 * opacity 0.001 with a 10px blur (its own LCP still records at 548ms,
 * but that is a risk Roducq already fixed once). This hero keeps
 * opacity 1 in every keyframe and uses the clip-path mask
 * (`.lm-hero-in`, `.lm-hero-mask` in landing.css): server-rendered,
 * fully painted on the first frame, no filter on the LCP candidate,
 * and complete for no-JS and reduced-motion visitors.
 */
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

export function FeaturesHero() {
  const before = FEATURES_HERO.titleBefore.split(/\s+/).filter(Boolean);
  return (
    <section className="bg-lm-card pt-[56px] pb-[44px] min-[810px]:pt-[92px] min-[810px]:pb-[72px]">
      <div className="lm-shell">
        <div className="mx-auto flex max-w-full flex-col items-center text-center">
          <p
            className="lm-hero-in text-lm-14 font-lm-semibold leading-[1.2] text-lm-ink-accent"
            style={
              {
                "--lm-hero-duration": "800ms",
                "--lm-hero-delay": "0ms",
                "--lm-hero-rise": "16px",
              } as React.CSSProperties
            }
          >
            {FEATURES_HERO.eyebrow}
          </p>

          <h1 className="mt-2.5 max-w-full font-lm-semibold tracking-[-0.03em] text-lm-44 text-lm-ink min-[1200px]:text-lm-67">
            {before.map((word, index) => (
              <Fragment key={`${word}-${index}`}>
                <HeroWord delay={(index + 1) * 50}>{word}</HeroWord>{" "}
              </Fragment>
            ))}
            {/* The gradient unit is one animated block at delay 350ms,
                exactly the reference's measured Highlight composition. */}
            <span
              className="lm-hero-accent lm-text-gradient"
              style={
                {
                  "--lm-hero-delay": "350ms",
                  "--lm-hero-rise": "28px",
                } as React.CSSProperties
              }
            >
              {FEATURES_HERO.titleAfter}
            </span>
          </h1>

          <p
            className="lm-hero-in mt-8 w-full max-w-[640px] text-lm-16-5 text-lm-muted-slate min-[1200px]:text-lm-19 min-[1200px]:leading-[1.65]"
            style={
              {
                "--lm-hero-duration": "800ms",
                "--lm-hero-delay": "450ms",
                "--lm-hero-rise": "16px",
              } as React.CSSProperties
            }
          >
            {FEATURES_HERO.intro}
          </p>

          {/* MEASURED: 52.03px tall, radius 10, 12px apart, sharing one
              row at 390. The reference's primary is a filled purple
              button and its secondary a white hairline button; Roducq
              resolves both through its own token buttons. The entrance
              rides the same body ease one step behind the lead. */}
          <div
            className="lm-hero-in mt-8 flex w-full flex-row gap-3 min-[1200px]:w-auto"
            style={
              {
                "--lm-hero-duration": "800ms",
                "--lm-hero-delay": "550ms",
                "--lm-hero-rise": "16px",
              } as React.CSSProperties
            }
          >
            <Link
              href={FEATURES_HERO.primaryCta.href}
              className="inline-flex h-13 min-h-11 flex-1 items-center justify-center rounded-lm-button bg-lm-accent px-6.5 text-lm-15-5 font-lm-regular text-lm-on-accent shadow-lm-sm transition-colors duration-200 hover:bg-lm-accent-strong min-[1200px]:flex-none"
            >
              {FEATURES_HERO.primaryCta.label}
            </Link>
            <Link
              href={FEATURES_HERO.secondaryCta.href}
              className="inline-flex h-13 min-h-11 flex-1 items-center justify-center rounded-lm-button border border-lm-hairline bg-lm-card px-6.5 text-lm-15-5 font-lm-regular text-lm-ink transition-colors duration-200 hover:border-lm-border hover:bg-lm-canvas min-[1200px]:flex-none"
            >
              {FEATURES_HERO.secondaryCta.label}
              <span className="sr-only">(opens your email client)</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
