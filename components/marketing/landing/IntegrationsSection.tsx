import Link from "next/link";
import {
  ArrowUpRight,
  FileDown,
  FileText,
  Inbox,
  Link2,
  MessageSquare,
  Search,
  Sparkles,
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

const ICONS: Partial<Record<IconKey, LucideIcon>> = {
  chat: MessageSquare,
  note: FileText,
  mail: Inbox,
  webhook: Webhook,
  pdf: FileDown,
  share: Link2,
  search: Search,
  sparkles: Sparkles,
};

/**
 * Integrations — the reference's 3-column × 2-row integration grid:
 * - Clean white background (`bg-lm-card`).
 * - Left-aligned heading ("Works with the tools you already pay for").
 * - Six cards in 3 columns × 2 rows (`lg:grid-cols-3`), each card having a
 *   bordered square icon tile on the left, compact title + description in the
 *   middle, and a subtle top-right `↗` icon.
 * - Centered bottom text link ("Read how roducq compares ↗").
 */
export function IntegrationsSection() {
  return (
    <section id="integrations" className="scroll-mt-20 bg-lm-card">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <SectionHeading
            eyebrow={INTEGRATIONS_SECTION.eyebrow}
            before={INTEGRATIONS_SECTION.titleBefore}
            after={INTEGRATIONS_SECTION.titleAfter}
            intro={INTEGRATIONS_SECTION.intro}
            align="start"
          />
        </Reveal>

        {/* Three-column × two-row integration grid matching Forma reference */}
        <ul className="mt-12 grid gap-3.5 sm:grid-cols-2 md:mt-16 lg:grid-cols-3">
          {INTEGRATION_CARDS.map((item, index) => {
            const Icon = ICONS[item.icon] ?? FileText;
            return (
              <Reveal key={item.name} as="li" delay={(index % 3) * 70}>
                <Link
                  href="/integrations"
                  className="group relative flex h-full min-h-11 items-start gap-4 rounded-lm-card border border-lm-border-soft bg-lm-card p-6.25 transition-[border-color,box-shadow] duration-200 hover:border-lm-border-strong hover:shadow-lm-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-accent"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lm-row border border-lm-border-soft bg-lm-canvas text-lm-ink-accent">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 pr-5">
                    <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.12em] text-lm-muted">
                      {item.kind}
                    </p>
                    <h3 className="mt-1 font-lm-semibold tracking-[-0.02em] text-lm-14 text-lm-ink lg:text-lm-13 xl:text-lm-17">
                      {item.name}
                    </h3>
                    <p className="mt-1.5 text-lm-15 leading-relaxed text-lm-ink-soft">
                      {item.copy}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-lm-muted transition-colors group-hover:text-lm-ink-accent"
                    aria-hidden="true"
                  />
                </Link>
              </Reveal>
            );
          })}
        </ul>

        <Reveal className="mt-10 text-center md:mt-12">
          <GhostLink
            href={INTEGRATIONS_SECTION.cta.href}
            className="border-b border-lm-border-soft pb-1"
          >
            {INTEGRATIONS_SECTION.cta.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </GhostLink>
        </Reveal>
      </div>
    </section>
  );
}
