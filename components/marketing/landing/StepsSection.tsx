import {
  ArrowUpRight,
  FileText,
  Inbox,
  MessageSquare,
  Upload,
  Webhook,
} from "lucide-react";

import {
  ENGAGEMENT_PANEL,
  PIPELINE_OUTPUTS,
  STEPS,
  STEPS_SECTION,
} from "@/app/(marketing)/home/content";
import { RoduMark } from "@/components/app-shell/RoduMark";
import { clsx as cn } from "clsx";

import { GhostLink } from "./Buttons";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

const CONNECTS_TO_ICONS = [
  { label: "Slack", Icon: MessageSquare },
  { label: "Notion", Icon: FileText },
  { label: "Email inbox", Icon: Inbox },
  { label: "Files", Icon: Upload },
  { label: "Webhooks", Icon: Webhook },
] as const;

const SOURCE_ICONS = [MessageSquare, FileText, Inbox, Upload] as const;

const OUTPUT_ICONS = [FileText, FileText, FileText, FileText] as const;

/**
 * Getting started — the reference's three-step band:
 * - Clean white background (`bg-lm-card`).
 * - Left-aligned heading + "Connects to" square icon strip on the right.
 * - Three horizontally aligned numbered steps (`md:grid-cols-3`, `md:divide-x`)
 *   sitting directly above the large purple demonstration panel.
 * - Large purple demonstration panel (`.lm-purple-frame`) wrapping the white
 *   product interface (connected sources → central roducq hub with dashed
 *   connector lines → workspace outputs panel).
 */
