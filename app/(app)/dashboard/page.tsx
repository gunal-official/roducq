/**
 * / — the Pipeline dashboard (Step 34(b) → Phase 3 page redesign): served
 * at the root URL for members via the proxy rewrite
 * (lib/supabase/middleware.ts); guests keep the marketing home. One screen
 * over rows every list page already fetches: pipeline flow with live
 * counts, "needs you" alerts, money + week-strip cards (money viewers),
 * and a cross-module activity timeline.
 *
 * PHASE 3 LAYOUT CONTRACT
 *   phone (<600)   one column: page head, 2-up stat tiles, flow stages as
 *                  a stacked list, then needs-you and the rail cards.
 *   tablet (600+)  stat tiles go 2-up → 4-up at 1024; the flow becomes a
 *                  five-column stage strip; the rail is still one column.
 *   desktop (1024) content + a 20rem rail (`desk:grid-cols-[minmax(0,1fr)_20rem]`).
 *
 * HOW TO TEST (locally — Supabase configured per README.md, seed loaded):
 *   1. Log in and land on /: the shell sidebar's "Pipeline" is active and
 *      the stat row matches the seeded briefs/proposals/plans/updates.
 *   2. Pipeline flow counts deep-link into each list; the numbers match
 *      the lists' own tab counts.
 *   3. "Needs you" lists open questions / draft updates / expiring
 *      contracts / overdue invoices (owners & editors see money rows;
 *      viewers don't).
 *   4. Money card totals match /invoices; the week strip matches /time.
 *   5. Logged out, / is the marketing home again (no dashboard leak).
 */

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  ClipboardList,
  FileText,
  Hourglass,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  PenLine,
  Receipt,
  Timer,
  Wallet,
} from "lucide-react";

import { getBriefs } from "@/lib/data/briefs";
import { getContracts } from "@/lib/data/contracts";
import { dashboardClock, weekMinutes } from "@/lib/data/dashboard";
import { getInboxThreads } from "@/lib/data/inbox";
import { getInvoices } from "@/lib/data/invoices";
import { getPlans } from "@/lib/data/plans";
import { getProposals } from "@/lib/data/proposals";
import { getTimeEntries } from "@/lib/data/time";
import { getUpdates } from "@/lib/data/updates";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { formatDuration, formatMoney, timeAgo } from "@/lib/utils";
import {
  ActivityTimeline,
  ListStats,
  StackedBar,
  StatTile,
  type TimelineEvent,
} from "@/components/ui/doc-detail";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui/page";
import { Button } from "@/components/ui/button";

const FLOW_STAGES = [
  { label: "Intake", href: "/intake/inbox", icon: Inbox },
  { label: "Briefs", href: "/briefs", icon: ClipboardList },
  { label: "Proposals", href: "/proposals", icon: FileText },
  { label: "Plans", href: "/plans", icon: ListChecks },
  { label: "Updates", href: "/updates", icon: MessageSquare },
] as const;

/** The business chart under the stat row (proposal dispositions). */
function DispositionBar({
  inPlay,
  accepted,
  declined,
}: {
  inPlay: number;
  accepted: number;
  declined: number;
}) {
  if (inPlay + accepted + declined === 0) return null;
  return (
    <StackedBar
      segments={[
        { label: "In play", weight: inPlay, className: "bg-accent" },
        { label: "Accepted", weight: accepted, className: "bg-success" },
        { label: "Declined", weight: declined, className: "bg-error/60" },
      ]}
    />
  );
}

