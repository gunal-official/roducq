import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  ListChecks,
  MessageSquareText,
  Plus,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page";
import { dashboardClock, weekMinutes } from "@/lib/data/dashboard";
import { getBriefs } from "@/lib/data/briefs";
import { getContracts } from "@/lib/data/contracts";
import { getInvoices } from "@/lib/data/invoices";
import { getOpenPlanTasks, getPlans } from "@/lib/data/plans";
import { getTimeEntries } from "@/lib/data/time";
import { getUpdates } from "@/lib/data/updates";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/utils";

type OverviewAttention = {
  icon: LucideIcon;
  title: string;
  detail: string;
  count: number;
  href: string;
  tone: "accent" | "error" | "muted";
};

function OverviewMetric({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint: string;
  href: string;
  tone?: "default" | "accent" | "success";
}) {
  const iconTone =
    tone === "accent" ? "bg-accent-soft text-accent"
      : tone === "success" ? "bg-success/10 text-success"
        : "bg-muted text-muted-foreground";
  return (
    <Link
      href={href}
      className="group flex min-h-32 flex-col justify-between rounded-surface border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${iconTone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div>
        <p className="font-display text-3xl font-bold leading-none tracking-tight text-text sm:text-4xl">{value}</p>
        <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>
      </div>
    </Link>
  );
}

function WeeklyTimeChart({
  minutes,
  days,
  total,
}: {
  minutes: number[];
  days: { iso: string; label: string }[];
  total: number;
}) {
  const peak = Math.max(60, ...minutes);
  const points = minutes.map((value, index) => ({
    x: 22 + index * 92,
    y: 148 - Math.round((value / peak) * 105),
  }));
  const line = points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const first = points[0] ?? { x: 22, y: 148 };
  const last = points[points.length - 1] ?? first;
  const area = `${line} L ${last.x} 158 L ${first.x} 158 Z`;

  return (
    <div>
      <div
        role="img"
        aria-label={`Time tracked in the last seven days: ${formatDuration(total)} total`}
        className="w-full"
      >
        <svg viewBox="0 0 590 178" className="h-52 w-full overflow-visible text-accent" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="overview-time-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.015" />
            </linearGradient>
          </defs>
          {[38, 76, 114, 152].map((y) => (
            <line key={y} x1="20" x2="572" y1={y} y2={y} stroke="currentColor" strokeDasharray="3 6" className="text-border" />
          ))}
          <path d={area} fill="url(#overview-time-fill)" className="text-accent" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-accent" />
          <circle cx={last.x} cy={last.y} r="5" fill="currentColor" stroke="var(--card)" strokeWidth="3" className="text-accent" />
        </svg>
      </div>
      <div className="-mt-1 grid grid-cols-7 text-center text-xs text-muted-foreground" aria-hidden="true">
        {days.map((day) => <span key={day.iso}>{day.label}</span>)}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          Logged time per day
        </p>
        <p className="font-display text-lg font-bold text-text">{formatDuration(total)}</p>
      </div>
    </div>
  );
}

