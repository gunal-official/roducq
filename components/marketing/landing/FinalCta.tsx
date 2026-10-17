import Link from "next/link";
import { ArrowRight, Check, TriangleAlert } from "lucide-react";

import {
  CLOSING,
  LIMITATION,
  ONBOARDING_CHECKLIST,
} from "@/app/(marketing)/home/content";
import { clsx as cn } from "clsx";

import { Reveal } from "./Reveal";

/**
 * Final CTA + the honest-limits callout.
 *
 * COMPOSITION:
 * - Clean white outer section background (`bg-lm-card`).
 * - Large purple gradient card (`.lm-cta-card`) with rounded corners and
 *   soft purple shadow:
 *   - Left: left-aligned headline (`CLOSING.lines`), supporting text, and
 *     two CTA buttons.
 *   - Right: miniature product onboarding checklist card (`ONBOARDING_CHECKLIST`)
 *     matching the Forma reference ("Getting started · 2 of 4").
 * - Followed by the labelled `role="note"` limitation callout below.
 */
export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-lm-card">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />

      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal className="lm-cta-card rounded-lm-frame p-6.5 sm:p-10 md:p-13">
          <div className="grid items-center gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12">
            {/* Left column: left-aligned headline, supporting text, two CTA buttons */}
            <div className="min-w-0 text-left">
              <h2 className="font-lm-bold tracking-[-0.03em] text-lm-cta-ink text-lm-29 sm:text-lm-54 lg:text-lm-64">
                {CLOSING.lines.map((line, index) => (
                  <span
                    key={line}
                    className="lm-line"
                    style={
                      {
                        "--lm-line-delay": `${index * 90}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <span>{line}</span>
                  </span>
                ))}
              </h2>

              <p className="mt-5 max-w-[32rem] text-lm-16 text-lm-cta-muted md:text-lm-18">
                {CLOSING.intro}
              </p>

              <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Link
                  href={CLOSING.primaryCta.href}
                  className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-control bg-lm-card px-5 text-lm-14 font-lm-semibold text-lm-ink shadow-lm-sm transition-colors hover:bg-lm-surface-accent md:h-12 md:px-6.5"
                >
                  {CLOSING.primaryCta.label}
                  <ArrowRight className="h-4 w-4 text-lm-accent" aria-hidden="true" />
                </Link>
                <Link
                  href={CLOSING.secondaryCta.href}
                  className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-control border border-lm-cta-border bg-lm-cta-wash px-5 text-lm-14 font-lm-semibold text-lm-cta-ink transition-colors hover:border-lm-cta-ink md:h-12 md:px-6.5"
                >
                  {CLOSING.secondaryCta.label}
                  <span className="sr-only">(opens your email client)</span>
                </Link>
              </div>

              <p className="mt-4.5 text-lm-12 text-lm-cta-muted">{CLOSING.note}</p>
            </div>

            {/* Right column: miniature product onboarding checklist illustration */}
            <div
              aria-hidden="true"
              className="flex min-w-0 flex-col rounded-lm-card border border-lm-border-hairline bg-lm-card p-5 shadow-lm-lg sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-lm-14 font-lm-bold text-lm-ink">
                  {ONBOARDING_CHECKLIST.title}
                </p>
                <span className="text-lm-12 font-lm-semibold text-lm-ink-soft">
                  {ONBOARDING_CHECKLIST.progress}
                </span>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-lm-pill bg-lm-surface-accent">
                <div className="h-full w-1/2 rounded-lm-pill bg-lm-accent" />
              </div>

              <ul className="mt-3.5 flex flex-1 flex-col divide-y divide-lm-border-soft">
                {ONBOARDING_CHECKLIST.items.map((item) => {
                  const isDone = item.state === "Done";
                  const isNext = item.state === "Next";
                  return (
                    <li
                      key={item.label}
                      className={cn(
                        "flex items-center justify-between gap-3 py-2.5",
                        isNext &&
                          "-mx-2 my-1 rounded-lm-row border-0 bg-lm-surface-accent px-2.5 py-2.5"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-lm-tile border",
                            isDone
                              ? "border-lm-accent bg-lm-accent text-lm-on-accent"
                              : isNext
                                ? "border-lm-accent bg-lm-card"
                                : "border-lm-surface-neutral bg-lm-card"
                          )}
                        >
                          {isDone ? (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "truncate text-lm-12",
                            isDone
                              ? "text-lm-ink-soft"
                              : isNext
                                ? "font-lm-semibold text-lm-ink"
                                : "text-lm-ink-soft"
                          )}
                        >
                          {item.label}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-lm-10 font-lm-semibold",
                          isNext ? "text-lm-ink-accent" : "text-lm-ink-soft"
                        )}
                      >
                        {item.state}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal
          delay={120}
          className="mx-auto mt-10 max-w-[52rem] rounded-lm-card border border-lm-border-soft bg-lm-card p-5 shadow-lm-sm md:mt-12 md:p-6.5"
        >
          <div
            data-testid="home-limitation"
            role="note"
            aria-label={LIMITATION.title}
            className="flex items-start gap-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lm-row bg-lm-surface-muted text-lm-muted-readable">
              <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-lm-bold text-lm-16 tracking-[-0.01em] text-lm-ink">
                {LIMITATION.title}
              </p>
              <p className="mt-1 font-lm-semibold text-lm-14 text-lm-ink-accent">
                {LIMITATION.summary}
              </p>
              <p className="mt-2.5 max-w-[44rem] text-lm-14 leading-relaxed text-lm-muted-readable">
                {LIMITATION.detail}
              </p>
              <Link
                href={LIMITATION.href}
                className="mt-3.5 inline-flex min-h-11 items-center gap-1.5 text-lm-14 font-lm-semibold text-lm-ink-accent underline underline-offset-4 transition-colors hover:text-lm-accent-strong"
              >
                {LIMITATION.hrefLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
