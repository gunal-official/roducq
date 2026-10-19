import { Fragment } from "react";

import { SOLUTIONS_HERO } from "@/app/(marketing)/solutions/content";

/**
 * /solutions hero — the reference's three-element composition
 * (eyebrow, headline, lead) rebuilt at its measured geometry.
 *
 * GEOMETRY (MEASURED on the live reference at 1440x900 — see
 * docs/FORMA_SOLUTIONS_REFERENCE.md §4.1 and the 2026-10-19 hero
 * refinement in docs/SOLUTIONS_IMPLEMENTATION.md §13):
 *
 *   band          padding 92px 0 72px 0 from 810px up,
 *                 56px 0 44px 0 below 810px
 *   container     1240px at 1440 (Roducq shell: 1320 - 2×40)
 *   eyebrow       14px / 16.8px, 600, #5332d6, centred
 *   eyebrow gap   10px
 *   h1            67.2px / 68.54px, 600, -0.03em, #1b1426
 *                 44px / 44.88px below 1200px
 *   h1 → lead     32px
 *   lead          19px / 31.35px, #687083, measure 640px
 *                 16.5px / 27.23px below 1200px
 *
 * THE TWO BANDS ARE NOT THE SAME BREAKPOINT. The reference's
 * stylesheet gives the section `padding: var(--10ocmuz)` (92/72) and
 * overrides it to `var(--1reti8r)` (56/44) only on its phone preset
 * — which is the markup served below 810px. Its tablet preset
 * (810–1199px) overrides width and the headline gap but NOT padding,
 * so the 92/72 band starts at 810px. Its type scale switches to the
 * 67.2px display step on the desktop preset at 1200px. Hence:
 *
 *   < 810px        56/44 padding, 44px headline, 16.5px lead
 *   810–1199px     92/72 padding, 44px headline, 16.5px lead [INFERRED]
 *   >= 1200px      92/72 padding, 67.2px headline, 19px lead
 *
 * The 1024px band is the one viewport the capture never rendered
 * (both the reference and Roducq are documented as unverified
 * there); the 44/16.5 step at that width is inferred from the
 * reference's own compact values, because its tablet preset sits
 * below the desktop type step. Padding is not inferred — it comes
 * from the reference's stylesheet text.
 *
 * LINE BREAKS. The approved headline is longer than the reference's,
 * so the gradient unit is a block: ink sentence on the first line,
 * "One writing workspace." on the next — the reference's Title +
 * Highlight composition, wrapping naturally at every width. No <br>
 * is inserted; at 390px the ink line wraps to "Different client" /
 * "work." and the highlight to "One writing" / "workspace.".
 *
 * THE ENTRANCE. Measured cadence, reproduced exactly:
 *
 *   eyebrow   800ms  cubic-bezier(0.2, 0.7, 0.2, 1)  delay 0
 *   h1 words  900ms  cubic-bezier(0.16, 1, 0.3, 1)  delay 50ms × word
 *   highlight 900ms  cubic-bezier(0.16, 1, 0.3, 1)  delay 350ms
 *   lead      800ms  cubic-bezier(0.2, 0.7, 0.2, 1)  delay 450ms
 *
 * THE LCP RULE (PR #53, preserved). The reference starts every hero
 * element at opacity 0.001 and dissolves the words from blur(10px).
 * Opacity-zero first-viewport text suppresses the LCP record, and a
 * 10px filter on the candidate defers the paint the metric waits for.
 * So this hero keeps opacity: 1 in every keyframe and replaces both
 * effects with the clip-path mask the homepage hero already uses
 * (`.lm-hero-in`, `.lm-hero-mask` in landing.css). The headline is
 * laid out and at full opacity on the first frame — nothing is faded
 * in, and no filter is applied to the LCP candidate; only the mask's
 * visible band and a 16px rise travel. The highlight is one unit, as
 * measured, with its measured 28px rise. No JavaScript is involved:
 * the animation starts at first paint and settles at its end state, so
 * a no-JS visitor and a reduced-motion visitor both see the complete
 * headline.
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

export function SolutionsHero() {
  const before = SOLUTIONS_HERO.titleBefore.split(/\s+/).filter(Boolean);
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
            {SOLUTIONS_HERO.eyebrow}
          </p>

          {/* MEASURED: a 10px spacer sits between the eyebrow and the
              headline (y 178.5 -> 188.5), not 20px. */}
          <h1 className="mt-2.5 max-w-full font-lm-semibold tracking-[-0.03em] text-lm-44 text-lm-ink min-[1200px]:text-lm-67">
            {before.map((word, index) => (
              <Fragment key={`${word}-${index}`}>
                <HeroWord delay={(index + 1) * 50}>{word}</HeroWord>{" "}
              </Fragment>
            ))}
            {/* MEASURED: the highlight is one animated unit at delay
                350ms with a 28px rise, not a per-word stagger. In ink
                order it follows the headline sentence, so it is a
                block and takes the next line whenever the two do not
                fit — which, with this copy, is every width. */}
            <span
              className="lm-hero-accent lm-text-gradient"
              style={
                {
                  "--lm-hero-delay": "350ms",
                  "--lm-hero-rise": "28px",
                } as React.CSSProperties
              }
            >
              {SOLUTIONS_HERO.titleAfter}
            </span>
          </h1>

          {/* MEASURED: 32px between the headline and the lead
              (y 257.1 -> 289.1), 640px measure, 19px on the desktop
              band and 16.5px below it. */}
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
            {SOLUTIONS_HERO.intro}
          </p>
        </div>
      </div>
    </section>
  );
}
