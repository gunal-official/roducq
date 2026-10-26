import { Check, Download, Link2 } from "lucide-react";

import {
  FEATURE_MOCKS,
  MOCK_DISCLOSURE,
  type FeatureMockKey,
} from "@/app/(marketing)/features/content";

import { clsx as cn } from "clsx";

/**
 * The six miniature product surfaces that sit beside the feature
 * articles — the /features equivalent of /solutions' PracticeMocks.
 *
 * FABRICATED SAMPLE DATA. Every client name, engagement and figure
 * here is invented for illustration (see the content module's
 * FEATURE_MOCKS note). Nothing below is a real customer, engagement
 * or measured outcome, and every miniature carries the visible
 * fictional-client disclosure.
 *
 * Each miniature is drawn from a surface roducq really ships: the
 * event/webhook rule vocabulary, a plan checklist, the update
 * composer, integration settings, the report rollup and the workspace
 * roster. The reference's own miniatures depict its task manager and
 * calendar; that domain is deliberately not reproduced.
 *
 * All six are presentational and render on the server — the no-JS
 * fallback keeps every miniature visible, exactly like /solutions.
 */

/** The status pill that heads a miniature. */
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
      <p className="flex min-w-0 items-center gap-2 truncate text-lm-mock font-lm-semibold text-lm-ink">
        <span
          className="h-2 w-2 shrink-0 rounded-lm-dot bg-lm-accent"
          aria-hidden="true"
        />
        <span className="truncate">{title}</span>
      </p>
      {pill}
    </div>
  );
}

/**
 * The disclosure every miniature ends with. Real, visible text — the
 * mock data is invented and the page says so where the data is shown.
 */
function MockCaption() {
  return (
    <p className="mt-3 border-t border-lm-border-soft pt-2.5 text-lm-chip text-lm-muted-slate">
      {MOCK_DISCLOSURE}
    </p>
  );
}