function AttentionRow({
  icon: Icon,
  text,
  href,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  href: string;
  tone: "accent" | "error" | "muted";
}) {
  const chipTone =
    tone === "accent"
      ? "icon-chip-accent"
      : tone === "error"
        ? "icon-chip-error"
        : "icon-chip-muted";
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-control px-1 py-2 transition-colors hover:bg-muted/60"
    >
      <span className={`icon-chip h-8 w-8 shrink-0 ${chipTone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-sm">{text}</span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}

export default async function DashboardPage() {
  const context = await getWorkspaceContext();
  const clock = dashboardClock();

  const [briefs, proposals, plans, updates, contracts, threads] = context
    ? await Promise.all([
        getBriefs(context.id),
        getProposals(context.id),
        getPlans(context.id),
        getUpdates(context.id),
        getContracts(context.id),
        getInboxThreads(),
      ])
    : [[], [], [], [], [], null];

  const canSeeMoney = context?.canSeeMoney ?? false;
  const [invoices, timeEntries] =
    canSeeMoney && context
      ? await Promise.all([getInvoices(context.id), getTimeEntries(context.id)])
      : [[], []];

  // ── Pipeline counts ──
  const briefsInReview = briefs.filter((b) => b.status === "in_review").length;
  const openQuestions = briefs.reduce((n, b) => n + b.openQuestionCount, 0);
  const proposalsInPlay = proposals.filter(
    (p) => p.status === "draft" || p.status === "sent"
  ).length;
  const plansMoving = plans.filter((p) => p.status === "in_progress").length;
  const updatesDrafts = updates.filter((u) => u.status === "draft").length;
  const flowCounts = [
    (threads ?? []).length,
    briefs.length,
    proposals.length,
    plans.length,
    updates.length,
  ];

  // ── Proposal dispositions (the business chart) ──
  const propInPlay = proposalsInPlay;
  const propAccepted = proposals.filter((p) => p.status === "accepted").length;
  const propDeclined = proposals.filter((p) => p.status === "declined").length;

  // ── Needs you (derived windows from the data-layer clock) ──
  const expiring = contracts.filter(
    (c) =>
      c.expires_on &&
      c.status !== "signed" &&
      c.status !== "void" &&
      c.expires_on >= clock.today &&
      c.expires_on <= clock.soon
  ).length;
  const overdue = invoices.filter(
    (i) => i.status === "sent" && i.due_date && i.due_date < clock.today
  ).length;
  type Attention = {
    icon: typeof Clock;
    text: string;
    href: string;
    tone: "accent" | "error" | "muted";
  };
  const attention = [
    openQuestions > 0 && {
      icon: Bell,
      text: `${openQuestions} open question${openQuestions === 1 ? "" : "s"} across ${briefs.filter((b) => b.openQuestionCount > 0).length} brief${briefs.filter((b) => b.openQuestionCount > 0).length === 1 ? "" : "s"}`,
      href: "/briefs",
      tone: "accent",
    },
    updatesDrafts > 0 && {
      icon: MessageSquare,
      text: `${updatesDrafts} update draft${updatesDrafts === 1 ? "" : "s"} not sent yet`,
      href: "/updates",
      tone: "muted",
    },
    expiring > 0 && {
      icon: Hourglass,
      text: `${expiring} contract offer${expiring === 1 ? "" : "s"} expiring within 30 days`,
      href: "/contracts",
      tone: "error",
    },
    canSeeMoney &&
      overdue > 0 && {
        icon: Clock,
        text: `${overdue} invoice${overdue === 1 ? "" : "s"} past the due date`,
        href: "/invoices",
        tone: "error",
      },
  ].filter(Boolean) as Attention[];

  // ── Money + week strip ──
  const outstandingCents = invoices
    .filter((i) => i.status === "sent")
    .reduce((n, i) => n + i.total_cents, 0);
  const paidCents = invoices
    .filter((i) => i.status === "paid")
    .reduce((n, i) => n + i.total_cents, 0);
  const minutes = weekMinutes(timeEntries, clock.weekDays);
  const weekTotal = minutes.reduce((n, m) => n + m, 0);
  const maxMinutes = Math.max(...minutes, 60);

  // ── Recent activity across every module ──
  const events: TimelineEvent[] = [
    ...briefs.map((b) => ({
      icon: ClipboardList,
      title: b.title,
      detail: b.client_name ?? "Brief updated",
      at: timeAgo(b.updated_at),
      tone: "muted" as const,
    })),
    ...proposals.map((p) => ({
      icon: FileText,
      title: p.title,
      detail: p.client_name ?? "Proposal updated",
      at: timeAgo(p.updated_at),
      tone: "muted" as const,
    })),
    ...plans.map((p) => ({
      icon: ListChecks,
      title: p.title,
      detail: p.client_name ?? "Plan updated",
      at: timeAgo(p.updated_at),
      tone: "muted" as const,
    })),
    ...updates.map((u) => ({
      icon: MessageSquare,
      title: u.title,
      detail: u.status === "sent" ? "Update sent" : "Update draft",
      at: timeAgo(u.updated_at),
      tone: u.status === "sent" ? ("success" as const) : ("muted" as const),
    })),
  ].slice(0, 7);

  const hasWork =
    briefs.length +
      proposals.length +
      plans.length +
      updates.length +
      (threads ?? []).length >
    0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={LayoutDashboard}
        eyebrow={context?.name}
        title="Pipeline"
        subtitle={clock.todayLabel}
        actions={
          <>
            <Button asChild variant="outline">
              <Link
                href="/intake/inbox"
                className="inline-flex min-h-11 min-w-11 items-center"
              >
                <Inbox className="h-4 w-4" aria-hidden="true" />
                Inbox
              </Link>
            </Button>
            <Button asChild>
              <Link
                href="/intake"
                className="inline-flex min-h-11 min-w-11 items-center"
              >
                <PenLine className="h-4 w-4" aria-hidden="true" />
                New brief
              </Link>
            </Button>
          </>
        }
      />

      {/* Stat row: 2-up on phones, 3-up at 600, 4-up on desktop. */}
      <ListStats
        cols={4}
        bar={
          <DispositionBar
            inPlay={propInPlay}
            accepted={propAccepted}
            declined={propDeclined}
          />
        }
      >
        <StatTile
          icon={ClipboardList}
          label="Briefs"
          value={briefs.length}
          hint={`${briefsInReview} in review · ${openQuestions} open question${openQuestions === 1 ? "" : "s"}`}
          tone={openQuestions > 0 ? "accent" : "muted"}
          href="/briefs"
        />
        <StatTile
          icon={FileText}
          label="Proposals in play"
          value={proposalsInPlay}
          hint={`${propAccepted} accepted`}
          tone={proposalsInPlay > 0 ? "accent" : "muted"}
          delay={40}
          href="/proposals"
        />
        <StatTile
          icon={Timer}
          label="Plans moving"
          value={plansMoving}
          hint={`${plans.length} total plan${plans.length === 1 ? "" : "s"}`}
          tone={plansMoving > 0 ? "accent" : "muted"}
          delay={80}
          href="/plans"
        />
        {canSeeMoney ? (
          <StatTile
            icon={Wallet}
            label="Outstanding"
            value={formatMoney(outstandingCents)}
            hint={`${formatMoney(paidCents)} paid to date`}
            tone={outstandingCents > 0 ? "accent" : "muted"}
            delay={120}
            href="/invoices"
          />
        ) : (
          <StatTile
            icon={MessageSquare}
            label="Update drafts"
            value={updatesDrafts}
            hint="Not sent yet"
            tone={updatesDrafts > 0 ? "accent" : "muted"}
            delay={120}
            href="/updates"
          />
        )}
      </ListStats>

      {!hasWork ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Your pipeline is empty"
          description="Paste the first client message and roducq drafts the brief — proposals, plans, updates and invoices hang off it."
          action={
            <Button asChild>
              <Link
                href="/intake"
                className="inline-flex min-h-11 min-w-11 items-center"
              >
                <PenLine className="h-4 w-4" aria-hidden="true" />
                Start with a brief
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid items-start gap-6 desk:grid-cols-[minmax(0,1fr)_20rem]">
          {/* ── Left: flow + attention ── */}
          <div className="space-y-6">
            <SectionCard
              icon={ArrowRight}
              title="How the work flows"
              description="Every stage is a live count — tap through to the list."
              tone="accent"
              className="animate-rise-in"
              proof="pipeline-flow"
            >
              <ol className="grid gap-2 tab:grid-cols-5">
                {FLOW_STAGES.map((stage, i) => (
                  <li key={stage.href}>
                    <Link
                      href={stage.href}
                      className="flex min-h-11 items-center gap-2.5 rounded-control border border-border bg-card px-3 py-2.5 transition-colors hover:border-accent hover:text-accent tab:flex-col tab:items-start tab:gap-1.5 tab:px-3.5 tab:py-3"
                    >
                      <span className="icon-chip icon-chip-muted h-7 w-7 shrink-0">
                        <stage.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium uppercase tracking-wider text-secondary-text tab:text-[11px]">
                        {stage.label}
                      </span>
                      <span className="font-display text-lg font-bold leading-none tab:text-2xl">
                        {flowCounts[i]}
                      </span>
                    </Link>
                    {i < FLOW_STAGES.length - 1 && (
                      <ArrowDown
                        className="mx-auto my-1 h-4 w-4 text-muted-foreground tab:hidden"
                        aria-hidden="true"
                      />
                    )}
                  </li>
                ))}
              </ol>
            </SectionCard>

            <SectionCard
              icon={Bell}
              title="Needs you"
              description="Anything waiting on a decision, a send, or a signature."
              tone="accent"
              className="animate-rise-in"
              bodyClassName="p-3"
            >
              {attention.length === 0 ? (
                <p className="flex min-h-11 items-center gap-2 px-2 text-sm text-muted-foreground">
                  <CheckCircle2
                    className="h-4 w-4 text-success"
                    aria-hidden="true"
                  />
                  Nothing pressing — everything is moving on schedule.
                </p>
              ) : (
                attention.map((row) => (
                  <AttentionRow
                    key={row.text}
                    icon={row.icon}
                    text={row.text}
                    href={row.href}
                    tone={row.tone}
                  />
                ))
              )}
            </SectionCard>
          </div>

          {/* ── Right rail: money + week + activity ── */}
          <div className="space-y-6">
            {canSeeMoney && (
              <>
                <SectionCard
                  icon={Receipt}
                  title="Money"
                  proof="pipeline-money"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-display text-2xl font-bold">
                      {formatMoney(outstandingCents)}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      outstanding
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                    <CircleDollarSign
                      className="h-4 w-4 text-success"
                      aria-hidden="true"
                    />
                    {formatMoney(paidCents)} paid
                    {overdue > 0 && (
                      <span className="ml-auto rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                        {overdue} overdue
                      </span>
                    )}
                  </div>
                  <Link
                    href="/invoices"
                    className="mt-3 inline-flex min-h-11 min-w-11 items-center gap-1.5 text-sm text-accent underline-offset-2 hover:underline"
                  >
                    Open invoices
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </SectionCard>

                <SectionCard
                  icon={Clock}
                  title="This week"
                  proof="pipeline-week"
                >
                  <div
                    className="flex h-16 items-end gap-1.5"
                    role="img"
                    aria-label={`Time this week: ${formatDuration(weekTotal)} total`}
                  >
                    {minutes.map((m, i) => (
                      <div
                        key={clock.weekDays[i].iso}
                        className="flex h-full flex-1 flex-col justify-end"
                      >
                        <div
                          className="w-full rounded-t bg-accent"
                          style={{
                            height: `${Math.round((m / maxMinutes) * 100)}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    {clock.weekDays.map((d) => (
                      <span
                        key={d.iso}
                        className="flex-1 truncate text-center text-[11px] text-muted-foreground"
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <Timer className="mr-1 inline h-4 w-4" aria-hidden="true" />
                    {formatDuration(weekTotal)} logged
                  </p>
                </SectionCard>
              </>
            )}

            <SectionCard
              icon={BookOpen}
              title="Recent activity"
              proof="pipeline-activity"
            >
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing yet — start with a client brief.
                </p>
              ) : (
                <ActivityTimeline events={events} />
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}
