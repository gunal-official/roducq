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
 * MEASURED on the reference: a 64.8px Manrope headline
 * set one word per span (the first three words in white,
 * the rest in a pale lavender sweep), a 16.5px body, the
 * two-button row, the fine print, and a white 18px-radius
 * checklist card with a 2-of-4 progress bar.
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
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <div className="lm-solutions-stage rounded-lm-stage p-6.5 sm:p-10 md:p-13">
            <div className="grid items-center gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12">
              <div className="min-w-0">
                <h2 className="font-lm-semibold tracking-[-0.035em] text-lm-44 text-lm-cta-ink lg:text-lm-67">
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

                <p className="mt-5 max-w-[32rem] text-lm-16 leading-[1.65] text-lm-cta-muted">
                  {SOLUTIONS_CLOSING.intro}
                </p>

                <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <a
                    href={SOLUTIONS_CLOSING.primaryCta.href}
                    className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-button bg-lm-card px-5 text-lm-15 font-lm-regular text-lm-ink shadow-lm-sm transition-colors hover:bg-lm-surface-accent md:h-13 md:px-6.5"
                  >
                    {SOLUTIONS_CLOSING.primaryCta.label}
                    <ArrowRight
                      className="h-4 w-4 text-lm-accent"
                      aria-hidden="true"
                    />
                  </a>
                  <a
                    href={SOLUTIONS_CLOSING.secondaryCta.href}
                    className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-button border border-lm-cta-border bg-lm-cta-wash px-5 text-lm-15 font-lm-regular text-lm-cta-ink transition-colors hover:border-lm-cta-ink md:h-13 md:px-6.5"
                  >
                    {SOLUTIONS_CLOSING.secondaryCta.label}
                    <span className="sr-only">(opens your email client)</span>
                  </a>
                </div>

                <p className="mt-4.5 text-lm-14 text-lm-cta-faint">
                  {SOLUTIONS_CLOSING.note}
                </p>
              </div>

              <div
                aria-hidden="true"
                className="lm-mock-card flex min-w-0 flex-col rounded-lm-mock p-5 sm:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lm-14 font-lm-bold text-lm-ink">
                    {SOLUTIONS_CHECKLIST.title}
                  </p>
                  <span className="text-lm-12 font-lm-semibold text-lm-ink-soft">
                    {SOLUTIONS_CHECKLIST.progress}
                  </span>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-lm-pill bg-lm-surface-accent">
                  <div className="h-full w-1/2 rounded-lm-pill bg-lm-accent" />
                </div>

                <ChecklistRows items={SOLUTIONS_CHECKLIST.items} />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
