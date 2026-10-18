"use client";

/**
 * Client module because one miniature (the agency
 * proposal) carries the measured status-pill swap, a
 * timer-driven crossfade. Everything else here is
 * presentational and renders identically on the server
 * — the no-JS fallback keeps every miniature visible.
 */
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

import { MOCKS } from "@/app/(marketing)/solutions/content";

import { clsx as cn } from "clsx";

/**
 * The four miniature product surfaces that sit beside the
 * practice blocks — the /solutions equivalent of the
 * homepage's TeamMiniPreview.
 *
 * FABRICATED SAMPLE DATA. Every client name, engagement
 * and figure here is invented for illustration (see the
 * content module's MOCKS note). Nothing below is a real
 * customer, a real engagement or a measured outcome.
 *
 * Each miniature is drawn from a surface roducq really
 * ships: the client trail, the brief, the proposal and
 * the weekly plan. The reference's own miniatures depict
 * its task manager; that domain is deliberately not
 * reproduced here.
 */

/** The hairline-separated row every miniature uses. */
function MockRow({ label, meta }: { label: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="truncate font-lm-medium text-lm-13 text-lm-ink">
        {label}
      </span>
      <span className="shrink-0 text-lm-12 text-lm-muted-slate">
        {meta}
      </span>
    </div>
  );
}

/** The status pill that heads a miniature. */
function MockPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-lm-pill bg-lm-canvas px-2.5 py-1 text-lm-10 font-lm-semibold text-lm-ink-soft">
      {children}
    </span>
  );
}

function MockHeader({
  title,
  pill,
}: {
  title: string;
  pill: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex min-w-0 items-center gap-2 truncate font-lm-medium text-lm-13 text-lm-ink">
        <span className="h-2 w-2 shrink-0 rounded-lm-dot bg-lm-accent" aria-hidden="true" />
        <span className="truncate">{title}</span>
      </p>
      {pill}
    </div>
  );
}

/**
 * The agency miniature's status pill crossfades between
 * "Sent" and "Accepted" — the reference's mock swaps its
 * own status labels the same way (500ms on
 * cubic-bezier(0.42, 0, 0.58, 1); the swap cadence is
 * INFERRED at 3s because the capture could not measure a
 * timer interval). Under prefers-reduced-motion the pill
 * holds its first state: the swap is decoration, and the
 * transition — not the content — is what respects the
 * preference.
 */
function StatusSwap({ states }: { states: readonly [string, string] }) {
  const reduce = useReducedMotion();
  const [which, setWhich] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(
      () => setWhich((w) => (w + 1) % states.length),
      3000,
    );
    return () => clearInterval(timer);
  }, [reduce, states.length]);

  return (
    <span className="relative inline-flex shrink-0 items-center rounded-lm-pill bg-lm-surface-accent px-2.5 py-1">
      {states.map((state, index) => (
        <span
          key={state}
          aria-hidden="true"
          className={cn(
            "lm-pill-swap absolute inset-0 flex items-center justify-center rounded-lm-pill text-lm-10 font-lm-semibold text-lm-ink-accent",
            index === which ? "opacity-100" : "opacity-0",
          )}
        >
          {state}
        </span>
      ))}
      <span className="sr-only">{states[which]}</span>
      <span className="invisible text-lm-10 font-lm-semibold text-lm-ink-accent">
        {states[which]}
      </span>
    </span>
  );
}

/** Shared checklist renderer: the getting-started miniature
 *  (closing CTA) and the weekly miniature (consultancies)
 *  are the same component with different content. */
