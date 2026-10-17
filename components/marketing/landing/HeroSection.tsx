import Link from "next/link";
import {
  ArrowRight,
  FileDown,
  FileText,
  Inbox,
  MessageSquare,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import {
  ANNOUNCEMENT,
  CONNECTS_WITH,
  HERO,
} from "@/app/(marketing)/home/content";

import { PrimaryLink, SecondaryLink } from "./Buttons";
import { Reveal } from "./Reveal";
import { WorkspacePreview } from "./WorkspacePreview";

const CONNECTOR_ICONS: Record<string, LucideIcon> = {
  Slack: MessageSquare,
  Notion: FileText,
  "Email inbox": Inbox,
  Webhooks: Webhook,
  "PDF export": FileDown,
};

/**
 * Hero — centered Forma composition + full-width purple-framed dashboard preview:
 * - Pure white center background with stepped lavender/purple framing columns
 *   on the left and right edges (`.lm-hero-grid`).
 * - Small announcement pill (`New` badge + link text) above headline.
 * - Large two-line headline (dark first line, purple emphasized second line).
 * - Centered supporting paragraph, two horizontally aligned CTA buttons,
 *   small reassurance note, and compact "Works with" icon strip.
 * - Large purple-framed desktop dashboard mockup (`WorkspacePreview`) below.
 */
export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-lm-card">
      {/* Stepped vertical framing columns + subtle lilac blooms */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="lm-hero-grid" />
        <div className="lm-bloom-a lm-drift" />
        <div className="lm-bloom-b lm-drift" />
      </div>

      <div className="lm-shell pt-13 pb-16 md:pt-22 md:pb-22 lg:pt-22 lg:pb-30">
        <div className="mx-auto flex max-w-[54rem] flex-col items-center text-center">
          {/* Small announcement badge above headline */}
          <Link
            href={ANNOUNCEMENT.href}
            className="inline-flex min-h-11 items-center gap-2.5 rounded-lm-pill border border-lm-border-soft bg-lm-card px-3.5 py-1.5 text-lm-12 font-lm-semibold text-lm-ink shadow-lm-sm transition-colors hover:border-lm-border-strong hover:bg-lm-surface-accent"
          >
            <span className="rounded-lm-pill bg-lm-surface-accent px-2 py-0.5 text-lm-12 font-lm-bold text-lm-ink-accent">
              {ANNOUNCEMENT.badge}
            </span>
            <span>{HERO.eyebrow}</span>
            <ArrowRight
              className="h-4 w-4 text-lm-ink-accent"
              aria-hidden="true"
            />
          </Link>

          <h1
            aria-label={HERO.title}
            className="mt-6 font-lm-bold tracking-[-0.03em] text-lm-29 text-lm-ink sm:text-lm-54 lg:text-lm-64"
          >
            {HERO.titleLines.map((line, index) => (
              <span
                key={line}
                className="lm-line"
                style={
                  {
                    "--lm-line-delay": `${index * 90}ms`,
                  } as React.CSSProperties
                }
              >
                <span>{renderLineWithAccent(line, HERO.emphasis)}</span>
              </span>
            ))}
          </h1>

          <p className="mt-5.5 max-w-[36rem] text-lm-16 text-lm-ink-soft md:text-lm-18">
            {HERO.intro}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PrimaryLink href={HERO.primaryCta.href}>
              {HERO.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryLink>
            <SecondaryLink href={HERO.secondaryCta.href}>
              {HERO.secondaryCta.label}
            </SecondaryLink>
          </div>

          <p className="mt-3.5 text-lm-12 text-lm-muted">{HERO.note}</p>

          {/* Compact "Works with" icon strip right above the dashboard */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1.5 text-lm-12 font-lm-medium text-lm-muted">
              {CONNECTS_WITH.lead}
            </span>
            <ul className="flex flex-wrap items-center justify-center gap-1.5">
              {CONNECTS_WITH.items.map((item) => {
                const Icon = CONNECTOR_ICONS[item] ?? FileText;
                return (
                  <li
                    key={item}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lm-row border border-lm-border-soft bg-lm-card px-2.5 text-lm-12 font-lm-semibold text-lm-ink shadow-lm-sm"
                  >
                    <Icon
                      className="h-4 w-4 text-lm-ink-soft"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <Reveal delay={180} className="mt-12 md:mt-14">
          <WorkspacePreview />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Splits the line on `accent` if present and wraps only that phrase in the
 * brand accent colour. Matching is literal and case-sensitive, so if the
 * copy changes and the word moves to another line, the highlight follows it.
 */
function renderLineWithAccent(line: string, accent: string): React.ReactNode {
  const at = line.indexOf(accent);
  if (at === -1) return line;
  const before = line.slice(0, at);
  const after = line.slice(at + accent.length);
  return (
    <>
      {before}
      <span className="text-lm-ink-accent">{accent}</span>
      {after}
    </>
  );
}
