import { ArrowRight, Zap } from "lucide-react";

import {
  AUTOMATION_PANEL,
  FEATURE_BLOCKS,
  FEATURES_SECTION,
} from "@/app/(marketing)/home/content";

import { GhostLink } from "./Buttons";
import { CardLabel, SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { FEATURE_VISUALS } from "./FeatureVisual";

/**
 * Features — the reference's "four jobs" band.
 *
 * COMPOSITION, IN ITS ORDER: eyebrow + split headline + intro on the left,
 * the rule panel on the right, then four alternating rows (visual | prose,
 * prose | visual) and one closing text link.
 *
 * WHY ALTERNATING ROWS AND NOT A CARD GRID. The reference gives each job a
 * full-width pair so the visual can breathe; a 2×2 grid would halve the
 * visual and turn four considered illustrations into four thumbnails. The
 * rows flip at the tablet band with `lg:order-*`, so the DOM order (and
 * therefore the reading order) never changes.
 */
export function FeaturesSection() {
  return (
    <section className="bg-lm-canvas-alt">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <Reveal>
            <SectionHeading
              eyebrow={FEATURES_SECTION.eyebrow}
              before={FEATURES_SECTION.titleBefore}
              after={FEATURES_SECTION.titleAfter}
              intro={FEATURES_SECTION.intro}
              align="start"
            />
          </Reveal>
          <Reveal delay={120}>
            <AutomationPanel />
          </Reveal>
        </div>

        <div className="mt-12 flex flex-col gap-12 md:mt-16 lg:mt-22 lg:gap-16">
          {FEATURE_BLOCKS.map((block, index) => {
            const Visual = FEATURE_VISUALS[index];
            const flipped = index % 2 === 1;
            return (
              <Reveal
                key={block.label}
                as="article"
                className="grid items-center gap-6.5 lg:grid-cols-2 lg:gap-12"
              >
                <div className={flipped ? "lg:order-2" : undefined}>
                  <Visual />
                </div>
                <div className={flipped ? "lg:order-1" : undefined}>
                  <CardLabel>{block.label}</CardLabel>
                  <h3 className="mt-3 font-lm-bold tracking-[-0.015em] text-lm-22 text-lm-ink">
                    {block.title}
                  </h3>
                  <p className="mt-3.5 max-w-[32rem] text-lm-14 text-lm-ink-soft md:text-lm-16">
                    {block.copy}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-12 text-center md:mt-16">
          <GhostLink href={FEATURES_SECTION.cta.href}>
            {FEATURES_SECTION.cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </GhostLink>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The rule panel — the reference's automation card, using the transitions
 * roducq really records (lib/events.ts) and the outbound webhooks it really
 * signs (lib/webhook-dispatch.ts).
 */
function AutomationPanel() {
  return (
    <div className="rounded-lm-card border border-lm-border-soft bg-lm-card p-5 shadow-lm-md">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lm-chip bg-lm-surface-accent text-lm-ink-accent">
          <Zap className="h-4 w-4" aria-hidden="true" />
        </span>
        <CardLabel>Webhooks</CardLabel>
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-2 text-lm-14 font-lm-semibold text-lm-ink">
        <span className="rounded-lm-chip bg-lm-canvas-alt px-2 py-1 text-lm-12 text-lm-muted-readable">
          When
        </span>
        {AUTOMATION_PANEL.trigger}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lm-pill bg-lm-accent px-3 py-1 text-lm-12 font-lm-semibold text-lm-on-accent">
          {AUTOMATION_PANEL.action}
        </span>
        {AUTOMATION_PANEL.steps.map((step) => (
          <span
            key={step}
            className="inline-flex items-center gap-1.5 rounded-lm-pill border border-lm-border-soft bg-lm-surface-accent px-3 py-1 text-lm-12 font-lm-semibold text-lm-ink-accent"
          >
            <span className="text-lm-12 text-lm-accent" aria-hidden="true">
              +
            </span>
            {step}
          </span>
        ))}
      </div>

      <p className="mt-4 border-t border-lm-border-soft pt-3.5 text-lm-12 text-lm-muted">
        {AUTOMATION_PANEL.footnote}
      </p>
    </div>
  );
}
