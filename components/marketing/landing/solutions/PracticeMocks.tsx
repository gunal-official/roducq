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

import { MOCK_DISCLOSURE, MOCKS } from "@/app/(marketing)/solutions/content";

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

/**
 * The hairline-separated row every miniature uses.
 *
 * MEASURED type steps on the reference's own rows: the leading text
 * is 13.5px / 500 and the trailing one 11px / 600 — this was 13px /
 * 500 and 12px / 400. Roducq rows carry two cells where the
 * reference's carry three (id / title / status); the copy is
 * approved, so only the type steps move.
 */
function MockRow({ label, meta }: { label: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="truncate text-lm-mock font-lm-medium text-lm-ink">
        {label}
      </span>
      <span className="shrink-0 text-lm-chip font-lm-bold text-lm-muted-slate">
        {meta}
      </span>
    </div>
  );
}

/** The status pill that heads a miniature. MEASURED 11px / 500. */
function MockPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-lm-pill bg-lm-canvas px-2.5 py-1 text-lm-chip font-lm-medium text-lm-ink-soft">
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
      {/* MEASURED: the miniature's own title is 13.5px / 600, not 13 / 500. */}
      <p className="flex min-w-0 items-center gap-2 truncate text-lm-mock font-lm-semibold text-lm-ink">
        <span className="h-2 w-2 shrink-0 rounded-lm-dot bg-lm-accent" aria-hidden="true" />
        <span className="truncate">{title}</span>
      </p>
      {pill}
    </div>
  );
}

/**
 * The disclosure every miniature ends with. It is real, visible text —
 * not a tooltip and not a source comment — because the mock data is
 * invented and the page has to say so where the data is shown. MEASURED
 * type step: the chip's 11px, on the muted slate that holds 4.9:1
 * against the white card.
 */
function MockCaption() {
  return (
    <p className="mt-3 border-t border-lm-border-soft pt-2.5 text-lm-chip text-lm-muted-slate">
      {MOCK_DISCLOSURE}
    </p>
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

/**
 * Shared checklist renderer — but the two places it renders are NOT
 * the same component on the reference, and collapsing them was a
 * fidelity error. Both were measured at 1440x900:
 *
 *   "card"  the closing CTA's getting-started card
 *           20x20 tiles at radius 6 (rounded squares, not circles),
 *           15px / 23.25px labels, 12px between tile and label,
 *           rows 49.25px tall (13px block padding), the active row
 *           inset 12px on #f3efff at radius 10, 47.25px tall
 *           (12px block padding); the status text is 12px / 18.6px,
 *           weight 400 in rgb(101,95,120), weight 500 on "Next"
 *
 *   "mini"  the weekly miniature inside the sticky stage
 *           25x25 tiles at radius 50% (circles), 13.5px labels
 *
 * The tile fills #6246ea when done in both. Roducq keeps the states
 * ("Done" / "Next" / "Later") it already publishes; only the geometry
 * and type follow the reference.
 */
export function ChecklistRows({
  items,
  variant = "mini",
}: {
  items: readonly { label: string; state: "Done" | "Next" | "Later" }[];
  variant?: "card" | "mini";
}) {
  const card = variant === "card";
  return (
    <ul
      className={cn(
        "flex flex-1 flex-col divide-y divide-lm-border-soft",
        // MEASURED card spacing: 8px under the rail, 14px above it
        // (the rail's own margin lives on the caller).
        card ? "mt-2" : "mt-3",
      )}
    >
      {items.map((item, index) => (
        <li
          key={item.label}
          className={cn(
            "flex items-center justify-between gap-3",
            // MEASURED row boxes (card): 49.25px tall — 13px block
            // padding around the 23.25px line — and 36.25px on the
            // LAST row (13px top, 0 bottom), which is what the
            // reference's 186px list sums to. "Next" is 47.25px with
            // 12px padding and a 4px gap above it. The mini variant
            // keeps its own 10px rhythm.
            // `py-3` and `py-3.25` are both generated utilities, so the
            // class list cannot arbitrate them — Tailwind's order does.
            // Set the padding once per branch instead of overriding it.
            card
              ? item.state === "Next"
                ? "py-3"
                : "py-3.25"
              : "py-2.5",
            card && index === items.length - 1 && "pb-0",
            item.state === "Next" &&
              (card
                ? "mt-1 -mx-3 rounded-[10px] bg-lm-mock-row-active px-3"
                : "-mx-2 my-1 rounded-lm-row bg-lm-surface-accent px-2.5 py-2.5"),
          )}
        >
          <span
            className={cn("flex min-w-0 items-center", card ? "gap-3" : "gap-2.5")}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center border",
                card ? "h-5 w-5 rounded-[6px]" : "h-[25px] w-[25px] rounded-lm-dot",
                item.state === "Done"
                  ? "border-lm-accent bg-lm-accent text-lm-on-accent"
                  : item.state === "Next"
                    ? "border-lm-accent bg-lm-card"
                    : "border-lm-surface-neutral bg-lm-card",
              )}
              aria-hidden="true"
            >
              {item.state === "Done" ? (
                <Check className={card ? "h-4 w-4" : "h-3.5 w-3.5"} />
              ) : null}
            </span>
            <span
              className={cn(
                "truncate",
                // MEASURED: the card's labels are 15px / 23.25px at
                // >=1200 and 14px / 21.7px below it; the mini variant
                // stays at the miniature's 13.5px step.
                card
                  ? "text-lm-14 leading-[1.55] min-[1200px]:text-lm-15"
                  : "text-lm-mock",
                item.state === "Done"
                  ? card
                    ? "text-lm-mock-muted"
                    : "text-lm-ink-soft"
                  : item.state === "Next"
                    ? "font-lm-medium text-lm-ink"
                    : card
                      ? "text-lm-mock-muted"
                      : "text-lm-ink-soft",
              )}
            >
              {item.label}
            </span>
          </span>
          {/* MEASURED (card): 12px / 18.6px, weight 400, rgb(101,95,120);
              "Next" is weight 500 in the accent. */}
          <span
            className={cn(
              "shrink-0",
              card ? "text-lm-12 leading-[1.55]" : "text-lm-10 font-lm-semibold",
              item.state === "Next"
                ? "font-lm-medium text-lm-ink-accent"
                : card
                  ? "font-lm-regular text-lm-mock-muted"
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
    <div className="lm-mock-card flex flex-col rounded-lm-frame p-[27px]">
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
      <MockCaption />
    </div>
  );
}

function MockBrief() {
  const mock = MOCKS.brief;
  return (
    <div className="lm-mock-card flex flex-col rounded-lm-frame p-[27px]">
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
      <MockCaption />
    </div>
  );
}

function MockProposal() {
  const mock = MOCKS.proposal;
  return (
    <div className="lm-mock-card flex flex-col rounded-lm-frame p-[27px]">
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
      <MockCaption />
    </div>
  );
}

function MockWeek() {
  const mock = MOCKS.week;
  return (
    <div className="lm-mock-card flex flex-col rounded-lm-frame p-[27px]">
      <MockHeader title={mock.title} pill={<MockPill>{mock.pill}</MockPill>} />
      <ChecklistRows items={mock.items} />
      <MockCaption />
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
