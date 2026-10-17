import {
  AlertCircle,
  Check,
  FileText,
  GitCompareArrows,
  History,
  Inbox,
  MessageSquare,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The four feature visuals — one per FEATURE_BLOCK, each drawn from the
 * fields that surface actually has.
 *
 * ORIGINAL WORK. Every one of these is a hand-authored DOM mock built from
 * roducq's own data model (source bubbles, gap flags, immutable proposal
 * versions, plan-progress updates). Nothing here is a screenshot, a stock
 * illustration, or a reproduction of any third party's artwork; the whole
 * subtree is aria-hidden because the prose beside it already says the same
 * thing in words.
 */

/** Shared card chrome so the four visuals read as one family. */
function Frame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-lm-card border border-lm-border-soft bg-lm-card p-4 shadow-lm-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

function Row({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lm-row border border-lm-border-soft bg-lm-canvas p-2.5",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Skeleton text bars — the mock's stand-in for prose. */
function Bars({ widths }: { widths: string[] }) {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {widths.map((width, index) => (
        <span
          key={`${width}-${index}`}
          className="h-1.5 rounded-lm-hair bg-lm-bar"
          style={{ width }}
        />
      ))}
    </div>
  );
}

/* ── Intake ────────────────────────────────────────────────────────────── */

export function IntakeVisual() {
  return (
    <Frame>
      <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted">
        Source · verbatim
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <Row className="flex items-start gap-2">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-lm-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-lm-12 font-lm-semibold text-lm-ink">
              Kickoff call · notes
            </p>
            <Bars widths={["92%", "76%", "58%"]} />
          </div>
        </Row>
        <div className="flex flex-wrap gap-1.5">
          {["Pasted", "Uploaded brief.pdf", "Slack #acme"].map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-1 rounded-lm-pill border border-lm-border-soft bg-lm-surface-accent px-2.5 py-1 text-lm-10 font-lm-semibold text-lm-ink-accent"
            >
              {chip === "Pasted" ? null : (
                <Upload className="h-4 w-4" aria-hidden="true" />
              )}
              {chip}
            </span>
          ))}
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-lm-10 text-lm-muted">
          <Inbox className="h-4 w-4" aria-hidden="true" />
          Immutable — threaded onto the brief it becomes.
        </p>
      </div>
    </Frame>
  );
}

/* ── Briefs ────────────────────────────────────────────────────────────── */

export function BriefVisual() {
  return (
    <Frame>
      <div className="flex items-center justify-between gap-3">
        <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted">
          Brief draft
        </p>
        <span className="inline-flex items-center gap-1 rounded-lm-pill bg-lm-mint px-2.5 py-0.5 text-lm-10 font-lm-semibold text-lm-success">
          <Check className="h-4 w-4" aria-hidden="true" />2 inferred
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Row>
          <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.14em] text-lm-muted-label">
            Objective
          </p>
          <Bars widths={["84%", "62%"]} />
        </Row>
        <Row className="border-lm-border-strong bg-lm-surface-accent">
          <p className="flex items-center gap-1.5 text-lm-10 font-lm-semibold uppercase tracking-[0.14em] text-lm-ink-accent">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            Open question
          </p>
          <p className="mt-1 text-lm-12 text-lm-ink-soft">
            “Soon” — what date does launch need to hit?
          </p>
        </Row>
        <p className="flex items-center gap-1.5 text-lm-10 text-lm-muted">
          <History className="h-4 w-4" aria-hidden="true" />
          4 field edits in history
        </p>
      </div>
    </Frame>
  );
}

/* ── Proposals ─────────────────────────────────────────────────────────── */

export function ProposalVisual() {
  return (
    <Frame>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Proposal
        </p>
        <span className="text-lm-10 text-lm-muted">Immutable versions</span>
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {[
          { name: "v3", note: "Current · scope + budget", active: true },
          { name: "v2", note: "Timeline added" },
          { name: "v1", note: "First draft" },
        ].map((version) => (
          <li
            key={version.name}
            className={cn(
              "flex items-center gap-2.5 rounded-lm-row border px-2.5 py-2",
              version.active
                ? "border-lm-border-strong bg-lm-surface-accent"
                : "border-lm-border-soft bg-lm-canvas"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-8 shrink-0 items-center justify-center rounded-lm-chip text-lm-10 font-lm-bold",
                version.active
                  ? "bg-lm-accent text-lm-on-accent"
                  : "bg-lm-surface-muted text-lm-muted-readable"
              )}
            >
              {version.name}
            </span>
            <span className="min-w-0 flex-1 truncate text-lm-12 text-lm-ink-soft">
              {version.note}
            </span>
            <GitCompareArrows
              className={cn(
                "h-4 w-4 shrink-0",
                version.active ? "text-lm-ink-accent" : "text-lm-muted-label"
              )}
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-lm-10 text-lm-muted">
        Diff any two, restore either.
      </p>
    </Frame>
  );
}

/* ── Plans & updates ───────────────────────────────────────────────────── */

export function PlanVisual() {
  const tasks = [
    { label: "Discovery workshop", done: true },
    { label: "Wireframes", done: true },
    { label: "Build week 1", done: false },
  ];
  return (
    <Frame>
      <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted">
        Plan progress
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {tasks.map((task) => (
          <li
            key={task.label}
            className="flex items-center gap-2.5 rounded-lm-row border border-lm-border-soft bg-lm-canvas px-2.5 py-2"
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-lm-tile border",
                task.done
                  ? "border-lm-success bg-lm-success text-lm-on-accent"
                  : "border-lm-surface-neutral"
              )}
            >
              {task.done ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
            </span>
            <span
              className={cn(
                "flex-1 truncate text-lm-12",
                task.done ? "text-lm-muted line-through" : "text-lm-ink"
              )}
            >
              {task.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-lm-row border border-lm-border-soft bg-lm-mint p-2.5">
        <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.14em] text-lm-success">
          Weekly update · drafted
        </p>
        <Bars widths={["88%", "70%"]} />
        <p className="mt-1.5 text-lm-10 text-lm-muted-readable">
          Written from plan progress, shareable behind a revocable link.
        </p>
      </div>
    </Frame>
  );
}

/** Index → visual, so the section maps data to a component without
 *  interpolating a component name at runtime. */
export const FEATURE_VISUALS = [
  IntakeVisual,
  BriefVisual,
  ProposalVisual,
  PlanVisual,
] as const;
