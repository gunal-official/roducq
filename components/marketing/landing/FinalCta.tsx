import Link from "next/link";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { CLOSING, LIMITATION } from "@/app/(marketing)/home/content";

import { PrimaryLink, SecondaryLink } from "./Buttons";
import { Reveal } from "./Reveal";

/**
 * Final CTA + the honest-limits callout.
 *
 * COMPOSITION. The reference closes on a full-width band with a masked,
 * word-per-line headline, two actions and one reassurance line — this is
 * that, on the deeper lilac wash so it reads as the page's last beat rather
 * than another section.
 *
 * THE LIMITS STAY. The reference has no equivalent, and this is the one
 * place the redesign deliberately departs from it. roducq collects no
 * e-signatures and takes no payments; a landing page that ends on "Start
 * free" without saying so sells something the product is not. The callout
 * is a labelled `role="note"` inside the same band — visually quiet, always
 * present, and test-addressable (tests/components/home.test.ts).
 */
export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-lm-canvas-alt">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="lm-bloom-c lm-drift" />
      </div>

      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal className="mx-auto max-w-lm-measure text-center">
          <h2 className="font-lm-bold tracking-[-0.03em] text-lm-ink text-lm-29 sm:text-lm-54 lg:text-lm-64">
            {CLOSING.lines.map((line, index) => (
              <span
                key={line}
                className="lm-line"
                style={
                  { "--lm-line-delay": `${index * 90}ms` } as React.CSSProperties
                }
              >
                <span>{line}</span>
              </span>
            ))}
          </h2>

          <p className="mt-6 text-lm-16 text-lm-ink-soft md:text-lm-18">
            {CLOSING.intro}
          </p>

          <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <PrimaryLink href={CLOSING.primaryCta.href} className="w-full sm:w-auto">
              {CLOSING.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryLink>
            <SecondaryLink href={CLOSING.secondaryCta.href} className="w-full sm:w-auto">
              {CLOSING.secondaryCta.label}
            </SecondaryLink>
          </div>

          <p className="mt-5 text-lm-12 text-lm-muted">{CLOSING.note}</p>
        </Reveal>

        <Reveal
          delay={120}
          className="mx-auto mt-12 max-w-[52rem] rounded-lm-card border border-lm-border-soft bg-lm-card p-5 shadow-lm-sm md:mt-16 md:p-6.5"
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
