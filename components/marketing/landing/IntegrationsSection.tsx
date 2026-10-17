import {
  ArrowRight,
  FileText,
  Globe,
  Link2,
  Mail,
  MessageSquare,
  Notebook,
  Search,
  ShieldCheck,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import {
  INTEGRATION_CARDS,
  INTEGRATIONS_SECTION,
  type IconKey,
} from "@/app/(marketing)/home/content";

import { GhostLink } from "./Buttons";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * Integrations — the reference's connector grid.
 *
 * FOUR ACROSS AT DESKTOP, two at tablet, one on a phone; every card the
 * same height, one icon, one name, one line. The reference's grid is flat
 * and quiet, so the only affordance here is a border that warms on hover —
 * no lift, no shadow, because eight cards that all jump is eight cards too
 * many.
 *
 * EVERY CARD IS REAL. Three are inbound OAuth/mailbox connectors, one is
 * the signed outbound webhook dispatcher, and the rest are outputs and
 * workspace capabilities that ship today. There is no "coming soon" tile
 * and no logo borrowed from the vendor it names.
 */
const ICONS: Record<
  Extract<IconKey, "chat" | "note" | "mail" | "webhook" | "pdf" | "share" | "search" | "shield">,
  LucideIcon
> = {
  chat: MessageSquare,
  note: Notebook,
  mail: Mail,
  webhook: Webhook,
  pdf: FileText,
  share: Link2,
  search: Search,
  shield: ShieldCheck,
};

export function IntegrationsSection() {
  return (
    <section className="bg-lm-canvas-alt">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <SectionHeading
            eyebrow={INTEGRATIONS_SECTION.eyebrow}
            before={INTEGRATIONS_SECTION.titleBefore}
            after={INTEGRATIONS_SECTION.titleAfter}
            intro={INTEGRATIONS_SECTION.intro}
          />
        </Reveal>

        <ul className="mt-12 grid gap-2.5 sm:grid-cols-2 md:mt-16 lg:grid-cols-4">
          {INTEGRATION_CARDS.map((card, index) => {
            const Icon = ICONS[card.icon as keyof typeof ICONS] ?? Globe;
            return (
              <Reveal
                key={card.name}
                as="li"
                delay={(index % 4) * 70}
                className="flex h-full flex-col rounded-lm-card border border-lm-border-soft bg-lm-card p-4.5 transition-[border-color,background-color] duration-200 hover:border-lm-border-strong hover:bg-lm-card"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lm-chip bg-lm-surface-accent text-lm-ink-accent">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3.5 font-lm-bold text-lm-16 tracking-[-0.01em] text-lm-ink">
                  {card.name}
                </h3>
                <p className="mt-1.5 text-lm-12 leading-relaxed text-lm-muted-readable">
                  {card.copy}
                </p>
              </Reveal>
            );
          })}
        </ul>

        <Reveal className="mt-10 text-center md:mt-12">
          <GhostLink href={INTEGRATIONS_SECTION.cta.href}>
            {INTEGRATIONS_SECTION.cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </GhostLink>
        </Reveal>
      </div>
    </section>
  );
}
