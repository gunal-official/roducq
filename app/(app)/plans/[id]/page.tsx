/**
 * /plans/:id — the delivery plan document (Step 34(b) → Phase D): the plan
 * rendered as a Forma sheet whose body IS the interactive task workspace —
 * a milestone rail drawn from the real task counts, the grouped checklist,
 * stat tiles (tasks / status / source proposal), a "send an update" panel,
 * markdown export, and an activity timeline.
 *
 * PHASE D LAYOUT CONTRACT
 *   phone / tablet  one column: the plan sheet (progress rail, budget, the
 *                   grouped task board), then the rail panels underneath.
 *   desktop (1024+) the sheet on the left (2fr), the rail on the right (1fr)
 *                   — the same split as Briefs and Proposals, at the same
 *                   `desk` breakpoint.
 *
 * HOW TO TEST (locally — Supabase configured per README.md, ⚠ apply the
 * new plans migration + seed first):
 *   1. From /plans open the seeded "Brightloop Co." plan.
 *   2. Click a task: it flips immediately (optimistic), moves between the
 *      "To do" and "Completed" groups, persists via toggleTask, and the
 *      rail, the counter and the /plans card stay in sync.
 *   3. Status dropdown (Not started → In progress → Done): plans.status
 *      updates; list badge matches after navigating back.
 *   4. "Compose update" creates a draft client update from this plan.
 *   5. "Export as markdown" downloads <title>.md built in the browser.
 *   6. "View source proposal" links to /proposals/<id>; bogus or foreign
 *      ids render the "not found" state (RLS hides them identically).
 */

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  FilePlus2,
  Flag,
  ListChecks,
  Send,
} from "lucide-react";

import { getPlanById } from "@/lib/data/plans";
import { formatDate, isUuid, timeAgo } from "@/lib/utils";
import { ComposeUpdateButton } from "@/components/plans/ComposeUpdateButton";
import { CanEdit } from "@/components/app-shell/CanEdit";
import { ExportMarkdownButton } from "@/components/plans/ExportMarkdownButton";
import { DownloadPdfButton } from "@/components/ui/DownloadPdfButton";
import { PlanStatusBadge } from "@/components/plans/PlanStatusBadge";
import { PlanStatusSelect } from "@/components/plans/PlanStatusSelect";
import { TaskChecklist } from "@/components/plans/TaskChecklist";
import { PlanProgressArt } from "@/components/workflow/ClientWorkArt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ActivityTimeline,
  DocHeader,
  PaperCard,
  StatTile,
  type TimelineEvent,
} from "@/components/ui/doc-detail";
import { EmptyState, SectionCard } from "@/components/ui/page";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right">{children}</span>
    </div>
  );
}