export function StepsSection() {
  return (
    <section className="bg-lm-card">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <SectionHeading
            eyebrow={STEPS_SECTION.eyebrow}
            before={STEPS_SECTION.titleBefore}
            after={STEPS_SECTION.titleAfter}
            intro={STEPS_SECTION.intro}
            align="start"
            aside={
              <div>
                <p className="mb-2 text-lm-12 font-lm-semibold text-lm-ink">
                  {STEPS_SECTION.connectsLead}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {CONNECTS_TO_ICONS.map(({ label, Icon }) => (
                    <span
                      key={label}
                      title={label}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lm-row border border-lm-border-soft bg-lm-card text-lm-ink-soft shadow-lm-sm"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            }
          />
        </Reveal>

        {/* Three horizontally aligned steps directly above the purple demo panel */}
        <ol className="mt-12 grid divide-y divide-lm-border-soft rounded-t-lm-frame border-x border-t border-lm-border-soft bg-lm-card md:mt-16 md:grid-cols-3 md:divide-x md:divide-y-0">
          {STEPS.map((step, index) => (
            <Reveal
              key={step.index}
              as="li"
              delay={index * 90}
              className="flex flex-col justify-between bg-lm-card p-6 md:p-7"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-lm-semibold leading-lm-step tracking-[-0.035em] text-lm-18 text-lm-ink lg:text-lm-15 xl:text-lm-22">
                    {step.title}
                  </h3>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lm-pill bg-lm-surface-accent font-lm-bold text-lm-12 text-lm-ink-accent">
                    {step.index}
                  </span>
                </div>
                <p className="mt-2.5 text-lm-16 leading-relaxed text-lm-ink-soft">
                  {step.copy}
                </p>
              </div>
              <ul className="mt-4 flex flex-wrap gap-1.5 pt-2">
                {step.chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-lm-pill border border-lm-border-soft bg-lm-canvas px-2.5 py-0.5 text-lm-12 font-lm-semibold text-lm-ink-soft"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ol>

        {/* Large purple demonstration panel + white product interface */}
        <Reveal
          delay={120}
          className="lm-purple-frame rounded-b-lm-frame p-4 sm:p-7 md:p-10 lg:p-12"
        >
          <div className="rounded-lm-card border border-lm-border-soft bg-lm-card p-5 shadow-lm-lg md:p-9">
            <div className="grid items-center gap-6 lg:grid-cols-[0.9fr_1fr_1.1fr]">
              {/* Left: Client inputs list */}
              <div
                aria-hidden="true"
                className="min-w-0"
              >
                <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted-label">
                  {ENGAGEMENT_PANEL.sourcesTitle}
                </p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {ENGAGEMENT_PANEL.sources.map((source, idx) => {
                    const Icon =
                      SOURCE_ICONS[idx % SOURCE_ICONS.length] ?? FileText;
                    const active = idx === 2;
                    return (
                      <li
                        key={source}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lm-row border bg-lm-card px-3.5 py-2.5 text-lm-12 font-lm-semibold text-lm-ink",
                          active
                            ? "border-lm-border-strong shadow-lm-md"
                            : "border-lm-border-soft shadow-lm-sm"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              active ? "text-lm-accent" : "text-lm-ink-soft"
                            )}
                            aria-hidden="true"
                          />
                          <span>{source}</span>
                        </span>
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-lm-dot",
                            active ? "bg-lm-accent" : "bg-lm-border-soft"
                          )}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Center: Central roducq hub with curved dashed connectors and animated particles */}
              <div
                aria-hidden="true"
                className="relative flex min-w-0 flex-col items-center justify-center py-4"
              >
                {/* SVG Connectors and Particles - all in one SVG for coordinate alignment */}
                <svg
                  viewBox="0 0 280 180"
                  className="pointer-events-none hidden h-40 w-full lg:block"
                >
                  {/* Connector paths with unique IDs for particle motion */}
                  <path
                    id="pipeline-conn-1"
                    className="lm-connector"
                    d="M 4 28 C 72 28, 92 90, 140 90"
                    fill="none"
                    stroke="var(--lm-border-soft)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <path
                    id="pipeline-conn-2"
                    className="lm-connector"
                    d="M 4 70 C 72 70, 92 90, 140 90"
                    fill="none"
                    stroke="var(--lm-border-soft)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <path
                    id="pipeline-conn-3"
                    className="lm-connector"
                    d="M 4 114 C 72 114, 92 90, 140 90"
                    fill="none"
                    stroke="var(--lm-accent)"
                    strokeWidth="1.75"
                    strokeDasharray="4 4"
                  />
                  <path
                    id="pipeline-conn-4"
                    className="lm-connector"
                    d="M 4 152 C 72 152, 92 90, 140 90"
                    fill="none"
                    stroke="var(--lm-border-soft)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <path
                    id="pipeline-conn-5"
                    className="lm-connector"
                    d="M 140 90 L 276 90"
                    fill="none"
                    stroke="var(--lm-border)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />

                  {/* Animated particles as SVG circles following the connector paths */}
                  {/* Particles are hidden by default and shown via CSS when JS is available and visible */}
                  <circle
                    className="lm-particle"
                    r="3"
                    fill="var(--lm-accent)"
                    data-connector="pipeline-conn-1"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      rotate="auto"
                      begin="0s"
                    >
                      <mpath href="#pipeline-conn-1" />
                    </animateMotion>
                  </circle>
                  <circle
                    className="lm-particle"
                    r="3"
                    fill="var(--lm-accent)"
                    data-connector="pipeline-conn-2"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      rotate="auto"
                      begin="0.5s"
                    >
                      <mpath href="#pipeline-conn-2" />
                    </animateMotion>
                  </circle>
                  <circle
                    className="lm-particle"
                    r="3"
                    fill="var(--lm-accent)"
                    data-connector="pipeline-conn-3"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      rotate="auto"
                      begin="1s"
                    >
                      <mpath href="#pipeline-conn-3" />
                    </animateMotion>
                  </circle>
                  <circle
                    className="lm-particle"
                    r="3"
                    fill="var(--lm-accent)"
                    data-connector="pipeline-conn-4"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      rotate="auto"
                      begin="1.5s"
                    >
                      <mpath href="#pipeline-conn-4" />
                    </animateMotion>
                  </circle>
                  <circle
                    className="lm-particle"
                    r="3"
                    fill="var(--lm-accent)"
                    data-connector="pipeline-conn-5"
                  >
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      rotate="auto"
                      begin="2s"
                    >
                      <mpath href="#pipeline-conn-5" />
                    </animateMotion>
                  </circle>
                </svg>
                <div className="flex flex-col items-center lg:absolute">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lm-card bg-lm-accent shadow-lm-md">
                    <RoduMark size={36} />
                  </div>
                  <p className="mt-2 font-lm-bold text-lm-14 text-lm-ink">
                    {ENGAGEMENT_PANEL.hubName}
                  </p>
                  <p className="text-lm-10 text-lm-muted">
                    {ENGAGEMENT_PANEL.hubSubtitle}
                  </p>
                </div>
              </div>

              {/* Right: Workspace outputs panel */}
              <OutputPanel />
            </div>
          </div>
          <p className="mt-2 text-center text-lm-12 text-lm-muted">
            Illustrative example · fictional client workflow
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** Workspace outputs panel - shows the pipeline output items */
function OutputPanel() {
  return (
    <div className="flex min-w-0 flex-col rounded-lm-card border border-lm-border-soft bg-lm-card p-5 shadow-lm-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-lm-12 font-lm-semibold uppercase tracking-[0.16em] text-lm-muted-label">
            WORKSPACE OUTPUTS
          </p>
          <h3 className="mt-1 font-lm-bold tracking-[-0.015em] text-lm-18 text-lm-ink">
            {ENGAGEMENT_PANEL.heading}
          </h3>
        </div>
        <span className="rounded-lm-pill bg-lm-surface-accent px-2.5 py-0.5 text-lm-12 font-lm-semibold text-lm-ink-accent">
          {ENGAGEMENT_PANEL.workspace} · {ENGAGEMENT_PANEL.workspaceMeta}
        </span>
      </div>

      <ol className="mt-4 flex flex-1 flex-col gap-2">
        {PIPELINE_OUTPUTS.map((item, index) => {
          const isAccent = index === 1;
          const isMint = index === PIPELINE_OUTPUTS.length - 1;
          return (
            <li
              key={item.label}
              className="grid grid-cols-[1fr] items-start gap-2.5"
            >
              <div
                className={cn(
                  "rounded-lm-row border-l-2 px-3 py-2",
                  isMint
                    ? "border-lm-success bg-lm-mint"
                    : isAccent
                      ? "border-lm-accent bg-lm-surface-accent"
                      : "border-lm-border bg-lm-canvas"
                )}
              >
                <p
                  className={cn(
                    "text-lm-12 font-lm-semibold",
                    isMint
                      ? "text-lm-success"
                      : isAccent
                        ? "text-lm-ink-accent"
                        : "text-lm-ink"
                  )}
                >
                  {item.label}
                </p>
                <p className="text-lm-12 text-lm-ink-soft">
                  {item.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3.5 border-t border-lm-border-soft pt-2.5">
        <GhostLink
          href={ENGAGEMENT_PANEL.cta.href}
          className="w-full justify-between text-lm-12"
        >
          <span>{ENGAGEMENT_PANEL.cta.label}</span>
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </GhostLink>
      </div>
    </div>
  );
}
