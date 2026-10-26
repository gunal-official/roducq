import { ArrowRight } from "lucide-react";

import {
  FEATURES_CHECKLIST,
  FEATURES_CLOSING,
} from "@/app/(marketing)/features/content";
import { ChecklistRows } from "../solutions/PracticeMocks";

/**
 * The /features closing CTA — the reference's second gradient stage
 * with the "first project" checklist card beside the headline.
 *
 * This is the same composition and the same measured geometry the
 * /solutions ClosingCta implements (the capture reads the two pages'
 * closing stages as indistinguishable):
 *
 *   section    120px top / 96px bottom at desktop, 60/64 below
 *   card       radius 28px at desktop (22px below), padding 96/72 at
 *              desktop (56/20 below), the `lm-stage` shadow pair
 *   headline   64.8px / 600 on desktop, 40px on phones, with the soft
 *              lavender gradient (`.lm-text-gradient-soft`) on the
 *              second line
 *   body       19px on 76% white desktop, 16px below
 *   buttons    52.03px tall, radius 10: filled white with the deep
 *              plum label, then the borderless translucent wash
 *   right card white, radius 18, padding 24: title + "2 of 4", the 6px
 *              rail at 50%, then the four checklist rows via the shared
 *              `ChecklistRows variant="card"` — the same component
 *              /solutions uses, so both pages' cards stay identical
 *
 * NO ENTRANCE ANIMATION. The reference's motion capture records no
 * WAAPI animation for this band, so — exactly like /solutions — it is
 * static in both directions and nothing is pre-hidden at first paint.
 *
 * The headline and CTA copy are the homepage's approved closing,
 * restated in this page's content module so the module stays
 * self-contained and the page testable on its own.
 */
export function FeaturesClosingCta() {
  return (
    <section className="bg-lm-card">
      <div className="lm-shell pb-16 pt-[60px] min-[1200px]:pb-24 min-[1200px]:pt-30">
        <div className="lm-solutions-stage rounded-[22px] px-5 py-14 shadow-lm-stage min-[1200px]:rounded-lm-stage min-[1200px]:px-18 min-[1200px]:py-24">
          <div className="grid items-center gap-8 min-[1200px]:grid-cols-[565fr_467fr] min-[1200px]:gap-16">
            <div className="min-w-0">
              <h2 className="font-lm-semibold tracking-[-0.035em] text-lm-40 text-lm-cta-ink min-[1200px]:text-lm-65">
                {FEATURES_CLOSING.lines[0]
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word) => (
                    <span key={word}>{word} </span>
                  ))}
                {FEATURES_CLOSING.lines
                  .slice(1)
                  .join(" ")
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word) => (
                    <span key={word} className="lm-text-gradient-soft">
                      {word}{" "}
                    </span>
                  ))}
              </h2>

              <p className="mt-5 text-lm-16 leading-[1.55] text-lm-cta-muted min-[1200px]:text-lm-19">
                {FEATURES_CLOSING.intro}
              </p>

              <div className="mt-9 flex w-full flex-col items-stretch gap-3 min-[1200px]:w-auto min-[1200px]:flex-row min-[1200px]:items-center">
                <a
                  href={FEATURES_CLOSING.primaryCta.href}
                  className="inline-flex h-13 min-h-11 items-center justify-center gap-2 rounded-lm-button bg-lm-card px-5 text-lm-15-5 font-lm-regular text-lm-cta-button-ink shadow-lm-sm transition-colors hover:bg-lm-surface-accent md:px-6.5"
                >
                  {FEATURES_CLOSING.primaryCta.label}
                  <ArrowRight
                    className="h-4 w-4 text-lm-accent"
                    aria-hidden="true"
                  />
                </a>
                <a
                  href={FEATURES_CLOSING.secondaryCta.href}
                  className="inline-flex h-13 min-h-11 items-center justify-center gap-2 rounded-lm-button border-0 bg-lm-cta-wash px-5 text-lm-15-5 font-lm-regular text-lm-cta-ink transition-colors hover:bg-white/15 md:px-6.5"
                >
                  {FEATURES_CLOSING.secondaryCta.label}
                  <span className="sr-only">(opens your email client)</span>
                </a>
              </div>

              <p className="mt-4 text-lm-14 leading-[1.55] text-lm-cta-faint">
                {FEATURES_CLOSING.note}
              </p>
            </div>

            {/* The measured getting-started card: white, radius 18,
                padding 24, title 17/600, "2 of 4" at 13/500, the 6px
                rail at 50%, then the shared checklist rows. */}
            <div
              aria-hidden="true"
              className="lm-mock-card flex min-w-0 flex-col rounded-lm-mock p-[18px] min-[1200px]:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-lm-17 font-lm-semibold leading-[1.55] text-lm-ink">
                  {FEATURES_CHECKLIST.title}
                </p>
                <span className="text-lm-13 font-lm-medium text-lm-ink-soft">
                  {FEATURES_CHECKLIST.progress}
                </span>
              </div>

              <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-[6px] bg-lm-mock-rail">
                <div className="h-full w-1/2 rounded-[6px] bg-lm-accent" />
              </div>

              <ChecklistRows
                items={FEATURES_CHECKLIST.items}
                variant="card"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
