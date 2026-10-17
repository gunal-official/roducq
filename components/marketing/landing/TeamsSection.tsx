import { ArrowRight } from "lucide-react";

import { TEAM_CARDS, TEAMS_SECTION } from "@/app/(marketing)/home/content";

import { GhostLink } from "./Buttons";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * Teams — the reference's numbered "every team, differently" band.
 *
 * COMPOSITION: centred heading, then four full-width horizontal cards. Each
 * carries a large index numeral, a small uppercase label, a heading, prose,
 * a capability line and a template line — the reference's exact rhythm.
 *
 * WHY HORIZONTAL ROWS AND NOT A 2×2 GRID. The reference stacks these; the
 * numeral reads as a list, not a gallery. Stacking also keeps four long
 * prose blocks at a readable measure on a 1440px screen instead of
 * stretching them across half a 1200px container each.
 *
 * NO INVENTED CUSTOMERS. These are shapes of practice, not named clients:
 * roducq publishes no testimonials because it holds no customer consent to
 * quote. The cards describe what the product does for a kind of team, which
 * is checkable against the code.
 */
export function TeamsSection() {
  return (
    <section className="bg-lm-canvas">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <SectionHeading
            eyebrow={TEAMS_SECTION.eyebrow}
            before={TEAMS_SECTION.titleBefore}
            after={TEAMS_SECTION.titleAfter}
            intro={TEAMS_SECTION.intro}
          />
        </Reveal>

        <div className="mt-12 flex flex-col gap-2.5 md:mt-16">
          {TEAM_CARDS.map((card, index) => (
            <Reveal
              key={card.index}
              as="article"
              delay={(index % 2) * 80}
              className="group grid gap-4.5 rounded-lm-card border border-lm-border-soft bg-lm-card p-5 shadow-lm-sm transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-lm-border-strong hover:shadow-lm-md md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start md:gap-6.5 md:p-6.5"
            >
              {/* Numeral. Decorative: the card is already in reading order
                  and the list semantics come from the article sequence. */}
              <span
                className="font-lm-bold text-lm-29 leading-none tracking-tight text-lm-border-emphasis transition-colors duration-200 group-hover:text-lm-accent md:text-lm-54"
                aria-hidden="true"
              >
                {card.index}
              </span>

              <div className="min-w-0">
                <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted">
                  {card.label}
                </p>
                <h3 className="mt-2.5 font-lm-bold tracking-[-0.015em] text-lm-18 text-lm-ink md:text-lm-22">
                  {card.title}
                </h3>
                <p className="mt-2.5 max-w-[38rem] text-lm-14 text-lm-ink-soft">
                  {card.copy}
                </p>
              </div>

              <div className="flex flex-col gap-2 md:w-56 md:shrink-0 md:border-l md:border-lm-border-soft md:pl-6.5">
                <p className="text-lm-12 font-lm-semibold text-lm-ink-accent">
                  {card.detail}
                </p>
                <p className="text-lm-12 text-lm-muted">{card.templates}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 text-center md:mt-12">
          <GhostLink href={TEAMS_SECTION.cta.href}>
            {TEAMS_SECTION.cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </GhostLink>
        </Reveal>
      </div>
    </section>
  );
}