function NotFoundState() {
  return (
    <EmptyState
      headingAs="h1"
      icon={ListChecks}
      title="Plan not found"
      description="This plan doesn’t exist — or it belongs to a workspace you’re not a member of."
      action={
        <Button asChild variant="secondary">
          <Link href="/plans" className="inline-flex min-h-11 min-w-11 items-center">
            Back to plans
          </Link>
        </Button>
      }
    />
  );
}

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    return <NotFoundState />;
  }

  const plan = await getPlanById(id);
  if (!plan) {
    return <NotFoundState />;
  }

  const doneCount = plan.tasks.filter((t) => t.checked).length;

  const events: TimelineEvent[] = [
    {
      icon: FilePlus2,
      title: "Created",
      detail: plan.proposal ? `From “${plan.proposal.title}”` : undefined,
      at: formatDate(plan.created_at),
      tone: "accent",
    },
    ...(plan.status === "done"
      ? [
          {
            icon: CheckCircle2,
            title: "All tasks done",
            detail: `${doneCount} of ${plan.tasks.length} completed`,
            at: formatDate(plan.updated_at),
            tone: "success",
          } as TimelineEvent,
        ]
      : []),
    {
      icon: Clock,
      title: "Last updated",
      at: timeAgo(plan.updated_at),
      tone: "muted",
    },
  ];

  return (
    <div className="forma-core forma-plans mx-auto max-w-6xl">
      <Link href="/plans" className="work-back">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Plans
      </Link>

      <DocHeader
        icon={ClipboardList}
        title={plan.title}
        badges={<PlanStatusBadge status={plan.status} />}
        subtitle={plan.client_name ?? undefined}
        actions={
          <DownloadPdfButton
            href={`/api/pdf/plan/${plan.id}`}
            label="Download PDF"
          />
        }
      />

      {/* The delivery band: the milestone rail is drawn from this plan's real
          tasks — one node per task, filled when it is ticked off. */}
      <div className="work-doc-band work-doc-band-plan">
        <div className="work-doc-band-art">
          <PlanProgressArt tasks={plan.tasks} />
        </div>
        <div className="work-doc-band-copy">
          <p className="forma-kicker">Delivery progress</p>
          <p className="work-doc-band-note">
            {plan.tasks.length === 0
              ? "No tasks yet — generate the plan from its proposal."
              : `${doneCount} of ${plan.tasks.length} tasks are ticked off. ${
                  plan.tasks.length - doneCount
                } still to do.`}
          </p>
          <div className="work-doc-band-chips">
            <Badge variant="secondary">
              {plan.tasks.length} task{plan.tasks.length === 1 ? "" : "s"}
            </Badge>
            <Badge variant="secondary">
              Updated {timeAgo(plan.updated_at)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={ListChecks}
          label="Tasks"
          value={`${doneCount} of ${plan.tasks.length} done`}
          hint={
            plan.tasks.length > 0
              ? "Toggles save automatically"
              : "No tasks yet"
          }
          tone={doneCount > 0 ? "accent" : "muted"}
        />
        <StatTile
          icon={Flag}
          label="Status"
          value={<PlanStatusBadge status={plan.status} />}
          hint="Moves as the work does"
          tone={plan.status === "done" ? "success" : "muted"}
        />
        <StatTile
          icon={BookOpen}
          label="Source proposal"
          value={plan.proposal ? plan.proposal.title : "—"}
          hint={plan.proposal ? "View the proposal it came from" : "Standalone plan"}
          href={plan.proposal ? `/proposals/${plan.proposal.id}` : undefined}
          delay={80}
        />
      </div>

      <div className="grid items-start gap-6 desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ── Left: the plan sheet (task workspace) ── */}
        <PaperCard
          letterLabel="Delivery plan"
          letterhead={plan.client_name ?? "Delivery plan"}
          meta={formatDate(plan.created_at)}
        >
          <div className="space-y-8">
            <section aria-labelledby="plan-budget" className="space-y-2">
              <h2
                id="plan-budget"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Budget & timeline
              </h2>
              {plan.budget_timeline ? (
                <p className="max-w-prose whitespace-pre-line text-[15px] leading-relaxed">
                  {plan.budget_timeline}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No budget or dates captured.
                </p>
              )}
            </section>

            <section aria-labelledby="plan-tasks" className="space-y-3">
              <h2
                id="plan-tasks"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Tasks
              </h2>
              <CanEdit
                fallback={<TaskChecklist planId={plan.id} tasks={plan.tasks} readOnly />}
              >
                <TaskChecklist planId={plan.id} tasks={plan.tasks} />
              </CanEdit>
            </section>
          </div>
        </PaperCard>

        {/* ── Right: action + metadata rail ── */}
        <div className="min-w-0 space-y-6">
          <SectionCard
            id="plan-update"
            icon={Send}
            tone="accent"
            title="Client update"
          >
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Keep {plan.client_name ?? "the client"} in the loop — draft
                this week’s update from the plan.
              </p>
              <CanEdit>
                <ComposeUpdateButton planId={plan.id} />
              </CanEdit>
            </div>
          </SectionCard>

          <SectionCard id="plan-details" icon={ClipboardList} title="Details">
            <div className="space-y-3.5">
              <MetaRow label="Status">
                <CanEdit fallback={<PlanStatusBadge status={plan.status} />}>
                  <PlanStatusSelect planId={plan.id} status={plan.status} />
                </CanEdit>
              </MetaRow>
              {plan.client_name && (
                <MetaRow label="Client">{plan.client_name}</MetaRow>
              )}
              <MetaRow label="Created">{formatDate(plan.created_at)}</MetaRow>
              <MetaRow label="Updated">{timeAgo(plan.updated_at)}</MetaRow>
              <div className="border-t border-border pt-3.5">
                <ExportMarkdownButton
                  title={plan.title}
                  clientName={plan.client_name}
                  budgetTimeline={plan.budget_timeline}
                  tasks={plan.tasks}
                />
              </div>
            </div>
          </SectionCard>

          {plan.proposal && (
            <SectionCard id="plan-source" icon={BookOpen} title="Source">
              <p className="break-words text-sm">{plan.proposal.title}</p>
              <Link
                href={`/proposals/${plan.proposal.id}`}
                className="inline-flex min-h-11 min-w-11 items-center group gap-1.5 text-sm text-accent underline-offset-2 hover:underline"
              >
                View source proposal
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </SectionCard>
          )}

          <SectionCard id="plan-activity" icon={Clock} title="Activity">
            <ActivityTimeline events={events} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
