/**
 * Phase 3 page vocabulary — the shared language the redesigned pages
 * (Pipeline, Intake, Inbox, Settings) compose from.
 *
 * Sits beside `doc-detail.tsx` (the Step-34 *document* vocabulary) and
 * reuses the same Ember Studio primitives: 8px controls, 12px surfaces,
 * 16/20px lucide icons at stroke 1.5, `icon-chip` tiles, and the four
 * token tones.
 *
 * Why a second file: doc-detail's pieces are document-shaped (letterhead,
 * timeline, stat tiles). These are page-shaped — a page head with an
 * action row, a section card with a consistent header, an accessible
 * filter row, and an empty state — and they are the contracts the four
 * Phase 3 pages are audited against.
 *
 * Presentational and hook-free (except the filter, which owns client
 * state) so server pages can compose everything directly.
 */

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/* ── Page head ─────────────────────────────────────────────────────────
   Icon chip + display title + optional eyebrow/meta/badges, with the
   action row beside it on tablet+ and on its own full-width row on
   phones (never squeezed next to a long title). */

export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  className,
}: {
  icon: LucideIcon;
  /** Small uppercase label above the title, e.g. the workspace name. */
  eyebrow?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  /** Counts/status rendered beside the title (real data only). */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 tab:flex-row tab:items-start tab:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="icon-chip icon-chip-accent h-10 w-10 shrink-0">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight tab:text-3xl">
              {title}
            </h1>
            {meta}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

/* ── Section card ──────────────────────────────────────────────────────
   One card = one section: tinted icon chip + title + description in a
   hairlined head, optional action slot pinned to the head's end (so every
   card places its primary control in the same place), body, optional
   footer band. Tones mirror StatTile's. */

export type SectionTone = "accent" | "success" | "muted" | "error";

const CHIP_TONE: Record<SectionTone, string> = {
  accent: "icon-chip-accent",
  success: "icon-chip-success",
  muted: "icon-chip-muted",
  error: "icon-chip-error",
};

export function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  actions,
  tone = "muted",
  children,
  footer,
  className,
  bodyClassName,
  labeledBy,
  proof,
  iconClassName,
}: {
  id?: string;
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Rendered at the end of the head — the card's primary control(s). */
  actions?: React.ReactNode;
  tone?: SectionTone;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Id of an external heading labelling this section. */
  labeledBy?: string;
  /** Evidence hook for the responsive audit's SCROLL_PROOF sweep. */
  proof?: string;
  /** Extra classes for the head's icon (e.g. `animate-spin` while loading). */
  iconClassName?: string;
}) {
  return (
    <section
      id={id}
      data-proof={proof}
      aria-labelledby={labeledBy ?? (id ? `${id}-heading` : undefined)}
      className={cn(
        "scroll-mt-6 rounded-surface border border-border bg-card shadow-card",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-3.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn("icon-chip h-8 w-8 shrink-0", CHIP_TONE[tone])}>
            <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id={id ? `${id}-heading` : undefined}
              className="font-display text-base font-bold tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {children != null && (
        <div className={cn("p-5", bodyClassName)}>{children}</div>
      )}
      {footer && (
        <div className="border-t border-border bg-muted/30 px-5 py-3.5">
          {footer}
        </div>
      )}
    </section>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────
   Dashed tile for "nothing here yet" — the one place a dashed border is
   the right signal. Icon at the 24px scale, per docs/icon-audit.md. */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "accent",
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: SectionTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-surface border border-dashed border-border bg-card/60 px-6 py-14 text-center",
        className
      )}
    >
      <span className={cn("icon-chip h-10 w-10 shrink-0", CHIP_TONE[tone])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-display text-base font-semibold tracking-tight">
          {title}
        </p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
