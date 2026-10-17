import { ArrowRight, Check, Clock, FileText, Inbox } from "lucide-react";

import { RoduMark } from "@/components/app-shell/RoduMark";
import { cn } from "@/lib/utils";

/**
 * The hero's product frame — the reference's single largest visual, drawn
 * from scratch for roducq.
 *
 * NOT A SCREENSHOT. There is no roducq screenshot to ship: the app is
 * authed and workspace-scoped, so any real capture would publish a real
 * client's engagement. This is an original illustration built from the
 * fields the product actually has (app/(app)/intake, briefs, proposals,
 * plans, updates, time), labelled as illustrative in its accessible name.
 *
 * ONE IMAGE TO ASSISTIVE TECH. Sixty-odd mock nodes are noise to a screen
 * reader user, and none of them is operable, so the whole frame is exposed
 * as a single labelled image and its innards are aria-hidden. A visitor who
 * wants the real thing follows the hero CTA into /signup.
 *
 * RESPONSIVE. The rail drops below the tablet band (it is chrome, not
 * content), the stat row goes 2-up, and the two lower cards stack. The
 * frame itself is fluid — no fixed width, no horizontal scroll at 320px.
 */

/** Sidebar rows, in the app's real navigation order. */
const NAV = [
  { label: "Overview", active: true },
  { label: "Intake", badge: "3" },
  { label: "Briefs" },
  { label: "Proposals" },
  { label: "Plans" },
  { label: "Updates" },
  { label: "Invoices" },
  { label: "Time" },
];

/** Seven-day bars for the chart card, tallest mid-week. */
const CHART = [
  { day: "Mon", value: 46 },
  { day: "Tue", value: 62 },
  { day: "Wed", value: 88 },
  { day: "Thu", value: 70 },
  { day: "Fri", value: 100 },
  { day: "Sat", value: 22 },
  { day: "Sun", value: 14 },
];

const STATS = [
  { label: "Briefs drafted", value: "24", note: "this month" },
  { label: "Proposals sent", value: "08", note: "this quarter" },
  { label: "Plan tasks done", value: "12", note: "all on track" },
  { label: "Time logged", value: "6.4h", note: "this week" },
];

const DUE_TODAY = [
  { title: "Review Acme brief", project: "Acme launch", tag: "Brief" },
  { title: "Send proposal v3", project: "Acme launch", tag: "Proposal" },
  { title: "Draft weekly update", project: "Northwind retainer", tag: "Update" },
];

