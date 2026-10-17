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
/**
 * The hero's entrance ladder, measured on the live reference: each step is
 * a 900ms fade-up on cubic-bezier(0.2, 0.7, 0.2, 1) except the dashboard,
 * which takes 1300ms. Keyed by element so the order reads like the page.
 */
const HERO_LADDER = {
  announcement: 0,
  headline: 80,
  lead: 550,
  actions: 650,
  note: 720,
  connects: 800,
  dashboard: 850,
} as const;

/** The second headline line starts four words in: 4 × the 50ms word cadence. */
const SECOND_LINE_OFFSET_MS = 200;

function ladder(delay: number, duration?: number): React.CSSProperties {
  return {
    "--lm-hero-delay": `${delay}ms`,
    ...(duration ? { "--lm-hero-duration": `${duration}ms` } : {}),
  } as React.CSSProperties;
}

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
            style={ladder(HERO_LADDER.announcement)}
            className="lm-hero-in inline-flex min-h-11 items-center gap-2.5 rounded-lm-pill border border-lm-border-soft bg-lm-card px-3.5 py-1.5 text-lm-14 font-lm-regular text-lm-ink shadow-lm-sm transition-colors hover:border-lm-border-strong hover:bg-lm-surface-accent"
          >
            <span className="rounded-lm-pill bg-lm-surface-accent px-2 py-0.5 text-lm-12 font-lm-semibold text-lm-ink-accent">
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
            className="mt-6 font-lm-regular tracking-[-0.03em] text-lm-43 text-lm-ink lg:text-lm-48 xl:text-lm-72"
          >
            {HERO.titleLines.map((line, index) => (
              <span
                key={line}
                className="lm-line"
                style={
                  {
                    "--lm-line-delay": `${HERO_LADDER.headline + index * SECOND_LINE_OFFSET_MS}ms`,
                  } as React.CSSProperties
                }
              >
                <span>{renderLineWithAccent(line, HERO.emphasis)}</span>
              </span>
            ))}
          </h1>

          <p
            style={ladder(HERO_LADDER.lead)}
            className="lm-hero-in mt-5.5 max-w-lm-measure-lead text-lm-16 text-lm-ink-soft md:text-lm-18">
            {HERO.intro}
          </p>

          <div
            style={ladder(HERO_LADDER.actions)}
            className="lm-hero-in mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <PrimaryLink href={HERO.primaryCta.href}>
              {HERO.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryLink>
            <SecondaryLink href={HERO.secondaryCta.href}>
              {HERO.secondaryCta.label}
            </SecondaryLink>
          </div>

          <p
            style={ladder(HERO_LADDER.note)}
            className="lm-hero-in mt-3.5 text-lm-12 text-lm-muted"
          >
            {HERO.note}
          </p>

          {/* Compact "Works with" icon strip right above the dashboard */}
          <div
            style={ladder(HERO_LADDER.connects)}
            className="lm-hero-in mt-8 flex flex-wrap items-center justify-center gap-2"
          >
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

        {/* The dashboard is the last rung: 850ms in, over 1300ms. The chart
            inside it offsets its own draw by the same 850ms so the line is
            still drawing when the frame arrives, instead of finishing
            behind an invisible card. */}
        <div
          style={
            {
              ...ladder(HERO_LADDER.dashboard, 1300),
              "--lm-chart-offset": `${HERO_LADDER.dashboard}ms`,
            } as React.CSSProperties
          }
          className="lm-hero-in mt-12 md:mt-14"
        >
          <WorkspacePreview />
        </div>
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