function MockShell({
  children,
  label,
}: {
  children: React.ReactNode;
  /** Accessible name for the illustration card. */
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${label} — ${MOCK_DISCLOSURE}.`}
      className="lm-mock-card flex flex-col rounded-lm-frame p-[27px]"
    >
      {children}
      <MockCaption />
    </div>
  );
}

/** 01 — the event/webhook rule vocabulary (lib/events.ts, webhook-dispatch). */
function AutomationMock() {
  const mock = FEATURE_MOCKS.automation;
  return (
    <MockShell label={mock.ariaLabel}>
      <MockHeader title={mock.title} pill={<MockPill>{mock.pill}</MockPill>} />
      <ol className="mt-4 flex flex-col gap-2">
        {mock.rows.map((row) => (
          <li
            key={row.conj}
            className="rounded-lm-row border border-lm-border-soft bg-lm-canvas p-2.5"
          >
            <p className="text-lm-chip font-lm-bold uppercase tracking-[0.06em] text-lm-ink-accent">
              {row.conj}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {row.cells.map((cell, index) => (
                <span
                  key={cell}
                  className={cn(
                    "rounded-lm-pill px-2.5 py-1 text-lm-12",
                    index === row.cells.length - 1
                      ? "bg-lm-surface-accent font-lm-semibold text-lm-ink-accent"
                      : "bg-lm-canvas-alt text-lm-muted-slate",
                  )}
                >
                  {cell}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-auto pt-4 text-lm-12 text-lm-muted-slate">
        <span
          className="mr-1.5 inline-block h-1.5 w-1.5 rounded-lm-dot bg-lm-accent align-middle"
          aria-hidden="true"
        />
        {mock.footer}
      </p>
    </MockShell>
  );
}

/** 02 — a plan checklist copied from an accepted proposal (plans table). */
function PlanMock() {
  const mock = FEATURE_MOCKS.plan;
  return (
    <MockShell label={mock.ariaLabel}>
      <MockHeader title={mock.title} pill={<MockPill>{mock.pill}</MockPill>} />
      <ul className="mt-3 divide-y divide-lm-border-soft">
        {mock.tasks.map((task) => (
          <li key={task.label} className="flex items-center gap-2.5 py-2.5">
            <span
              className={cn(
                "flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-lm-dot",
                task.checked
                  ? "border border-lm-accent bg-lm-accent text-lm-on-accent"
                  : "border border-lm-surface-neutral bg-lm-card",
              )}
              aria-hidden="true"
            >
              {task.checked ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
            <span
              className={cn(
                "truncate text-lm-mock",
                task.checked
                  ? "text-lm-ink-soft line-through"
                  : "text-lm-ink",
              )}
            >
              {task.label}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between">
          <p className="text-lm-12 text-lm-muted-slate">{mock.footerLabel}</p>
          <p className="text-lm-12 text-lm-muted-slate">{mock.footerValue}</p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-lm-pill bg-lm-surface-muted">
          <div
            className="h-full rounded-lm-pill bg-lm-accent"
            style={{ width: `${mock.progress * 100}%` }}
          />
        </div>
      </div>
    </MockShell>
  );
}

/** 03 — the weekly update drafted from plan progress (updates, time, share links). */
function UpdateMock() {
  const mock = FEATURE_MOCKS.update;
  return (
    <MockShell label={mock.ariaLabel}>
      <MockHeader title={mock.title} pill={<MockPill>{mock.pill}</MockPill>} />
      <ul className="mt-3 flex flex-col gap-2">
        {mock.lines.map((line) => (
          <li
            key={line.label}
            className="flex items-center justify-between gap-3 rounded-lm-row bg-lm-canvas px-3 py-2.5"
          >
            <span className="truncate text-lm-mock text-lm-ink">
              {line.label}
            </span>
            {/* The lm token set maps two state inks only: success green
                and accent purple. "Blocked" therefore takes the strong
                neutral ink rather than an unmapped vermillion, keeping
                the three states distinguishable without a new token. */}
            <span
              className={cn(
                "shrink-0 text-lm-12 font-lm-semibold",
                line.state === "Done"
                  ? "text-lm-success"
                  : line.state === "Blocked"
                    ? "text-lm-ink"
                    : "text-lm-ink-accent",
              )}
            >
              {line.state}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-2.5 pt-4">
        <p className="flex items-center gap-2 text-lm-12 text-lm-muted-slate">
          <Link2 className="h-3.5 w-3.5 text-lm-ink-accent" aria-hidden="true" />
          {mock.share}
        </p>
        <p className="text-lm-12 text-lm-muted-slate">{mock.time}</p>
      </div>
    </MockShell>
  );
}

/** 04 — connected sources and outbound channels (lib/integrations, webhooks, pdf). */
function ConnectionsMock() {
  const mock = FEATURE_MOCKS.connections;
  return (
    <MockShell label={mock.ariaLabel}>
      <MockHeader title={mock.title} pill={<MockPill>{mock.pill}</MockPill>} />
      <ul className="mt-3 divide-y divide-lm-border-soft">
        {mock.rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-lm-mock font-lm-medium text-lm-ink">
                {row.label}
              </p>
              <p className="truncate text-lm-12 text-lm-muted-slate">
                {row.detail}
              </p>
            </div>
            <span className="shrink-0 rounded-lm-pill bg-lm-surface-accent px-2.5 py-1 text-lm-chip font-lm-semibold text-lm-ink-accent">
              {row.state}
            </span>
          </li>
        ))}
      </ul>
    </MockShell>
  );
}

/** 05 — the live report rollup (lib/reports.ts computeReport, /reports, PDF). */
function RollupMock() {
  const mock = FEATURE_MOCKS.rollup;
  return (
    <MockShell label={mock.ariaLabel}>
      <MockHeader title={mock.title} pill={<MockPill>{mock.pill}</MockPill>} />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {mock.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lm-row border border-lm-border-soft bg-lm-canvas p-2.5 text-center"
          >
            <p className="text-lm-20 font-lm-semibold text-lm-ink">
              {stat.value}
            </p>
            <p className="mt-0.5 text-lm-10 text-lm-muted-slate">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {mock.bars.map((bar) => (
          <li key={bar.label}>
            <div className="flex items-center justify-between text-lm-12 text-lm-muted-slate">
              <span>{bar.label}</span>
              <span className="font-lm-semibold">{bar.value}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-lm-pill bg-lm-surface-muted">
              <div
                className="h-full rounded-lm-pill bg-lm-accent"
                style={{ width: `${bar.width * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-auto flex items-center gap-2 pt-4 text-lm-12 font-lm-semibold text-lm-ink-accent">
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {mock.footer}
      </p>
    </MockShell>
  );
}

/** 06 — roles, viewers and proposal versions (roles-spec, proposal_versions). */
function RosterMock() {
  const mock = FEATURE_MOCKS.roster;
  return (
    <MockShell label={mock.ariaLabel}>
      <MockHeader title={mock.title} pill={<MockPill>{mock.pill}</MockPill>} />
      <ul className="mt-3 flex flex-col gap-2">
        {mock.members.map((member) => (
          <li
            key={member.initials}
            className="flex items-center gap-2.5 rounded-lm-row bg-lm-canvas px-2.5 py-2"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lm-dot bg-lm-surface-accent text-lm-12 font-lm-bold text-lm-ink-accent"
              aria-hidden="true"
            >
              {member.initials}
            </span>
            <span className="text-lm-mock text-lm-ink">{member.label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-2 pt-4 text-lm-12 text-lm-muted-slate">
        <p className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-lm-success" aria-hidden="true" />
          {mock.version}
        </p>
        <p className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-lm-dot bg-lm-accent"
            aria-hidden="true"
          />
          {mock.questions}
        </p>
      </div>
    </MockShell>
  );
}

/** The six miniatures, keyed the way the content module references them. */
export const FEATURE_MOCK_COMPONENTS: Record<
  FeatureMockKey,
  () => React.ReactElement
> = {
  automation: AutomationMock,
  plan: PlanMock,
  update: UpdateMock,
  connections: ConnectionsMock,
  rollup: RollupMock,
  roster: RosterMock,
};