export function WorkspacePreview() {
  return (
    <div className="relative">
      {/* The frame's lift. Kept outside the card so the card's own border
          stays a crisp 1px hairline instead of blurring into its shadow. */}
      <div
        className="pointer-events-none absolute -inset-x-6.5 -bottom-10 top-16 -z-10 rounded-lm-frame bg-lm-glow blur-3xl"
        aria-hidden="true"
      />

      <div
        role="img"
        aria-label="Illustrative roducq workspace for a studio called Acme Studio: a sidebar of intake, briefs, proposals, plans, updates, invoices and time; counts of briefs drafted, proposals sent, plan tasks done and hours logged; a seven-day bar chart; and a list of today's work. Example data, not a live account."
        className="overflow-hidden rounded-lm-frame border border-lm-border-hairline bg-lm-card shadow-lm-frame"
      >
        {/* ── Window chrome ───────────────────────────────────────────── */}
        <div
          aria-hidden="true"
          className="flex h-11 items-center gap-3 border-b border-lm-border-soft bg-lm-canvas-alt px-4 md:px-5.5"
        >
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-lm-dot bg-lm-surface-neutral" />
            <span className="h-2.5 w-2.5 rounded-lm-dot bg-lm-border" />
            <span className="h-2.5 w-2.5 rounded-lm-dot bg-lm-dot-success" />
          </span>
          <span className="hidden text-lm-12 font-lm-semibold text-lm-muted-readable sm:inline">
            Acme Studio / Overview
          </span>
          <span className="ml-auto hidden items-center gap-1.5 rounded-lm-pill bg-lm-mint px-3 py-1 text-lm-10 font-lm-semibold uppercase tracking-[0.14em] text-lm-success md:inline-flex">
            <Check className="h-4 w-4" aria-hidden="true" />
            Pipeline on track
          </span>
        </div>

        <div className="grid min-h-[26rem] grid-cols-1 md:grid-cols-[13.5rem_minmax(0,1fr)]">
          {/* ── Rail ──────────────────────────────────────────────────── */}
          <aside
            aria-hidden="true"
            className="hidden flex-col gap-4 border-r border-lm-border-soft bg-lm-canvas p-4 md:flex"
          >
            <div className="flex items-center gap-2">
              <RoduMark size={26} />
              <span className="font-lm-bold text-lm-16 tracking-tight text-lm-ink">
                roducq
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
                    "flex items-center gap-2 rounded-lm-row px-2 py-2 text-lm-12",
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
              <span className="mt-1.5 block text-lm-10 leading-relaxed text-lm-muted-alt">
                Drafted from plan progress.
              </span>
            </div>
          </aside>

          {/* ── Main ──────────────────────────────────────────────────── */}
          <div aria-hidden="true" className="min-w-0 p-4 md:p-5.5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.16em] text-lm-muted-label">
                  Workspace / Overview
                </p>
                <p className="mt-2 text-lm-10 font-lm-semibold uppercase tracking-[0.16em] text-lm-muted">
                  Monday, March 3
                </p>
                <h2 className="mt-1 font-lm-bold tracking-[-0.01em] text-lm-22 text-lm-ink">
                  Good morning, Priya
                </h2>
                <p className="mt-1 text-lm-12 text-lm-muted-readable">
                  3 briefs in review and 1 proposal to send.
                </p>
              </div>
              <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lm-control bg-lm-accent px-3.5 text-lm-12 font-lm-semibold text-lm-on-accent">
                New brief
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>

            {/* Stat row: 2-up on phones, 4-up from the tablet band. */}
            <dl className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lm-row border border-lm-border-soft bg-lm-canvas p-3"
                >
                  <dt className="text-lm-10 font-lm-semibold uppercase tracking-[0.14em] text-lm-muted-label">
                    {stat.label}
                  </dt>
                  <dd className="mt-1.5 font-lm-bold text-lm-22 tracking-tight text-lm-ink">
                    {stat.value}
                  </dd>
                  <dd className="mt-0.5 text-lm-10 text-lm-muted">{stat.note}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-2.5 grid gap-2.5 lg:grid-cols-[1.35fr_1fr]">
              {/* Chart card */}
              <div className="rounded-lm-row border border-lm-border-soft bg-lm-canvas p-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-lm-12 font-lm-semibold text-lm-ink">
                    <FileText className="h-4 w-4 text-lm-accent" aria-hidden="true" />
                    Briefs drafted
                  </span>
                  <span className="text-lm-10 text-lm-muted">Last 7 days</span>
                </div>
                <div className="mt-4 flex h-24 items-end gap-1.5 sm:gap-2.5">
                  {CHART.map((bar) => (
                    <span key={bar.day} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="flex h-full w-full items-end">
                        <span
                          className={cn(
                            "w-full rounded-lm-tile",
                            bar.value === 100 ? "bg-lm-accent" : "bg-lm-border-strong"
                          )}
                          style={{ height: `${bar.value}%` }}
                        />
                      </span>
                      <span className="text-lm-10 text-lm-muted-label">{bar.day}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Today's work */}
              <div className="rounded-lm-row border border-lm-border-soft bg-lm-canvas p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-lm-12 font-lm-semibold text-lm-ink">
                    <Inbox className="h-4 w-4 text-lm-accent" aria-hidden="true" />
                    Due today
                  </span>
                  <span className="text-lm-10 text-lm-muted">3</span>
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {DUE_TODAY.map((row) => (
                    <li
                      key={row.title}
                      className="rounded-lm-chip border border-lm-border-soft bg-lm-card px-2.5 py-2"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-lm-12 font-lm-semibold text-lm-ink">
                          {row.title}
                        </span>
                        <span className="shrink-0 rounded-lm-chip bg-lm-surface-accent px-1.5 py-0.5 text-lm-10 font-lm-semibold text-lm-ink-accent">
                          {row.tag}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-lm-10 text-lm-muted">
                        {row.project}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Client touchpoint strip — the frame's closing beat. */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-lm-row border border-lm-border-soft bg-lm-mint px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-lm-12 font-lm-semibold text-lm-ink">
                <Clock className="h-4 w-4 text-lm-success" aria-hidden="true" />
                Client call · Acme
              </span>
              <span className="text-lm-10 text-lm-muted-readable">11:00 AM – 11:30 AM</span>
              <span className="flex items-center -space-x-1.5">
                {["PR", "AL", "JK"].map((initials) => (
                  <span
                    key={initials}
                    className="flex h-6 w-6 items-center justify-center rounded-lm-dot border border-lm-card bg-lm-surface-accent text-lm-10 font-lm-bold text-lm-ink-accent"
                  >
                    {initials}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
