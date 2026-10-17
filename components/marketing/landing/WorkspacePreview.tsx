import {
  ArrowRight,
  Bell,
  Check,
  Clock,
  FileText,
  Inbox,
  Search,
  Settings,
} from "lucide-react";

import { RoduMark } from "@/components/app-shell/RoduMark";
import { clsx as cn } from "clsx";

/**
 * The hero's product frame — matching the Forma reference's dashboard preview:
 * - Purple outer frame (`.lm-purple-frame`)
 * - Rounded corners + white application interface (`bg-lm-card`)
 * - Left navigation sidebar (`Overview`, `Intake`, `Briefs`, `Proposals`,
 *   `Plans`, `Updates`, `Invoices`, `Time`)
 * - Top workspace header + Greeting (`Good morning, Priya`) + 4 metric cards
 * - Smooth purple SVG line chart visualization + right-side activity panel.
 */

const NAV = [
  { label: "Overview", active: true },
  { label: "Intake", badge: "3" },
  { label: "Briefs", badge: "4" },
  { label: "Proposals" },
  { label: "Plans" },
  { label: "Updates" },
  { label: "Invoices" },
  { label: "Time" },
];

const CHART_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATS = [
  { label: "Briefs drafted", value: "24", note: "+18% this month", mint: true },
  { label: "Proposals sent", value: "08", note: "2 in client review", mint: false },
  { label: "Plan tasks done", value: "12", note: "all on track", mint: true },
  { label: "Time logged", value: "6.4h", note: "this week", mint: false },
];

const DUE_TODAY = [
  {
    title: "Review Acme brief",
    project: "Acme launch",
    tag: "Brief",
    done: true,
  },
  {
    title: "Send proposal v3",
    project: "Acme launch",
    tag: "Proposal",
    done: false,
  },
  {
    title: "Resolve 2 open questions",
    project: "Kite rebrand",
    tag: "Brief",
    done: false,
  },
  {
    title: "Draft weekly update",
    project: "Northwind retainer",
    tag: "Update",
    done: true,
  },
];

