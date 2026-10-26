import { Fragment } from "react";

import { INTEGRATIONS_HERO } from "@/app/(marketing)/integrations/content";

/**
 * /integrations hero — the reference's three-element composition (eyebrow,
 * two-part headline, lead) rebuilt at its measured geometry.
 *
 * GEOMETRY (MEASURED on the live reference — see
 * docs/FORMA_INTEGRATIONS_REFERENCE.md §3):
 *
 *   band          padding 92px 0 72px 0 at >= 1024px,
 *                 56px 0 44px 0 below it
 *   container     1240px at 1440 (Roducq shell: 1320 - 2x40)
 *   eyebrow       14px / 16.8px, 600, #5332d6, centred
 *   eyebrow gap   10px (y 178.5 -> 188.5 in the reference)
 *   h1            67.2px / 68.54px, 600, -2.016px, #1b1426 at >= 1200
 *                 45.4px / 46.28px, -1.36px at 1024
 *                 44px / 44.88px, -1.32px below it
 *   h1 -> lead    32px
 *   lead          19px / 31.35px, #687083, measure 640px
 *                 16.5px / 27.23px below 1024
 *
 * THE THREE-STEP HEADLINE IS THIS PAGE'S ONE NEW TYPE FACT. /solutions and
 * /features both jump 67.2 -> 44px, because their tablet band starts below the
 * compact step. The catalog page is different: the capture renders 45.4px at
 * 1024 and only drops to 44px at 768, and the band padding holds at 92/72 all
 * the way down to 1024. Both are measured values, so both are reproduced
 * rather than collapsed into the two-step pattern.
 *
 * LINE BREAKS. The approved headline is two sentences, so the gradient unit is
 * a block: "Bring the work in." in ink, "Send the work out." underneath — the
 * reference's Title + Highlight composition. No <br> is inserted; at 320px the
 * ink line wraps to "Bring the work" / "in." and the gradient wraps to
 * "Send the work" / "out.".
 *
 * THE ENTRANCE. The reference's measured cadence, reproduced exactly:
 *
 *   eyebrow   800ms  cubic-bezier(0.2, 0.7, 0.2, 1)  delay 0
 *   h1 words  900ms  cubic-bezier(0.16, 1, 0.3, 1)  delay 50ms x word
 *   highlight 900ms  cubic-bezier(0.16, 1, 0.3, 1)  delay 350ms
 *   lead      800ms  cubic-bezier(0.2, 0.7, 0.2, 1)  delay 450ms
 *
 * THE LCP RULE (PR #53, preserved). The reference starts every hero element at
 * opacity 0.001 and dissolves the words out of blur(10px). Opacity-zero
 * first-viewport text suppresses the LCP record and a 10px filter defers the
 * paint the metric waits for, so this hero keeps opacity at 1 in every keyframe
 * and uses the clip-path mask the homepage and /solutions heroes already use
 * (`.lm-hero-in`, `.lm-hero-mask`, `.lm-hero-word` in landing.css). The
 * headline is laid out at full opacity on the first frame; only the mask's
 * visible band and a small rise travel. No JavaScript is involved: the
 * animation starts at first paint and settles at its end state, so a no-JS
 * visitor and a reduced-motion visitor both see the complete headline.
 */
function HeroWord({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span
      className="lm-hero-word"
      style={{ "--lm-word-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </span>
  );
}

export function IntegrationsHero() {
  const before = INTEGRATIONS_HERO.titleBefore.split(/\s+/).filter(Boolean);
  return (
    <section className="bg-lm-card pt-[56px] pb-[44px] min-[1024px]:pt-[92px] min-[1024px]:pb-[72px]">
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
            {INTEGRATIONS_HERO.eyebrow}
          </p>

          {/* MEASURED: a 10px spacer sits between the eyebrow and the
              headline, not 20px. */}
          <h1 className="mt-2.5 max-w-full font-lm-semibold tracking-[-0.03em] text-lm-44 text-lm-ink min-[1024px]:text-lm-45-4 min-[1200px]:text-lm-67">
            {before.map((word, index) => (
              <Fragment key={`${word}-${index}`}>
                <HeroWord delay={(index + 1) * 50}>{word}</HeroWord>{" "}
              </Fragment>
            ))}
            {/* MEASURED: the highlight is one animated unit at delay 350ms
                with a 28px rise, not a per-word stagger. In ink order it
                follows the headline sentence, so it is a block and takes the
                next line. */}
            <span
              className="lm-hero-accent lm-text-gradient"
              style={
                {
                  "--lm-hero-delay": "350ms",
                  "--lm-hero-rise": "28px",
                } as React.CSSProperties
              }
            >
              {INTEGRATIONS_HERO.titleAfter}
            </span>
          </h1>

          {/* MEASURED: 32px between the headline and the lead, a 640px
              measure, 19px at >= 1024 and 16.5px below it. */}
          <p
            className="lm-hero-in mt-8 w-full max-w-[640px] text-lm-16-5 text-lm-muted-slate min-[1024px]:text-lm-19 min-[1024px]:leading-[1.65]"
            style={
              {
                "--lm-hero-duration": "800ms",
                "--lm-hero-delay": "450ms",
                "--lm-hero-rise": "16px",
              } as React.CSSProperties
            }
          >
            {INTEGRATIONS_HERO.intro}
          </p>
        </div>
      </div>
    </section>
  );
}
