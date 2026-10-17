import { ArrowRight, Check, Clock } from "lucide-react";

import {
  ENGAGEMENT_PANEL,
  ONBOARDING_CHECKLIST,
  STEPS,
  STEPS_SECTION,
} from "@/app/(marketing)/home/content";
import { cn } from "@/lib/utils";

import { PrimaryLink } from "./Buttons";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * Getting started — the reference's three-step band.
 *
 * COMPOSITION: centred heading, three numbered cards in a row, then a
 * full-width pair (the engagement timeline on the left, the onboarding
 * checklist chip on the right) that closes the section the way the
 * reference's "your day" panel closes its own.
 *
 * HONESTY NOTE. The reference puts a calendar timeline here. roducq has no
 * calendar feature, so this panel shows one day of an *engagement* moving
 * through the pipeline — the real sequence of stages — rather than
 * inventing a scheduling product to fill the slot.
 */
export function StepsSection() {
  return (
    <section className="bg-lm-canvas">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <SectionHeading
            eyebrow={STEPS_SECTION.eyebrow}
            before={STEPS_SECTION.titleBefore}
            after={STEPS_SECTION.titleAfter}
            intro={STEPS_SECTION.intro}
          />
        </Reveal>

        <ol className="mt-12 grid gap-3 md:mt-16 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal
              key={step.index}
              as="li"
              delay={index * 90}
              className="group rounded-lm-card border border-lm-border-soft bg-lm-card p-5 shadow-lm-sm transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-lm-border-strong hover:shadow-lm-md"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lm-row bg-lm-surface-accent font-lm-bold text-lm-14 text-lm-ink-accent">
                  {step.index}
                </span>
                <span
                  className="h-0.5 w-8 rounded-lm-hair bg-lm-border-strong transition-all duration-200 group-hover:w-12 group-hover:bg-lm-accent"
                  aria-hidden="true"
                />
              </div>
              <h3 className="mt-4.5 font-lm-bold tracking-[-0.01em] text-lm-18 text-lm-ink">
                {step.title}
              </h3>
              <p className="mt-2.5 text-lm-14 text-lm-ink-soft">{step.copy}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {step.chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-lm-pill border border-lm-border-soft bg-lm-canvas-alt px-2.5 py-1 text-lm-10 font-lm-semibold text-lm-muted"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ol>

        <Reveal
          delay={120}
          className="mt-3 grid gap-3 lg:mt-4.5 lg:grid-cols-[1.5fr_1fr] lg:items-stretch"
        >
          <EngagementPanel />
          <OnboardingChecklist />
        </Reveal>
      </div>
    </section>
  );
}

/** One engagement, one day — the pipeline's real stage sequence. */
function EngagementPanel() {
  return (
    <div className="flex flex-col rounded-lm-card border border-lm-border-soft bg-lm-card p-5 shadow-lm-sm md:p-6.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted-label">
            {ENGAGEMENT_PANEL.date}
          </p>
          <h3 className="mt-2 font-lm-bold tracking-[-0.015em] text-lm-22 text-lm-ink">
            {ENGAGEMENT_PANEL.heading}
          </h3>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-lm-row border border-lm-border-soft bg-lm-canvas-alt px-2.5 py-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lm-chip bg-lm-surface-accent text-lm-10 font-lm-bold text-lm-ink-accent">
            AS
          </span>
          <span className="text-lm-10 leading-tight">
            <span className="block font-lm-semibold text-lm-ink">
              {ENGAGEMENT_PANEL.workspace}
            </span>
            <span className="block text-lm-muted">{ENGAGEMENT_PANEL.plan}</span>
          </span>
        </span>
      </div>

      <ol className="mt-5 flex flex-1 flex-col">
        {ENGAGEMENT_PANEL.events.map((event, index) => (
          <li key={event.time} className="flex gap-3.5">
            {/* The rail: a dot plus the connector to the next event. The last
                item draws no connector, so the line stops at the last dot. */}
            <span className="flex flex-col items-center" aria-hidden="true">
              <span
                className={cn(
                  "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-lm-dot",
                  index === ENGAGEMENT_PANEL.events.length - 1
                    ? "bg-lm-accent"
                    : "bg-lm-border"
                )}
              />
              {index < ENGAGEMENT_PANEL.events.length - 1 ? (
                <span className="w-px flex-1 bg-lm-border-soft" />
              ) : null}
            </span>
            <span className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-1 pb-5">
              <span className="w-11 shrink-0 font-lm-semibold text-lm-12 text-lm-muted">
                {event.time}
              </span>
              <span className="text-lm-14 font-lm-semibold text-lm-ink">
                {event.label}
              </span>
              <span className="text-lm-12 text-lm-muted-readable">{event.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-1 border-t border-lm-border-soft pt-4.5">
        <PrimaryLink href={ENGAGEMENT_PANEL.cta.href} size="sm">
          {ENGAGEMENT_PANEL.cta.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </PrimaryLink>
      </div>
    </div>
  );
}

/** The floating checklist chip the reference anchors over this band. */
function OnboardingChecklist() {
  return (
    <div className="flex flex-col rounded-lm-card border border-lm-border-hairline bg-lm-surface-accent p-5 shadow-lm-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-ink-accent">
          {ONBOARDING_CHECKLIST.title}
        </p>
        <span className="rounded-lm-pill bg-lm-accent px-2.5 py-0.5 text-lm-10 font-lm-bold text-lm-on-accent">
          {ONBOARDING_CHECKLIST.progress}
        </span>
      </div>

      <ul className="mt-4 flex flex-1 flex-col gap-2">
        {ONBOARDING_CHECKLIST.items.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-lm-row border border-lm-border-soft bg-lm-card px-3 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Check
                className={cn(
                  "h-4 w-4 shrink-0",
                  item.state === "Done" ? "text-lm-success" : "text-lm-muted-label"
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "truncate text-lm-12",
                  item.state === "Done"
                    ? "text-lm-muted line-through"
                    : "font-lm-semibold text-lm-ink"
                )}
              >
                {item.label}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-lm-chip px-2 py-0.5 text-lm-10 font-lm-semibold",
                item.state === "Done"
                  ? "bg-lm-mint text-lm-success"
                  : item.state === "Next"
                    ? "bg-lm-surface-accent text-lm-ink-accent"
                    : "bg-lm-surface-muted text-lm-muted-readable"
              )}
            >
              {item.state}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-center gap-1.5 border-t border-lm-border-soft pt-3.5 text-lm-10 text-lm-muted-alt">
        <Clock className="h-4 w-4" aria-hidden="true" />
        The checklist lives in the workspace.
      </p>
    </div>
  );
}