export function ChecklistRows({
  items,
}: {
  items: readonly { label: string; state: "Done" | "Next" | "Later" }[];
}) {
  return (
    <ul className="mt-3 flex flex-1 flex-col divide-y divide-lm-border-soft">
      {items.map((item) => (
        <li
          key={item.label}
          className={cn(
            "flex items-center justify-between gap-3 py-2.5",
            item.state === "Next" &&
              "-mx-2 my-1 rounded-lm-row bg-lm-surface-accent px-2.5 py-2.5",
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-lm-tile border",
                item.state === "Done"
                  ? "border-lm-accent bg-lm-accent text-lm-on-accent"
                  : item.state === "Next"
                    ? "border-lm-accent bg-lm-card"
                    : "border-lm-surface-neutral bg-lm-card",
              )}
              aria-hidden="true"
            >
              {item.state === "Done" ? (
                <Check className="h-4 w-4" />
              ) : null}
            </span>
            <span
              className={cn(
                "truncate text-lm-12",
                item.state === "Done"
                  ? "text-lm-ink-soft"
                  : item.state === "Next"
                    ? "font-lm-semibold text-lm-ink"
                    : "text-lm-ink-soft",
              )}
            >
              {item.label}
            </span>
          </span>
          <span
            className={cn(
              "shrink-0 text-lm-10 font-lm-semibold",
              item.state === "Next"
                ? "text-lm-ink-accent"
                : "text-lm-ink-soft",
            )}
          >
            {item.state}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MockTrail() {
  const mock = MOCKS.trail;
  return (
    <div className="lm-mock-card flex h-full flex-col p-[27px]">
      <MockHeader title={mock.title} pill={<MockPill>{mock.pill}</MockPill>} />
      <div className="mt-3 divide-y divide-lm-border-soft">
        {mock.rows.map((row) => (
          <MockRow key={row.label} label={row.label} meta={row.meta} />
        ))}
      </div>
      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between">
          <p className="text-lm-12 text-lm-muted-slate">
            {mock.footerLabel}
          </p>
          <p className="text-lm-12 text-lm-muted-slate">
            {mock.footerValue}
          </p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-lm-pill bg-lm-surface-muted">
          <div
            className="h-full rounded-lm-pill bg-lm-accent"
            style={{ width: `${mock.progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function MockBrief() {
  const mock = MOCKS.brief;
  return (
    <div className="lm-mock-card flex h-full flex-col p-[27px]">
      <MockHeader title={mock.title} pill={<MockPill>{mock.pill}</MockPill>} />
      <div className="mt-3 divide-y divide-lm-border-soft">
        {mock.rows.map((row) => (
          <MockRow key={row.label} label={row.label} meta={row.meta} />
        ))}
      </div>
      <div className="mt-4 flex items-start gap-2.5 rounded-lm-row border border-lm-border-soft bg-lm-canvas p-2.5">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lm-dot bg-lm-surface-accent text-lm-10 font-lm-bold text-lm-ink-accent"
          aria-hidden="true"
        >
          {mock.comment.initials}
        </span>
        <div className="min-w-0">
          <p className="text-lm-12 text-lm-ink">{mock.comment.text}</p>
          <p className="mt-0.5 text-lm-10 text-lm-muted-slate">
            {mock.comment.state}
          </p>
        </div>
      </div>
    </div>
  );
}

function MockProposal() {
  const mock = MOCKS.proposal;
  return (
    <div className="lm-mock-card flex h-full flex-col p-[27px]">
      <MockHeader
        title={mock.title}
        pill={<StatusSwap states={mock.pillStates} />}
      />
      <div className="mt-3 divide-y divide-lm-border-soft">
        {mock.rows.map((row) => (
          <MockRow key={row.label} label={row.label} meta={row.meta} />
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between pt-5">
        <p className="text-lm-12 text-lm-muted-slate">{mock.footerLabel}</p>
        <p className="flex items-center gap-1.5 text-lm-12 font-lm-semibold text-lm-success">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {mock.footerValue}
        </p>
      </div>
    </div>
  );
}

function MockWeek() {
  const mock = MOCKS.week;
  return (
    <div className="lm-mock-card flex h-full flex-col p-[27px]">
      <MockHeader title={mock.title} pill={<MockPill>{mock.pill}</MockPill>} />
      <ChecklistRows items={mock.items} />
    </div>
  );
}

/** The four miniatures, keyed the way the content module
 *  references them. The showcase renders these both in the
 *  desktop sticky panel (layered, crossfading) and inline
 *  under each practice block on phones. */
export const PRACTICE_MOCKS = {
  trail: MockTrail,
  brief: MockBrief,
  proposal: MockProposal,
  week: MockWeek,
} as const;
