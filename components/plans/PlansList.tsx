"use client";

/**
 * Client side of /plans — status filter chips + search over the list the
 * server page fetched. Mirrors components/proposals/ProposalsList.tsx;
 * plans originate from proposals, so the empty state points to /proposals
 * rather than offering an inline create.
 *
 * Phase D: the tab strip is gone in favour of the shared wrapping
 * FilterChips (the same control Briefs and Proposals use, and the one that
 * survives 320px), the page opens with a lavender delivery band whose
 * milestone rail is drawn from the real task counts, and every plan is a
 * work card with a real tasks-done rail.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { ListTodo, Search, Timer, CheckCircle2, ListChecks } from "lucide-react";

import { PlanStatusBadge } from "@/components/plans/PlanStatusBadge";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/page";
import { ListStats, StatTile, StackedBar } from "@/components/ui/doc-detail";
import { PlanProgressArt } from "@/components/workflow/ClientWorkArt";
import { WorkBand, WorkCard } from "@/components/workflow/WorkCard";
import { timeAgo } from "@/lib/utils";
import type { PlanStatus, PlanSummary } from "@/lib/types/plan";

type StatusFilter = "all" | PlanStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export function PlansList({ plans }: { plans: PlanSummary[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: plans.length,
      not_started: 0,
      in_progress: 0,
      done: 0,
    };
    for (const plan of plans) counts[plan.status] += 1;
    return counts;
  }, [plans]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plans.filter((plan) => {
      if (statusFilter !== "all" && plan.status !== statusFilter) return false;
      if (!q) return true;
      return (
        plan.title.toLowerCase().includes(q) ||
        (plan.client_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [plans, statusFilter, query]);

  const inProgress = plans.filter((p) => p.status === "in_progress").length;
  const donePlans = plans.filter((p) => p.status === "done").length;
  const tasksDone = plans.reduce((n, p) => n + p.tasksDone, 0);
  const tasksTotal = plans.reduce((n, p) => n + p.tasksTotal, 0);

  /** The band's rail mirrors the aggregate, one node per task up to 14. */
  const railTasks = Array.from({ length: tasksTotal }, (_, i) => ({
    id: `task-${i}`,
    checked: i < tasksDone,
  }));

  return (
    <div>
      <WorkBand
        kicker="Plans"
        title="The delivery workspace"
        description="A plan turns an accepted proposal into work you can tick off. Nothing is marked done for you — every milestone on the rail is a task someone completed."
        art={<PlanProgressArt tasks={railTasks} />}
        stats={[
          { value: plans.length, label: "plans" },
          { value: `${tasksDone}/${tasksTotal}`, label: "tasks done" },
          { value: inProgress, label: "in progress" },
        ]}
      />

      <ListStats
        cols={4}
        bar={
          <StackedBar
            segments={[
              { label: "Not started", weight: statusCounts.not_started, className: "bg-muted-foreground/50" },
              { label: "In progress", weight: statusCounts.in_progress, className: "bg-accent" },
              { label: "Done", weight: statusCounts.done, className: "bg-success" },
            ]}
          />
        }
      >
        <StatTile icon={ListTodo} label="Total plans" value={plans.length} hint="All time" />
        <StatTile
          icon={Timer}
          label="In progress"
          value={inProgress}
          hint="Actively moving"
          tone={inProgress > 0 ? "accent" : "muted"}
          delay={40}
        />
        <StatTile
          icon={CheckCircle2}
          label="Delivered"
          value={donePlans}
          hint="Plans done"
          tone={donePlans > 0 ? "success" : "muted"}
          delay={80}
        />
        <StatTile
          icon={ListChecks}
          label="Tasks done"
          value={`${tasksDone}/${tasksTotal}`}
          hint="Across all plans"
          delay={120}
        />
      </ListStats>

      <div className="work-toolbar flex flex-col gap-3 tab:flex-row tab:items-center tab:justify-between">
        <FilterChips
          label="Filter plans by status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={FILTER_OPTIONS.map((option) => ({
            ...option,
            count: statusCounts[option.value],
          }))}
        />
        <div className="relative w-full tab:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or client…"
            className="pl-8"
            aria-label="Search plans"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        plans.length > 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No matching plans"
            description="Try a different search or status filter."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setStatusFilter("all");
                  setQuery("");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ListTodo}
            title="No plans yet"
            description="Plans are generated from proposals — open a proposal and click “Generate plan” to turn its deliverables into a task list."
            action={
              <Button asChild>
                <Link href="/proposals" className="inline-flex min-h-11 min-w-11 items-center">
                  Open proposals
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="work-grid grid gap-4 sm:grid-cols-2 desk:grid-cols-3">
          {visible.map((plan) => (
            <WorkCard
              key={plan.id}
              href={`/plans/${plan.id}`}
              title={plan.title}
              client={plan.client_name}
              icon={ListChecks}
              badge={<PlanStatusBadge status={plan.status} />}
              progress={
                plan.tasksTotal > 0
                  ? {
                      label: "Tasks",
                      done: plan.tasksDone,
                      total: plan.tasksTotal,
                    }
                  : null
              }
              meta={<span className="work-card-time">Updated {timeAgo(plan.updated_at)}</span>}
            />
          ))}
        </div>
      )}
    </div>
  );
}
