import {
  SOLUTIONS_CHECKLIST,
  SOLUTIONS_CLOSING,
} from "@/app/(marketing)/solutions/content";
import { ArrowRight, Check } from "lucide-react";

import { Reveal } from "../Reveal";
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
 *   headline   64.8px / 600 / -0.035em — NOT the hero's 67.2px, which
 *              this was borrowing
 *   body       19px (this was 16px) on 76% white, full column width
 *   columns    565px copy + 467px card, 64px apart (ratio 1.12/0.88
 *              with a 48px gap was a guess; the measured split is
 *              565fr/467fr at gap-16)
 *   buttons    36px under the body, 11.5px apart, 52px tall
 *   card       white, radius 18px, 24px padding; its rows are the
 *              20px/15px "card" variant of ChecklistRows
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
      <div className="lm-shell pb-16 pt-[60px] lg:pb-24 lg:pt-30">
        <Reveal>
          <div className="lm-solutions-stage rounded-[22px] px-5 py-14 shadow-lm-stage lg:rounded-lm-stage lg:px-18 lg:py-24">
            <div className="grid items-center gap-8 lg:grid-cols-[565fr_467fr] lg:gap-16">
              <div className="min-w-0">
                <h2 className="font-lm-semibold tracking-[-0.035em] text-lm-44 text-lm-cta-ink lg:text-lm-65">
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

                <p className="mt-5 text-lm-19 leading-[1.65] text-lm-cta-muted">
                  {SOLUTIONS_CLOSING.intro}
                </p>

                <div className="mt-9 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <a
                    href={SOLUTIONS_CLOSING.primaryCta.href}
                    className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-button bg-lm-card px-5 text-lm-15 font-lm-regular text-lm-cta-button-ink shadow-lm-sm transition-colors hover:bg-lm-surface-accent md:h-13 md:px-6.5"
                  >
                    {SOLUTIONS_CLOSING.primaryCta.label}
                    <ArrowRight
                      className="h-4 w-4 text-lm-accent"
                      aria-hidden="true"
                    />
                  </a>
                  <a
                    href={SOLUTIONS_CLOSING.secondaryCta.href}
                    className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-button border-0 bg-lm-cta-wash px-5 text-lm-15 font-lm-regular text-lm-cta-ink transition-colors hover:bg-white/15 md:h-13 md:px-6.5"
                  >
                    {SOLUTIONS_CLOSING.secondaryCta.label}
                    <span className="sr-only">(opens your email client)</span>
                  </a>
                </div>

                <p className="mt-4 text-lm-14 text-lm-cta-faint">
                  {SOLUTIONS_CLOSING.note}
                </p>
              </div>

              {/* MEASURED: white, 18px radius, 24px padding; title
                  17px/600; the "2 of 4" counter 13px/500; the rail a
                  6px-tall radius-6 track in #eeeaf7 with a #6246ea fill. */}
              <div
                aria-hidden="true"
                className="lm-mock-card flex min-w-0 flex-col rounded-lm-mock p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lm-17 font-lm-semibold text-lm-ink">
                    {SOLUTIONS_CHECKLIST.title}
                  </p>
                  <span className="text-lm-13 font-lm-medium text-lm-ink-soft">
                    {SOLUTIONS_CHECKLIST.progress}
                  </span>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-[6px] bg-lm-mock-rail">
                  <div className="h-full w-1/2 rounded-[6px] bg-lm-accent" />
                </div>

                <ChecklistRows
                  items={SOLUTIONS_CHECKLIST.items}
                  variant="card"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
