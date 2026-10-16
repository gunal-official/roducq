/**
 * Phase D artwork — original, token-coloured SVG for the client-work
 * surfaces (Briefs, Proposals, Plans, Updates).
 *
 * Four drawings, one vocabulary: a lavender plane, a white sheet, a single
 * accent rule. Nothing here copies the reference site's assets; every path
 * is drawn for RoduCQ's own workflow.
 *
 * The rule for motion is the Phase B/C rule: **the artwork is complete
 * without any animation**. Each animated element's CSS base state is its
 * final, visible state; keyframes only describe how it arrives. There is no
 * `animation-fill-mode`, so an animation that never runs (reduced motion,
 * a hidden subtree, an ancient engine) costs the movement and nothing else —
 * the drawing stays drawn.
 *
 * Accessibility:
 *   • decorative drawings are `aria-hidden` and carry no text;
 *   • `PlanProgressArt` is the one *meaningful* drawing — it renders real
 *     task counts, so it is `role="img"` with a label read from those counts.
 *     There is no implied automation anywhere: the label states what is
 *     ticked off, and the page copy says a person ticks it off.
 */

import { cn } from "@/lib/utils";

const ART = "work-art";

/** Requests become documents: a source bubble, a connector, a brief sheet. */
export function BriefSourceArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 120"
      aria-hidden="true"
      focusable="false"
      className={cn(ART, "art-brief", className)}
    >
      {/* Source bubble — the client's message as it arrives. */}
      <g className="art-bubble">
        <rect x="14" y="26" width="102" height="68" rx="18" className="art-surface" />
        <path d="M36 48h58M36 64h46M36 80h30" className="art-rule" />
        <path d="M96 94l10 14 6-14z" className="art-tail" />
      </g>

      {/* The connector: one continuous stroke, drawn on arrival. */}
      <path d="M124 60h72" pathLength={1} className="art-connector" />
      <circle cx="152" cy="60" r="8" className="art-node art-node-1" />
      <circle cx="176" cy="60" r="8" className="art-node art-node-2" />

      {/* The brief: a structured sheet, sections filling top to bottom. */}
      <g className="art-sheet">
        <rect x="204" y="14" width="104" height="92" rx="18" className="art-surface" />
        <path d="M222 38h68" className="art-rule art-rule-strong" />
        <path d="M222 58h68" className="art-rule art-rule-1" />
        <path d="M222 76h44" className="art-rule art-rule-2" />
        <circle cx="288" cy="88" r="12" className="art-seal" />
        <path d="M282 88l4.5 5 8-10" className="art-seal-check" />
      </g>
    </svg>
  );
}

/** The proposal document: a sheet, its two standing sections, a budget band. */
export function ProposalDocumentArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 120"
      aria-hidden="true"
      focusable="false"
      className={cn(ART, "art-proposal", className)}
    >
      <rect x="26" y="18" width="88" height="84" rx="16" className="art-surface art-lift" />
      <path d="M44 40h52M44 58h52M44 76h34" className="art-rule" />

      <path d="M118 60h26" pathLength={1} className="art-connector" />

      <g className="art-sheet">
        <rect x="148" y="8" width="146" height="104" rx="18" className="art-surface" />
        {/* letterhead band */}
        <rect x="148" y="8" width="146" height="22" rx="18" className="art-band" />
        <rect x="148" y="24" width="146" height="6" className="art-band-square" />
        <path d="M166 34h44" className="art-rule art-rule-strong" />
        {/* two sections */}
        <path d="M166 58h110" className="art-rule art-rule-1" />
        <path d="M166 74h110" className="art-rule art-rule-2" />
        <path d="M166 90h66" className="art-rule art-rule-3" />
        {/* budget marker */}
        <rect x="252" y="52" width="24" height="8" rx="4" className="art-chip" />
      </g>
    </svg>
  );
}

/**
 * Real task progress along a milestone rail — the one meaningful drawing.
 * One node per task (up to 14 before the rail is condensed), filled when the
 * task is ticked off, hollow when it is not. The label is generated from the
 * same counts, so the drawing cannot drift from the data.
 */
export function PlanProgressArt({
  tasks,
  className,
}: {
  tasks: { id: string; checked: boolean }[];
  className?: string;
}) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.checked).length;
  const visible = tasks.slice(0, 14);
  const condensed = total > visible.length;
  const span = 268;
  const start = 26;
  const step = visible.length > 1 ? span / (visible.length - 1) : 0;
  const fraction = total > 0 ? done / total : 0;

  return (
    <svg
      viewBox="0 0 320 96"
      role="img"
      aria-label={
        total > 0
          ? `Task progress: ${done} of ${total} tasks ticked off`
          : "Task progress: no tasks yet"
      }
      className={cn(ART, "art-plan", className)}
    >
      <line x1={start} y1="52" x2={start + span} y2="52" pathLength={1} className="art-track" />
      <line
        x1={start}
        y1="52"
        x2={start + span * fraction}
        y2="52"
        pathLength={1}
        className="art-track-fill"
      />
      {visible.map((task, i) => (
        <g key={task.id} className="art-milestone">
          <circle
            cx={start + step * i}
            cy="52"
            r="7"
            className={task.checked ? "art-dot art-dot-done" : "art-dot"}
          />
          {task.checked && (
            <path
              d={`M${start + step * i - 3.2} 52l2.4 2.6 4-5.4`}
              className="art-dot-check"
            />
          )}
        </g>
      ))}
      {condensed && (
        <g className="art-condensed">
          <circle cx="306" cy="52" r="2" className="art-dot" />
          <circle cx="312" cy="52" r="2" className="art-dot" />
        </g>
      )}
    </svg>
  );
}

/**
 * The chronological connector: one node per real activity entry, threaded on
 * a single line. Used above the activity list, never as a substitute for it.
 */
export function UpdateTimelineArt({
  entries,
  className,
}: {
  entries: number;
  className?: string;
}) {
  const count = Math.max(0, Math.min(entries, 6));
  const span = 236;
  const start = 42;
  const step = count > 1 ? span / (count - 1) : 0;

  return (
    <svg
      viewBox="0 0 320 64"
      aria-hidden="true"
      focusable="false"
      className={cn(ART, "art-timeline", className)}
    >
      <line x1={start} y1="32" x2={start + span} y2="32" pathLength={1} className="art-track" />
      {Array.from({ length: count }).map((_, i) => (
        <g key={i} className="art-thread" style={{ animationDelay: `${i * 90}ms` }}>
          <circle
            cx={start + step * i}
            cy="32"
            r={i === count - 1 ? 9 : 6}
            className={i === count - 1 ? "art-dot art-dot-latest" : "art-dot art-dot-done"}
          />
        </g>
      ))}
    </svg>
  );
}
