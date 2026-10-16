"use client";

/**
 * Client side of /briefs — status filter chips + search over the briefs the
 * server page already fetched (list sizes are small; filtering client-side
 * keeps this one round-trip with zero loading states).
 *
 * Phase D: the page now opens with a lavender showcase band (the real
 * intake → brief drawing and real counts), the filter plane sits on its own
 * tinted toolbar, and each brief is a Forma work card. The 4A contracts
 * survive verbatim: the shared FilterChips row (wraps, 44px targets), the
 * search field beside it from 600px, and the two EmptyStates.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardList, Eye, FileText, HelpCircle, Plus, Search } from "lucide-react";

import { StatusBadge } from "@/components/briefs/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/page";
import { ListStats, StackedBar, StatTile } from "@/components/ui/doc-detail";
import { BriefSourceArt } from "@/components/workflow/ClientWorkArt";
import { WorkBand, WorkCard } from "@/components/workflow/WorkCard";
import { timeAgo } from "@/lib/utils";
import type { BriefStatus, BriefSummary } from "@/lib/types/brief";

type StatusFilter = "all" | BriefStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
];

export function BriefsList({ briefs }: { briefs: BriefSummary[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: briefs.length,
      draft: 0,
      in_review: 0,
      approved: 0,
    };
    for (const brief of briefs) counts[brief.status] += 1;
    return counts;
  }, [briefs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return briefs.filter((brief) => {
      if (statusFilter !== "all" && brief.status !== statusFilter) return false;
      if (!q) return true;
      return (
        brief.title.toLowerCase().includes(q) ||
        (brief.client_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [briefs, statusFilter, query]);

  const openQuestions = briefs.reduce((n, b) => n + (b.openQuestionCount ?? 0), 0);
  const approved = statusCounts.approved;

  return (
    <div>
      <WorkBand
        kicker="Briefs"
        title="Requests that became documents"
        description="Every brief starts as a raw client message on Intake and is structured into a document you review, clarify and approve. Answers and status changes are recorded on the brief itself."
        art={<BriefSourceArt />}
        stats={[
          { value: briefs.length, label: "briefs" },
          { value: statusCounts.in_review, label: "in review" },
          { value: openQuestions, label: "open questions" },
        ]}
      />

      <ListStats
        bar={
          <StackedBar
            segments={[
              { label: "Draft", weight: statusCounts.draft, className: "bg-muted-foreground/50" },
              { label: "In review", weight: statusCounts.in_review, className: "bg-accent" },
              { label: "Approved", weight: approved, className: "bg-success" },
            ]}
          />
        }
      >
        <StatTile icon={FileText} label="Total briefs" value={briefs.length} hint="All time" />
        <StatTile
          icon={Eye}
          label="In review"
          value={statusCounts.in_review}
          hint="On your desk"
          tone={statusCounts.in_review > 0 ? "accent" : "muted"}
          delay={40}
        />
        <StatTile
          icon={HelpCircle}
          label="Open questions"
          value={openQuestions}
          hint="Across all briefs"
          tone={openQuestions > 0 ? "accent" : "muted"}
          delay={80}
        />
      </ListStats>

      <div className="work-toolbar flex flex-col gap-3 tab:flex-row tab:items-center tab:justify-between">
        <FilterChips
          label="Filter briefs by status"
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
            aria-label="Search briefs"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        briefs.length > 0 ? (
          <EmptyState
            icon={FileText}
            title="No matching briefs"
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
            icon={FileText}
            title="No briefs yet"
            description="Paste a client email or call notes on the intake screen and Roducq will structure it into a brief."
            action={
              <Button asChild>
                <Link href="/intake" className="inline-flex min-h-11 min-w-11 items-center">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Create your first brief
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="work-grid grid gap-4 sm:grid-cols-2 desk:grid-cols-3">
          {visible.map((brief) => (
            <WorkCard
              key={brief.id}
              href={`/briefs/${brief.id}`}
              title={brief.title}
              client={brief.client_name}
              icon={ClipboardList}
              badge={<StatusBadge status={brief.status} />}
              meta={
                <>
                  {brief.openQuestionCount > 0 ? (
                    <Badge className="border-accent bg-accent-soft text-accent">
                      {brief.openQuestionCount} open question
                      {brief.openQuestionCount === 1 ? "" : "s"}
                    </Badge>
                  ) : (
                    <span className="work-card-quiet">No open questions</span>
                  )}
                  <span className="work-card-time">Updated {timeAgo(brief.updated_at)}</span>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
