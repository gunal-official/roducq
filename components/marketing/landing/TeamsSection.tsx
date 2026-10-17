import { ArrowUpRight, Check } from "lucide-react";

import {
  TEAM_CARDS,
  TEAMS_SECTION,
  type TeamCard,
} from "@/app/(marketing)/home/content";
import { clsx as cn } from "clsx";

import { GhostLink } from "./Buttons";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * Teams — the reference's four-column layout with vertical dividing lines:
 * - Clean white background (`bg-lm-card`).
 * - Left-aligned heading ("Set up differently for every team").
 * - Four-column bordered container (`lg:grid-cols-4`) with vertical hairlines
 *   (`lg:divide-x`).
 * - Each column has `01 ROLE` header above a thin horizontal divider, heading,
 *   description, miniature interface preview card, and bottom templates line.
 */
export function TeamsSection() {
  return (
    <section className="bg-lm-card">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <SectionHeading
            eyebrow={TEAMS_SECTION.eyebrow}
            before={TEAMS_SECTION.titleBefore}
            after={TEAMS_SECTION.titleAfter}
            intro={TEAMS_SECTION.intro}
            align="start"
          />
        </Reveal>

        <div className="mt-12 grid divide-y divide-lm-border-soft rounded-lm-card border border-lm-border-soft bg-lm-card sm:grid-cols-2 sm:divide-x sm:divide-y-0 md:mt-16 lg:grid-cols-4">
          {TEAM_CARDS.map((team, index) => (
            <Reveal
              key={team.index}
              as="article"
              delay={index * 80}
              className="flex h-full min-w-0 flex-col justify-between p-6"
            >
              <div>
                {/* Top row: 01 + uppercase role label above a thin horizontal divider */}
                <div className="flex items-center gap-2 border-b border-lm-border-soft pb-3.5">
                  <span className="font-lm-bold text-lm-12 text-lm-ink-accent">
                    {team.index}
                  </span>
                  <span className="text-lm-12 font-lm-semibold uppercase tracking-[0.14em] text-lm-muted">
                    {team.label}
                  </span>
                </div>

                <h3 className="mt-5 font-lm-bold tracking-[-0.015em] text-lm-18 text-lm-ink">
                  {team.title}
                </h3>
                <p className="mt-2.5 text-lm-14 leading-relaxed text-lm-ink-soft">
                  {team.copy}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3.5">
                {/* Miniature interface preview */}
                <TeamMiniPreview index={index} team={team} />

                <div className="pt-1">
                  <p className="text-lm-12 font-lm-semibold text-lm-ink-accent">
                    {team.detail}
                  </p>
                  <p className="mt-0.5 text-lm-12 text-lm-muted">
                    {team.templates}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 text-center md:mt-12">
          <GhostLink
            href={TEAMS_SECTION.cta.href}
            className="border-b border-lm-border-soft pb-1"
          >
            {TEAMS_SECTION.cta.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </GhostLink>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Miniature UI preview per team column, built from Roducq's real surfaces
 * (briefs, proposals, plans, updates, time/invoices) to mirror the four
 * miniature previews in the Forma reference.
 */
function TeamMiniPreview({
  index,
  team,
}: {
  index: number;
  team: TeamCard;
}) {
  if (index === 0) {
    return (
      <div
        aria-hidden="true"
        className="rounded-lm-panel border border-lm-border-soft bg-lm-canvas p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-lm-12 font-lm-bold text-lm-ink">
            Release 2.4 scope
          </span>
          <span className="rounded-lm-chip bg-lm-surface-accent px-2 py-0.5 text-lm-10 font-lm-semibold text-lm-ink-accent">
            4 of 6
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-lm-pill bg-lm-surface-muted">
          <div className="h-full w-2/3 rounded-lm-pill bg-lm-accent" />
        </div>
        <div className="mt-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between rounded-lm-chip border border-lm-border-soft bg-lm-card px-2.5 py-1.5 text-lm-10">
            <span className="font-lm-semibold text-lm-ink">API scope brief</span>
            <span className="rounded-lm-chip bg-lm-mint px-1.5 py-0.5 font-lm-semibold text-lm-success">
              Locked
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lm-chip border border-lm-border-soft bg-lm-card px-2.5 py-1.5 text-lm-10">
            <span className="font-lm-semibold text-lm-ink">Proposal v2 plan</span>
            <span className="rounded-lm-chip bg-lm-surface-accent px-1.5 py-0.5 font-lm-semibold text-lm-ink-accent">
              Active
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div
        aria-hidden="true"
        className="rounded-lm-panel border border-lm-border-soft bg-lm-canvas p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-lm-12 font-lm-bold text-lm-ink">
            Homepage v3 brief
          </span>
          <span className="rounded-lm-chip bg-lm-surface-accent px-2 py-0.5 text-lm-10 font-lm-semibold text-lm-ink-accent">
            In review
          </span>
        </div>
        <div className="mt-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between rounded-lm-chip border border-lm-border-soft bg-lm-card px-2.5 py-1.5 text-lm-10">
            <span className="font-lm-semibold text-lm-ink">
              Brand voice source
            </span>
            <span className="text-lm-muted">Attached</span>
          </div>
          <div className="flex items-center justify-between rounded-lm-chip border border-lm-border-soft bg-lm-card px-2.5 py-1.5 text-lm-10">
            <span className="font-lm-semibold text-lm-ink">
              Mobile grid question
            </span>
            <span className="font-lm-semibold text-lm-ink-accent">Resolved</span>
          </div>
        </div>
        <p className="mt-2 text-lm-10 text-lm-muted">
          Edit history · 4 revisions saved
        </p>
      </div>
    );
  }

  if (index === 2) {
    return (
      <div
        aria-hidden="true"
        className="rounded-lm-panel border border-lm-border-soft bg-lm-canvas p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-lm-12 font-lm-bold text-lm-ink">
            Autumn launch
          </span>
          <span className="rounded-lm-chip bg-lm-mint px-2 py-0.5 text-lm-10 font-lm-semibold text-lm-success">
            On track
          </span>
        </div>
        <div className="mt-2.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between rounded-lm-chip border border-lm-border-soft bg-lm-card px-2.5 py-1.5 text-lm-10">
            <span className="font-lm-semibold text-lm-ink">
              Weekly update #8
            </span>
            <span className="font-lm-semibold text-lm-ink-accent">Shared ↗</span>
          </div>
          <div className="flex items-center justify-between rounded-lm-chip border border-lm-border-soft bg-lm-card px-2.5 py-1.5 text-lm-10">
            <span className="font-lm-semibold text-lm-ink">
              Client viewer link
            </span>
            <span className="text-lm-muted">Revocable</span>
          </div>
        </div>
        <p className="mt-2 text-lm-10 text-lm-muted">
          Owner · 3 Members · 2 Viewers
        </p>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="rounded-lm-panel border border-lm-border-soft bg-lm-canvas p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-lm-12 font-lm-bold text-lm-ink">
          Month-end handoff
        </span>
        <span className="rounded-lm-chip bg-lm-surface-accent px-2 py-0.5 text-lm-10 font-lm-semibold text-lm-ink-accent">
          3 of 3
        </span>
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {[
          "Log billable hours (31.5h)",
          "Export signed-line PDF",
          "Dispatch status webhook",
        ].map((step) => (
          <li
            key={step}
            className={cn(
              "flex items-center gap-2 rounded-lm-chip border border-lm-border-soft bg-lm-card px-2.5 py-1.5 text-lm-10 text-lm-ink"
            )}
          >
            <Check
              className="h-4 w-4 shrink-0 text-lm-success"
              aria-hidden="true"
            />
            <span className="truncate font-lm-medium">{step}</span>
          </li>
        ))}
      </ul>
      <span className="sr-only">{team.label}</span>
    </div>
  );
}