function AttentionLink({ item }: { item: OverviewAttention }) {
  const tone = item.tone === "error"
    ? "bg-error/10 text-error"
    : item.tone === "accent"
      ? "bg-accent-soft text-accent"
      : "bg-muted text-muted-foreground";
  return (
    <Link href={item.href} className="flex min-h-14 items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-muted/60">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${tone}`}>
        <item.icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-text">{item.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span>
      </span>
      <span className="min-w-7 rounded-full bg-muted px-2 py-1 text-center text-xs font-semibold text-secondary-text">{item.count}</span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function OverviewPage() {
  const supabase = await createClient();
  const [{ data: { user } }, context] = await Promise.all([
    supabase.auth.getUser(),
    getWorkspaceContext(),
  ]);
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };
  const firstName =
    (profile as { full_name?: string | null } | null)?.full_name?.trim().split(/\s+/)[0]
      || user?.email?.split("@")[0]
      || "there";

  const clock = dashboardClock();
  const [briefs, plans, updates, contracts, openTasks] = context
    ? await Promise.all([
        getBriefs(context.id),
        getPlans(context.id),
        getUpdates(context.id),
        getContracts(context.id),
        getOpenPlanTasks(context.id, 4),
      ])
    : [[], [], [], [], []];
  const [invoices, timeEntries] = context?.canSeeMoney
    ? await Promise.all([getInvoices(context.id), getTimeEntries(context.id)])
    : [[], []];

  const taskTotal = plans.reduce((sum, plan) => sum + plan.tasksTotal, 0);
  const tasksDone = plans.reduce((sum, plan) => sum + plan.tasksDone, 0);
  const activePlans = plans.filter((plan) => plan.status === "in_progress").length;
  const openQuestions = briefs.reduce((sum, brief) => sum + brief.openQuestionCount, 0);
  const draftUpdates = updates.filter((update) => update.status === "draft").length;
  const soonContracts = contracts.filter((contract) =>
    contract.expires_on &&
    contract.status !== "signed" &&
    contract.status !== "void" &&
    contract.expires_on >= clock.today &&
    contract.expires_on <= clock.soon
  ).length;
  const overdueInvoices = invoices.filter((invoice) =>
    invoice.status === "sent" && invoice.due_date && invoice.due_date < clock.today
  ).length;
  const attention: OverviewAttention[] = [
    openQuestions > 0 && {
      icon: MessageSquareText,
      title: "Open client questions",
      detail: `Across ${briefs.filter((brief) => brief.openQuestionCount > 0).length} briefs`,
      count: openQuestions,
      href: "/briefs",
      tone: "accent",
    },
    draftUpdates > 0 && {
      icon: FileText,
      title: "Update drafts to review",
      detail: "Ready for your edits before sending",
      count: draftUpdates,
      href: "/updates",
      tone: "muted",
    },
    soonContracts > 0 && {
      icon: BriefcaseBusiness,
      title: "Contracts expiring soon",
      detail: "Within the next 30 days",
      count: soonContracts,
      href: "/contracts",
      tone: "error",
    },
    overdueInvoices > 0 && {
      icon: Clock3,
      title: "Overdue invoices",
      detail: "Past their due date",
      count: overdueInvoices,
      href: "/invoices",
      tone: "error",
    },
  ].filter(Boolean) as OverviewAttention[];
  const attentionCount = attention.reduce((sum, item) => sum + item.count, 0);
  const minutes = weekMinutes(timeEntries, clock.weekDays);
  const weekTotal = minutes.reduce((sum, value) => sum + value, 0);

  return (
    <div className="forma-core mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-3 text-sm text-muted-foreground">
        <span>{context?.name ?? "Workspace"}</span>
        <span aria-hidden="true" className="text-border">/</span>
        <span className="font-medium text-text">Overview</span>
      </nav>

      <header className="mb-7 flex flex-col justify-between gap-5 tab:flex-row tab:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{clock.todayLabel}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {greetingForHour(new Date().getHours())}, {firstName}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {attentionCount > 0
              ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} need your attention across this workspace.`
              : "Here’s what’s moving across your workspace."}
          </p>
        </div>
        <Button asChild>
          <Link href="/intake" className="inline-flex min-h-11 items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create a brief
          </Link>
        </Button>
      </header>

      <section aria-label="Workspace summary" className="mb-6 grid grid-cols-2 gap-3 desk:grid-cols-4 sm:gap-4">
        <OverviewMetric
          icon={CheckCircle2}
          label="Plan tasks done"
          value={tasksDone}
          hint={`${tasksDone} of ${taskTotal} checklist items`}
          href="/plans"
          tone={tasksDone > 0 ? "success" : "default"}
        />
        {context?.canSeeMoney ? (
          <OverviewMetric
            icon={Timer}
            label="Focus time"
            value={formatDuration(weekTotal)}
            hint="Logged this week"
            href="/time"
            tone={weekTotal > 0 ? "accent" : "default"}
          />
        ) : (
          <OverviewMetric
            icon={MessageSquareText}
            label="Briefs in review"
            value={briefs.filter((brief) => brief.status === "in_review").length}
            hint="Waiting for a decision"
            href="/briefs"
            tone="accent"
          />
        )}
        <OverviewMetric
          icon={BriefcaseBusiness}
          label="Active plans"
          value={activePlans}
          hint={`${plans.length} total plan${plans.length === 1 ? "" : "s"}`}
          href="/plans"
        />
        <OverviewMetric
          icon={Bell}
          label="Needs attention"
          value={attentionCount}
          hint={attentionCount > 0 ? "Open items across your workspace" : "You’re all caught up"}
          href={attention[0]?.href ?? "/briefs"}
          tone={attentionCount > 0 ? "accent" : "success"}
        />
      </section>

      <div className="grid items-start gap-5 desk:grid-cols-[minmax(0,1.25fr)_minmax(18rem,1fr)]">
        <SectionCard
          icon={Clock3}
          title="Focus time"
          description="Your logged hours over the last seven days."
          actions={
            <Link href="/time" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:underline">
              View time <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        >
          {context?.canSeeMoney ? (
            <WeeklyTimeChart minutes={minutes} days={clock.weekDays} total={weekTotal} />
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center text-center">
              <Clock3 className="mb-3 h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
              <p className="font-medium text-text">Time tracking is not available for this role</p>
              <p className="mt-1 text-sm text-muted-foreground">Your workspace role hides financial tools.</p>
            </div>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            icon={ListChecks}
            title="Next on your list"
            description="Open checklist items from active plans."
            actions={
              <Link href="/plans" aria-label="View all plans" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-muted-foreground hover:bg-muted hover:text-text">
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
            bodyClassName="p-3"
          >
            {openTasks.length > 0 ? (
              <ul className="divide-y divide-border">
                {openTasks.map((task) => (
                  <li key={`${task.planId}-${task.id}`}>
                    <Link href={`/plans/${task.planId}`} className="flex min-h-14 items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-muted/50">
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text">{task.text}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{task.clientName || task.planTitle}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex min-h-24 items-center justify-center gap-2 px-3 text-center text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                No open plan tasks. You’re all caught up.
              </p>
            )}
          </SectionCard>

          <SectionCard
            icon={Bell}
            title="Needs attention"
            description="A few things that may need a follow-up."
            bodyClassName="p-3"
          >
            {attention.length > 0 ? (
              <ul className="divide-y divide-border">
                {attention.map((item) => <li key={item.title}><AttentionLink item={item} /></li>)}
              </ul>
            ) : (
              <p className="flex min-h-20 items-center justify-center gap-2 px-3 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                Nothing pressing right now.
              </p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
