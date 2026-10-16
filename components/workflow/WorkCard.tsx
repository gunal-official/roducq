/**
 * Phase D list vocabulary — the shapes every client-work list page composes
 * from: a lavender showcase band, a work card with a real progress rail, and
 * the toolbar that carries the filter chips and the search field.
 *
 * These are presentational and hook-free, so the server list pages and the
 * client filter components can both compose them.
 *
 * Two rules worth stating:
 *   • every number rendered here is passed in from a real query (counts,
 *     completion fractions); nothing is invented, and nothing implies that
 *     work completes on its own;
 *   • a card is not a link — the title is. Wrapping the whole card would
 *     nest the status control inside an anchor.
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/* ── Showcase band ───────────────────────────────────────────────────── */

export function WorkBand({
  kicker,
  title,
  description,
  art,
  stats,
}: {
  /** Small uppercase label (a section name, not a metric). */
  kicker: string;
  title: string;
  description: React.ReactNode;
  /** Original artwork; the band never depends on it to make sense. */
  art?: React.ReactNode;
  /** Real counts only, rendered as `{ value, label }` pairs. */
  stats?: { value: React.ReactNode; label: string }[];
}) {
  return (
    <section className="work-band" aria-labelledby="work-band-heading">
      <div className="work-band-copy">
        <p className="forma-kicker">{kicker}</p>
        <h2 id="work-band-heading" className="work-band-title">
          {title}
        </h2>
        <p className="work-band-description">{description}</p>
        {stats && stats.length > 0 && (
          <dl className="work-band-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="work-band-stat">
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {art && <div className="work-band-art">{art}</div>}
    </section>
  );
}

/* ── Progress rail ───────────────────────────────────────────────────── */

export function WorkProgress({
  label,
  done,
  total,
}: {
  /** What the fraction counts, e.g. "Tasks". */
  label: string;
  done: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="work-progress">
      <div className="work-progress-head">
        <span className="work-progress-label">{label}</span>
        <span className="work-progress-value">
          {done}/{total} · {pct}%
        </span>
      </div>
      {/* The rail is decoration for the numbers above it; the numbers are
          the accessible content, so the bar carries no role. */}
      <div className="work-progress-rail" aria-hidden="true">
        <span className="work-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Work card ───────────────────────────────────────────────────────── */

export function WorkCard({
  href,
  title,
  client,
  badge,
  icon: Icon,
  meta,
  progress,
  className,
}: {
  href: string;
  title: string;
  client?: string | null;
  /** Status badge (kept out of the heading link). */
  badge?: React.ReactNode;
  icon: LucideIcon;
  /** Footer line: the card's own timestamps. */
  meta?: React.ReactNode;
  /** Real completion fraction, when the record has one. */
  progress?: { label: string; done: number; total: number } | null;
  className?: string;
}) {
  return (
    <article className={cn("work-card", className)}>
      <div className="work-card-head">
        <span className="work-card-icon" aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
        <div className="work-card-identity">
          <Link href={href} className="work-card-title">
            {title}
          </Link>
          {client && <p className="work-card-client">{client}</p>}
        </div>
        {badge && <div className="work-card-badge">{badge}</div>}
      </div>

      {progress && (
        <WorkProgress
          label={progress.label}
          done={progress.done}
          total={progress.total}
        />
      )}

      {meta && <div className="work-card-meta">{meta}</div>}
    </article>
  );
}
