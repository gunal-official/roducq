import {
  SOLUTIONS_CHECKLIST,
  SOLUTIONS_CLOSING,
} from "@/app/(marketing)/solutions/content";
import { ArrowRight, Check } from "lucide-react";

import { ChecklistRows } from "./PracticeMocks";

/**
 * The closing CTA — the reference's second gradient
 * stage, with the "getting started" miniature beside
 * the headline.
 *
 * MEASURED on the reference (1440x900), and several of these
 * were wrong here before:
 *
 *   section    120px top / 96px bottom at desktop; 60px / 64px below it
 *   card       radius 28px at desktop, 22px below it (it was 28
 *              everywhere); padding 96/72 at desktop, 56/20 below
 *   headline   64.8px / 66.1px / 600 / -2.268px at >=1200 — NOT the
 *              hero's 67.2px, which this was borrowing; 40px / 40.8px /
 *              -1.4 below it, measured at 768 and 390
 *   body       19px / 29.45px (1.55) on 76% white at >=1200, full
 *              column width (`sol-1440x900-light-styles.json`); 16px /
 *              24.8px below it (both tablet and phone passes). The
 *              earlier 1.65 line-height was a rounding of §4.5's
 *              16.5px row
 *   columns    565.28px copy + 466.72px card, 64px apart (the
 *              measured split is 565fr/467fr at gap-16)
 *   buttons    36px under the body, 11.5px apart, 52.03px tall at
 *              every width, 15.5px / 24.03px labels
 *   card       white, radius 18px, 24px padding at >=1200 and 18px
 *              below it; its rows are the "card" variant of
 *              ChecklistRows (15px labels at >=1200, 14px below)
 *
 * The desktop composition switches at 1200px, the reference's own
 * desktop band boundary (§9.5), not Tailwind's 1024px `lg`. The
 * 1024–1199px continuation of the below-desktop card is [INFERRED]:
 * the capture never rendered that width.
 *
 * NO ENTRANCE ANIMATION. The reference records no WAAPI animation for
 * this band's copy: the scroll pass reached y 4551 and the band
 * starts at 3995, so its headline, body, buttons and mock card were
 * all covered, and none of them appears in
 * `sol-1440x900-light-motion.json.gz`. The reveal this used to carry
 * is therefore removed rather than re-tuned. The band is static in
 * both directions, and nothing is pre-hidden at first paint.
 *
 * Unlike the hero and the category headlines, the
 * reference animates none of these words — the motion
 * log records no entrance for them — so the words are
 * static here and only the band reveals on scroll.
 *
 * The headline and the CTA copy are the homepage's own
 * approved closing, restated from this page's content
 * module so the module stays self-contained.
 */
export function ClosingCta() {
  return (
    <section className="bg-lm-card">
      <div className="lm-shell pb-16 pt-[60px] min-[1200px]:pb-24 min-[1200px]:pt-30">
        <div className="lm-solutions-stage rounded-[22px] px-5 py-14 shadow-lm-stage min-[1200px]:rounded-lm-stage min-[1200px]:px-18 min-[1200px]:py-24">
          <div className="grid items-center gap-8 min-[1200px]:grid-cols-[565fr_467fr] min-[1200px]:gap-16">
            <div className="min-w-0">
              <h2 className="font-lm-semibold tracking-[-0.035em] text-lm-40 text-lm-cta-ink min-[1200px]:text-lm-65">
                {SOLUTIONS_CLOSING.lines[0]
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word) => (
                    <span key={word}>{word} </span>
                  ))}
                {SOLUTIONS_CLOSING.lines
                  .slice(1)
                  .join(" ")
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word) => (
                    <span
                      key={word}
                      className="lm-text-gradient-soft"
                    >
                      {word}{" "}
                    </span>
                  ))}
              </h2>

              <p className="mt-5 text-lm-16 leading-[1.55] text-lm-cta-muted min-[1200px]:text-lm-19">
                {SOLUTIONS_CLOSING.intro}
              </p>

              {/* MEASURED: stacked full-width at 768 (696px each) and 390
                  (318px each); side by side at natural width from 1200
                  (146.53 + 11.5 + 150.23 at 1440). */}
              <div className="mt-9 flex w-full flex-col items-stretch gap-3 min-[1200px]:w-auto min-[1200px]:flex-row min-[1200px]:items-center">
                <a
                  href={SOLUTIONS_CLOSING.primaryCta.href}
                  className="inline-flex h-13 min-h-11 items-center justify-center gap-2 rounded-lm-button bg-lm-card px-5 text-lm-15-5 font-lm-regular text-lm-cta-button-ink shadow-lm-sm transition-colors hover:bg-lm-surface-accent md:px-6.5"
                >
                  {SOLUTIONS_CLOSING.primaryCta.label}
                  <ArrowRight
                    className="h-4 w-4 text-lm-accent"
                    aria-hidden="true"
                  />
                </a>
                <a
                  href={SOLUTIONS_CLOSING.secondaryCta.href}
                  className="inline-flex h-13 min-h-11 items-center justify-center gap-2 rounded-lm-button border-0 bg-lm-cta-wash px-5 text-lm-15-5 font-lm-regular text-lm-cta-ink transition-colors hover:bg-white/15 md:px-6.5"
                >
                  {SOLUTIONS_CLOSING.secondaryCta.label}
                  <span className="sr-only">(opens your email client)</span>
                </a>
              </div>

              <p className="mt-4 text-lm-14 leading-[1.55] text-lm-cta-faint">
                {SOLUTIONS_CLOSING.note}
              </p>
            </div>

            {/* MEASURED: white, 18px radius, 24px padding; title
                17px/600; the "2 of 4" counter 13px/500; the rail a
                6px-tall radius-6 track in #eeeaf7 with a #6246ea fill. */}
            <div
              aria-hidden="true"
              className="lm-mock-card flex min-w-0 flex-col rounded-lm-mock p-[18px] min-[1200px]:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-lm-17 font-lm-semibold leading-[1.55] text-lm-ink">
                  {SOLUTIONS_CHECKLIST.title}
                </p>
                <span className="text-lm-13 font-lm-medium text-lm-ink-soft">
                  {SOLUTIONS_CHECKLIST.progress}
                </span>
              </div>

              <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-[6px] bg-lm-mock-rail">
                <div className="h-full w-1/2 rounded-[6px] bg-lm-accent" />
              </div>

              <ChecklistRows
                items={SOLUTIONS_CHECKLIST.items}
                variant="card"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
