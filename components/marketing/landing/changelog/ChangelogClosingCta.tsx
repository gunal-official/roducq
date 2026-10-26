import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  CHANGELOG_CHECKLIST,
  CHANGELOG_CLOSING,
  MOCK_DISCLOSURE,
} from "@/app/(marketing)/changelog/content";
import { ChecklistRows } from "@/components/marketing/landing/solutions/PracticeMocks";

/**
 * /changelog closing CTA — the shared gradient stage and getting-started
 * checklist card measured on the reference (docs/FORMA_CHANGELOG_REFERENCE.md §6).
 *
 * No scroll entrance animation is attached: the reference WAAPI capture
 * recorded zero scroll animations on the Closing CTA across the full page.
 */
export function ChangelogClosingCta() {
  const doneCount = CHANGELOG_CHECKLIST.filter(
    (item) => item.state === "Done",
  ).length;

  return (
    <section aria-label="Get started" className="bg-lm-card">
      <div className="lm-shell pb-16 pt-15 min-[1200px]:pb-24 min-[1200px]:pt-30">
        <div className="lm-solutions-stage rounded-[22px] px-5 py-14 shadow-lm-stage min-[1200px]:rounded-lm-stage min-[1200px]:px-18 min-[1200px]:py-24">
          <div className="grid items-center gap-8 min-[1200px]:grid-cols-[565fr_467fr] min-[1200px]:gap-16">
            <div className="min-w-0">
              <h2 className="font-lm-semibold tracking-[-0.035em] text-lm-40 text-lm-cta-ink min-[1200px]:text-lm-65">
                {CHANGELOG_CLOSING.titleBefore
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word) => (
                    <span key={word}>{word} </span>
                  ))}
                {CHANGELOG_CLOSING.titleAccent
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word) => (
                    <span key={word} className="lm-text-gradient-soft">
                      {word}{" "}
                    </span>
                  ))}
              </h2>

              <p className="mt-5 text-lm-16 leading-[1.55] text-lm-cta-muted min-[1200px]:text-lm-19">
                {CHANGELOG_CLOSING.body}
              </p>

              <div className="mt-9 flex w-full flex-col items-stretch gap-3 min-[1200px]:w-auto min-[1200px]:flex-row min-[1200px]:items-center">
                <Link
                  href={CHANGELOG_CLOSING.primary.href}
                  className="inline-flex h-13 min-h-11 items-center justify-center gap-2 rounded-lm-button bg-lm-card px-5 text-lm-15-5 font-lm-regular text-lm-cta-button-ink shadow-lm-sm transition-colors hover:bg-lm-surface-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-lm-accent md:px-6.5"
                >
                  {CHANGELOG_CLOSING.primary.label}
                  <ArrowRight
                    className="h-4 w-4 text-lm-accent"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href={CHANGELOG_CLOSING.secondary.href}
                  className="inline-flex h-13 min-h-11 items-center justify-center gap-2 rounded-lm-button border-0 bg-lm-cta-wash px-5 text-lm-15-5 font-lm-regular text-lm-cta-ink transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-lm-accent md:px-6.5"
                >
                  {CHANGELOG_CLOSING.secondary.label}
                </Link>
              </div>

              <p className="mt-4 text-lm-14 leading-[1.55] text-lm-cta-faint">
                {CHANGELOG_CLOSING.footnote}
              </p>
            </div>

            <div className="flex min-w-0 flex-col">
              <div
                aria-hidden="true"
                className="lm-mock-card flex min-w-0 flex-col rounded-lm-mock p-4.5 min-[1200px]:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lm-17 font-lm-semibold leading-[1.55] text-lm-ink">
                    {CHANGELOG_CLOSING.cardTitle}
                  </p>
                  <span className="text-lm-13 font-lm-medium text-lm-ink-soft">
                    {doneCount} of {CHANGELOG_CHECKLIST.length}
                  </span>
                </div>

                <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-[6px] bg-lm-mock-rail">
                  <div className="h-full w-1/2 rounded-[6px] bg-lm-accent" />
                </div>

                <ChecklistRows items={CHANGELOG_CHECKLIST} variant="card" />
              </div>

              <p className="lm-stage-disclosure mt-3 border-t border-lm-cta-track pt-2.5 text-lm-chip text-lm-cta-faint">
                {MOCK_DISCLOSURE}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