export function WorkspacePreview() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 -bottom-10 top-16 -z-10 rounded-lm-frame bg-lm-glow blur-3xl"
        aria-hidden="true"
      />

      {/* Purple outer frame matching the Forma dashboard preview */}
      <div
        role="img"
        aria-label="Illustrative roducq workspace for a studio called Acme Studio: a sidebar of intake, briefs, proposals, plans, updates, invoices and time; counts of briefs drafted, proposals sent, plan tasks done and hours logged; a seven-day line chart; and a list of today's work. Example data, not a live account."
        className="lm-purple-frame rounded-lm-frame p-3 sm:p-4 md:p-5"
      >
        <div className="overflow-hidden rounded-lm-card border border-lm-border-hairline bg-lm-card">
          <div className="grid min-h-[29rem] grid-cols-1 md:grid-cols-[13.5rem_minmax(0,1fr)]">
            {/* ── Left navigation sidebar ─────────────────────────────── */}
            <aside
              aria-hidden="true"
              className="hidden flex-col gap-3.5 border-r border-lm-border-soft bg-lm-canvas p-4 md:flex"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RoduMark size={24} />
                  <span className="font-lm-bold text-lm-16 tracking-tight text-lm-ink">
                    roducq
                  </span>
                </div>
                <span className="rounded-lm-chip border border-lm-border-soft bg-lm-card px-1.5 py-0.5 text-lm-10 font-lm-semibold text-lm-muted">
                  v2.4
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lm-row border border-lm-border-soft bg-lm-card px-2.5 py-1.5 text-lm-12 text-lm-muted">
                <span className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-lm-muted" aria-hidden="true" />
                  <span>Search</span>
                </span>
                <span className="rounded-lm-tile bg-lm-canvas-alt px-1.5 py-0.5 text-lm-10 font-lm-semibold text-lm-muted">
                  /
                </span>
              </div>

              <div className="flex items-center gap-2.5 rounded-lm-row border border-lm-border-soft bg-lm-card p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lm-chip bg-lm-surface-accent text-lm-12 font-lm-bold text-lm-ink-accent">
                  AS
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-lm-12 font-lm-semibold text-lm-ink">
                    Acme Studio
                  </span>
                  <span className="block truncate text-lm-10 text-lm-muted">
                    Team plan · 4 members
                  </span>
                </span>
              </div>

              <nav className="flex flex-col gap-0.5">
                <span className="px-2 pb-1 text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted-label">
                  Workspace
                </span>
                {NAV.map((item) => (
                  <span
                    key={item.label}
                    className={cn(
                      "flex items-center gap-2 rounded-lm-row px-2.5 py-1.5 text-lm-12",
                      item.active
                        ? "bg-lm-surface-accent font-lm-semibold text-lm-ink-accent"
                        : "text-lm-muted-readable"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-lm-dot",
                        item.active ? "bg-lm-accent" : "bg-lm-surface-neutral"
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-lm-chip bg-lm-surface-muted px-1.5 py-0.5 text-lm-10 font-lm-semibold text-lm-muted-readable">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                ))}
              </nav>

              <div className="mt-auto rounded-lm-row border border-lm-border-soft bg-lm-surface-accent p-3">
                <span className="flex items-center gap-1.5 text-lm-10 font-lm-semibold uppercase tracking-[0.16em] text-lm-ink-accent">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  Weekly update · Fri 16:00
                </span>
                <span className="mt-1.5 block text-lm-10 leading-relaxed text-lm-ink-soft">
                  Drafted from plan progress.
                </span>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-lm-pill bg-lm-card">
                  <div className="h-full w-3/4 rounded-lm-pill bg-lm-accent" />
                </div>
              </div>
            </aside>

            {/* ── Main application interface ──────────────────────────── */}
            <div aria-hidden="true" className="flex min-w-0 flex-col bg-lm-card">
              {/* Top workspace header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lm-border-soft px-4 py-2.5 md:px-5.5">
                <div className="flex items-center gap-2 text-lm-12 text-lm-muted-readable">
                  <span>Workspaces</span>
                  <span className="text-lm-muted">/</span>
                  <span>Acme Studio</span>
                  <span className="text-lm-muted">/</span>
                  <span className="font-lm-semibold text-lm-ink">Overview</span>
                  <span className="ml-1 hidden items-center gap-1.5 rounded-lm-pill bg-lm-mint px-2.5 py-0.5 text-lm-10 font-lm-semibold uppercase tracking-[0.14em] text-lm-success sm:inline-flex">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Pipeline on track
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden rounded-lm-chip border border-lm-border-soft bg-lm-canvas px-2.5 py-1 text-lm-10 font-lm-semibold text-lm-muted-readable sm:inline-flex">
                    This week
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lm-chip border border-lm-border-soft bg-lm-canvas text-lm-muted-readable">
                    <Bell className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lm-chip border border-lm-border-soft bg-lm-canvas text-lm-muted-readable">
                    <Settings className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lm-pill bg-lm-surface-accent text-lm-10 font-lm-bold text-lm-ink-accent">
                    PK
                  </span>
                </div>
              </div>

              <div className="p-4 md:p-5.5">
                {/* Greeting + New brief CTA */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.16em] text-lm-muted">
                      Monday, March 3
                    </p>
                    {/* Mock-UI greeting, not a page heading: this whole
                        frame is role="img" (presentational to AT), so a
                        real heading element here would leak a fake section
                        into the document outline and search indexes. A
                        paragraph with the same classes renders identically. */}
                    <p className="mt-1 font-lm-bold tracking-[-0.01em] text-lm-22 text-lm-ink">
                      Good morning, Priya
                    </p>
                    <p className="mt-0.5 text-lm-12 text-lm-muted-readable">
                      3 briefs in review and 1 proposal to send.
                    </p>
                  </div>
                  <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lm-control bg-lm-accent px-3.5 text-lm-12 font-lm-semibold text-lm-on-accent shadow-lm-sm">
                    New brief
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>

                {/* 4 Statistics / Metrics cards */}
                <dl className="mt-4.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lm-row border border-lm-border-soft bg-lm-card p-3.5 shadow-lm-sm"
                    >
                      <dt className="text-lm-10 font-lm-semibold uppercase tracking-[0.14em] text-lm-muted-label">
                        {stat.label}
                      </dt>
                      <dd className="mt-1.5 font-lm-bold text-lm-26 tracking-tight text-lm-ink">
                        {stat.value}
                      </dd>
                      <dd className="mt-1.5">
                        <span
                          className={cn(
                            "inline-flex rounded-lm-pill px-2 py-0.5 text-lm-10 font-lm-semibold",
                            stat.mint
                              ? "bg-lm-mint text-lm-success"
                              : "bg-lm-surface-accent text-lm-ink-accent"
                          )}
                        >
                          {stat.note}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* Lower 2-column area: Line chart visualization + Right-side activity panel */}
                <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.2fr_1fr]">
                  {/* Line chart visualization */}
                  <div className="flex min-w-0 flex-col justify-between rounded-lm-panel border border-lm-border-soft bg-lm-card p-4 shadow-lm-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="block text-lm-12 font-lm-semibold text-lm-ink">
                          Deliverables completed
                        </span>
                        <span className="block text-lm-10 text-lm-muted">
                          Briefs, proposals &amp; plan milestones
                        </span>
                      </div>
                      <span className="rounded-lm-pill border border-lm-border-soft bg-lm-card px-2.5 py-0.5 text-lm-10 font-lm-semibold text-lm-muted">
                        Last 7 days
                      </span>
                    </div>

                    <div className="mt-3.5">
                      <svg
                        viewBox="0 0 420 136"
                        className="h-32 w-full overflow-hidden"
                      >
                        <defs>
                          <linearGradient
                            id="lmDashboardLineFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--lm-accent)"
                              stopOpacity="0.26"
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--lm-accent)"
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        <line
                          x1="0"
                          y1="22"
                          x2="420"
                          y2="22"
                          stroke="var(--lm-border-soft)"
                          strokeDasharray="3 3"
                        />
                        <line
                          x1="0"
                          y1="58"
                          x2="420"
                          y2="58"
                          stroke="var(--lm-border-soft)"
                          strokeDasharray="3 3"
                        />
                        <line
                          x1="0"
                          y1="94"
                          x2="420"
                          y2="94"
                          stroke="var(--lm-border-soft)"
                          strokeDasharray="3 3"
                        />
                        <line
                          x1="0"
                          y1="126"
                          x2="420"
                          y2="126"
                          stroke="var(--lm-border-soft)"
                        />
                        <path
                          className="lm-chart-area"
                          d="M 14 102 C 52 96, 72 70, 108 74 C 144 78, 165 44, 205 50 C 245 56, 268 28, 308 34 C 348 40, 374 16, 406 20 L 406 126 L 14 126 Z"
                          fill="url(#lmDashboardLineFill)"
                        />
                        <path
                          className="lm-chart-line"
                          pathLength={1}
                          d="M 14 102 C 52 96, 72 70, 108 74 C 144 78, 165 44, 205 50 C 245 56, 268 28, 308 34 C 348 40, 374 16, 406 20"
                          fill="none"
                          stroke="var(--lm-accent)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <circle
                          className="lm-chart-point"
                          style={{ "--lm-chart-delay": "300ms" } as React.CSSProperties}
                          cx="108"
                          cy="74"
                          r="3.5"
                          fill="var(--lm-card)"
                          stroke="var(--lm-accent)"
                          strokeWidth="2"
                        />
                        <circle
                          className="lm-chart-point"
                          style={{ "--lm-chart-delay": "360ms" } as React.CSSProperties}
                          cx="205"
                          cy="50"
                          r="3.5"
                          fill="var(--lm-card)"
                          stroke="var(--lm-accent)"
                          strokeWidth="2"
                        />
                        <circle
                          className="lm-chart-point"
                          style={{ "--lm-chart-delay": "420ms" } as React.CSSProperties}
                          cx="308"
                          cy="34"
                          r="3.5"
                          fill="var(--lm-card)"
                          stroke="var(--lm-accent)"
                          strokeWidth="2"
                        />
                        <circle
                          className="lm-chart-point"
                          style={{ "--lm-chart-delay": "480ms" } as React.CSSProperties}
                          cx="406"
                          cy="20"
                          r="4.5"
                          fill="var(--lm-accent)"
                          stroke="var(--lm-card)"
                          strokeWidth="2"
                        />
                      </svg>

                      <div className="mt-1.5 grid grid-cols-7 text-center text-lm-10 text-lm-muted">
                        {CHART_DAYS.map((day) => (
                          <span key={day}>{day}</span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-lm-border-soft pt-2.5 text-lm-10 text-lm-muted-readable">
                      <span className="inline-flex items-center gap-1.5">
                        <Inbox
                          className="h-4 w-4 text-lm-accent"
                          aria-hidden="true"
                        />
                        2 new sources in Intake
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FileText
                          className="h-4 w-4 text-lm-accent"
                          aria-hidden="true"
                        />
                        Proposal v3 ready to share
                      </span>
                    </div>
                  </div>

                  {/* Right-side activity / due today panel */}
                  <div className="flex min-w-0 flex-col justify-between gap-2.5">
                    <div className="rounded-lm-panel border border-lm-border-soft bg-lm-card p-4 shadow-lm-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-lm-12 font-lm-semibold text-lm-ink">
                          Due today
                        </span>
                        <span className="rounded-lm-pill bg-lm-surface-accent px-2 py-0.5 text-lm-10 font-lm-semibold text-lm-ink-accent">
                          4 items
                        </span>
                      </div>

                      <ul className="mt-3 flex flex-col gap-2">
                        {DUE_TODAY.map((row) => (
                          <li
                            key={row.title}
                            className="flex items-center gap-2.5 rounded-lm-row border border-lm-border-soft bg-lm-card px-2.5 py-2"
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-lm-tile",
                                row.done
                                  ? "bg-lm-accent text-lm-on-accent"
                                  : "border border-lm-border"
                              )}
                            >
                              {row.done ? (
                                <Check className="h-4 w-4" aria-hidden="true" />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "block truncate text-lm-12 font-lm-semibold",
                                  row.done
                                    ? "text-lm-muted line-through"
                                    : "text-lm-ink"
                                )}
                              >
                                {row.title}
                              </span>
                              <span className="block truncate text-lm-10 text-lm-muted">
                                {row.project}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-lm-chip bg-lm-surface-accent px-2 py-0.5 text-lm-10 font-lm-semibold text-lm-ink-accent">
                              {row.tag}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bottom review callout bar */}
                    <div className="flex items-center justify-between gap-2 rounded-lm-row border border-lm-border-soft bg-lm-mint px-3.5 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-lm-12 font-lm-semibold text-lm-ink">
                          Weekly client review · Acme Studio
                        </p>
                        <p className="truncate text-lm-10 text-lm-muted-readable">
                          16:00 · Written from plan progress
                        </p>
                      </div>
                      <span className="shrink-0 rounded-lm-pill bg-lm-card px-2.5 py-0.5 text-lm-10 font-lm-semibold text-lm-success">
                        Ready
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
