"use client";

import { useState } from "react";

import {
  CHANGELOG_BADGE_LABELS,
  CHANGELOG_ENTRIES,
  CHANGELOG_FILTERS,
  filterChangelogEntries,
  type ChangelogBadgeKind,
  type ChangelogFilterId,
} from "@/app/(marketing)/changelog/content";
import { cn } from "@/lib/utils";

const BADGE_TONES: Readonly<Record<ChangelogBadgeKind, string>> = {
  new: "bg-lm-surface-accent text-lm-ink-accent",
  improved: "bg-lm-changelog-amber-surface text-lm-changelog-amber-ink",
  fixed: "bg-lm-mint text-lm-changelog-fixed-ink",
};

/**
 * /changelog Updates feed — functional category filter pills + chronological
 * <article> list rebuilt at the reference's measured 980px container,
 * 210px sticky Meta column (>=1200px), and 45px/44px entry rhythm
 * (docs/FORMA_CHANGELOG_REFERENCE.md §§4, 5, 7, 8).
 *
 * No-JS & reduced-motion safety:
 *   - Default state is "all", so SSR HTML emits all 8 verified entries at
 *     opacity 1 with no JS hydration prerequisite.
 *   - Filtering swaps the list synchronously with zero layout/opacity
 *     animation, matching the reference's static Updates section.
 */
export function ChangelogFeed() {
  const [activeFilter, setActiveFilter] = useState<ChangelogFilterId>("all");
  const visibleEntries = filterChangelogEntries(
    CHANGELOG_ENTRIES,
    activeFilter,
  );

  const activeFilterLabel =
    CHANGELOG_FILTERS.find((item) => item.id === activeFilter)?.label ??
    "All updates";

  const announcement =
    activeFilter === "all"
      ? `Showing all ${visibleEntries.length} verified updates.`
      : `Showing ${visibleEntries.length} verified ${
          visibleEntries.length === 1 ? "update" : "updates"
        } tagged ${activeFilterLabel}.`;

  return (
    <section
      id="updates"
      aria-label="Product updates"
      className="px-6 pb-10 pt-0"
    >
      <div className="mx-auto max-w-lm-changelog">
        {/* MEASURED: centered pill group, 6px gap, 999px radius, 14px labels.
            min-h-11 min-w-11 guarantees >=44x44 touch targets across 320–1440px. */}
        <div
          role="group"
          aria-label="Filter updates by category"
          className="flex flex-wrap items-center justify-center gap-1.5"
        >
          {CHANGELOG_FILTERS.map((filter) => {
            const active = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lm-pill border px-4 py-2 text-lm-14 leading-[1.55] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-accent focus-visible:ring-offset-2",
                  active
                    ? "border-lm-ink bg-lm-ink font-lm-semibold text-lm-on-accent"
                    : "border-lm-changelog-rule bg-lm-card font-lm-medium text-lm-muted-slate hover:text-lm-ink",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>

        {/* MEASURED: 28px spacer (mt-7) between filter bar and first entry's
            1px top hairline; each <article> carries 45px top / 44px bottom
            padding, stacking below 1200px and splitting 210px sticky Meta +
            40px gap + flex-1 Body at >=1200px. */}
        <div className="mt-7">
          {visibleEntries.map((entry) => (
            <article
              key={entry.id}
              id={entry.id}
              aria-labelledby={`${entry.id}-heading`}
              className="flex flex-col gap-3 border-t border-lm-changelog-rule pb-11 pt-11.25 min-[1200px]:flex-row min-[1200px]:items-start min-[1200px]:gap-10"
            >
              <div className="flex flex-col items-start min-[1200px]:sticky min-[1200px]:top-27.5 min-[1200px]:w-52.5 min-[1200px]:shrink-0">
                <time
                  dateTime={entry.isoDate}
                  className="text-lm-15 font-lm-semibold text-lm-ink"
                >
                  {entry.date}
                </time>
                <a
                  href={entry.sourceHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  // WCAG 2.5.3 (Label in Name): the accessible name has to
                  // contain the visible label. This read
                  // `Verify <title> (<source> on GitHub)`, and axe-core
                  // flagged all eight entries because the visible "PR #63"
                  // only appeared inside the parentheses — measured, 8 nodes,
                  // impact serious, on /changelog at every scanned width and
                  // theme (docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md §8).
                  // Leading with the visible label fixes it without changing
                  // what a screen reader hears.
                  aria-label={`${entry.sourceLabel} — verify ${entry.title} on GitHub`}
                  className="-my-2.5 inline-flex min-h-11 min-w-11 items-center text-lm-13 font-lm-medium leading-[1.9] text-lm-muted-label underline decoration-lm-changelog-rule underline-offset-4 transition-colors hover:text-lm-ink-accent hover:decoration-lm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-accent focus-visible:ring-offset-2"
                >
                  {entry.sourceLabel}
                </a>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {entry.badges.map((badge) => (
                    <span
                      key={badge}
                      className={cn(
                        "inline-flex items-center rounded-lm-pill px-2.25 py-0.75 text-lm-chip font-lm-semibold uppercase tracking-[0.06em]",
                        BADGE_TONES[badge],
                      )}
                    >
                      {CHANGELOG_BADGE_LABELS[badge]}
                    </span>
                  ))}
                </div>

                <h2
                  id={`${entry.id}-heading`}
                  className="mt-3.5 font-lm-semibold tracking-[-0.03em] text-lm-24 text-lm-ink min-[1200px]:text-lm-28-8"
                >
                  {entry.title}
                </h2>

                <p className="mt-3 text-lm-16-5 leading-[1.7] text-lm-muted-slate">
                  {entry.summary}
                </p>

                {entry.bullets.length > 0 ? (
                  <ul className="flex flex-col gap-2 pb-2 pt-4">
                    {entry.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="relative pl-4.5 text-lm-15-5 leading-[1.6] text-lm-muted-slate"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-1.25 top-2.5 h-1.25 w-1.25 rounded-lm-dot bg-lm-accent"
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
