import { ArrowRight } from "lucide-react";

import { CONNECTS_WITH, HERO } from "@/app/(marketing)/home/content";

import { PrimaryLink, SecondaryLink } from "./Buttons";
import { WorkspacePreview } from "./WorkspacePreview";

/**
 * Hero — the reference's composition, in its order:
 *
 *   eyebrow pill → three masked headline lines → measure-limited intro →
 *   primary + secondary action → reassurance note → "works with" strip →
 *   the product frame, full container width.
 *
 * WHY THE HEADLINE IS THREE LINES. The reference animates each line out of
 * a masked slot, which only works if the break points are authored, not
 * wrapped. HERO.titleLines is the layout and HERO.title is the accessible
 * form of the same sentence; the <h1> carries the sentence, the lines are
 * presentation inside it (asserted by tests/components/home.test.ts).
 *
 * BACKGROUND. Two soft lilac blooms behind the copy plus a hairline grid at
 * 3% opacity. Both are transform/opacity only, both stop under
 * prefers-reduced-motion, and neither is painted above the text.
 */
export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-lm-canvas">
      {/* Decorative layer. `pointer-events-none` keeps it out of the hit
          test, and it sits below the content in paint order via -z-10. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="lm-bloom-a lm-drift" />
        <div className="lm-bloom-b lm-drift" />
        <div className="lm-hero-grid" />
      </div>

      <div className="lm-shell pt-13 pb-16 md:pt-22 md:pb-22 lg:pt-30 lg:pb-30">
        <div className="mx-auto flex max-w-lm-measure flex-col items-center text-center">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-lm-pill border border-lm-border-soft bg-lm-surface-accent px-4 py-1 text-lm-12 font-lm-semibold text-lm-ink-accent">
            <span
              className="h-1.5 w-1.5 rounded-lm-dot bg-lm-accent"
              aria-hidden="true"
            />
            {HERO.eyebrow}
          </span>

          <h1 className="mt-6.5 font-lm-bold tracking-[-0.03em] text-lm-ink text-lm-29 sm:text-lm-54 lg:text-lm-64">
            {HERO.titleLines.map((line, index) => (
              <span
                key={line}
                className="lm-line"
                style={
                  { "--lm-line-delay": `${index * 90}ms` } as React.CSSProperties
                }
              >
                <span>
                  <Highlight line={line} emphasis={HERO.emphasis} />
                </span>
              </span>
            ))}
          </h1>

          <p className="mt-6.5 max-w-[34rem] text-lm-16 text-lm-ink-soft md:text-lm-18">
            {HERO.intro}
          </p>

          <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <PrimaryLink href={HERO.primaryCta.href} className="w-full sm:w-auto">
              {HERO.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryLink>
            <SecondaryLink href={HERO.secondaryCta.href} className="w-full sm:w-auto">
              {HERO.secondaryCta.label}
            </SecondaryLink>
          </div>

          <p className="mt-5 text-lm-12 text-lm-muted">{HERO.note}</p>

          <dl className="mt-9 flex flex-wrap items-center justify-center gap-x-6.5 gap-y-3 border-t border-lm-border-soft pt-6.5">
            <dt className="sr-only">{CONNECTS_WITH.lead}</dt>
            <dd className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted-label">
              {CONNECTS_WITH.lead}
            </dd>
            {CONNECTS_WITH.items.map((item) => (
              <dd
                key={item}
                className="text-lm-12 font-lm-semibold text-lm-muted-readable"
              >
                {item}
              </dd>
            ))}
          </dl>
        </div>

        <div className="mt-12 md:mt-16">
          <WorkspacePreview />
        </div>
      </div>
    </section>
  );
}

/**
 * Wraps the emphasised word in accent ink. Returns the line untouched when
 * the emphasis is absent, so a copy edit can never blank a headline line.
 */
function Highlight({ line, emphasis }: { line: string; emphasis: string }) {
  const at = line.indexOf(emphasis);
  if (at === -1) return <>{line}</>;
  return (
    <>
      {line.slice(0, at)}
      <span className="text-lm-ink-accent">{emphasis}</span>
      {line.slice(at + emphasis.length)}
    </>
  );
}


