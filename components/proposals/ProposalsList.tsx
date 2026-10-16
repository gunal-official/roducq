"use client";

/**
 * Client side of /proposals — status filter chips + search over the list the
 * server page fetched. Mirrors components/briefs/BriefsList.tsx; proposals
 * originate from briefs, so the empty state points to /briefs rather than
 * offering an inline create.
 *
 * Phase D: a lavender showcase band with the real document drawing and real
 * counts, a tinted filter plane, and one Forma work card per proposal with a
 * real scope-completion rail. The 4A contracts are unchanged: shared
 * FilterChips (wraps, 44px targets) and the shared EmptyState.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Search, Hourglass, CheckCircle2, ListChecks } from "lucide-react";

import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/page";
import { ListStats, StatTile } from "@/components/ui/doc-detail";
import { ProposalDocumentArt } from "@/components/workflow/ClientWorkArt";
import { WorkBand, WorkCard } from "@/components/workflow/WorkCard";
import { timeAgo } from "@/lib/utils";
import type { ProposalStatus, ProposalSummary } from "@/lib/types/proposal";

type StatusFilter = "all" | ProposalStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

export function ProposalsList({ proposals }: { proposals: ProposalSummary[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: proposals.length,
      draft: 0,
      sent: 0,
      accepted: 0,
      declined: 0,
    };
    for (const proposal of proposals) counts[proposal.status] += 1;
    return counts;
  }, [proposals]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return proposals.filter((proposal) => {
      if (statusFilter !== "all" && proposal.status !== statusFilter)
        return false;
      if (!q) return true;
      return (
        proposal.title.toLowerCase().includes(q) ||
        (proposal.client_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [proposals, statusFilter, query]);

  const inPlay = proposals.filter((p) => p.status === "draft" || p.status === "sent").length;
  const accepted = proposals.filter((p) => p.status === "accepted").length;
  const deliverablesDone = proposals.reduce((n, p) => n + p.deliverablesDone, 0);
  const deliverablesTotal = proposals.reduce((n, p) => n + p.deliverablesTotal, 0);

  return (
    <div>
      <WorkBand
        kicker="Proposals"
        title="Quotes that read like documents"
        description="Each proposal is generated from a brief, then reviewed, priced and sent. Every status change files the displaced version, so nothing you wrote is ever lost."
        art={<ProposalDocumentArt />}
        stats={[
          { value: proposals.length, label: "proposals" },
          { value: inPlay, label: "in play" },
          { value: accepted, label: "accepted" },
        ]}
      />

      <ListStats cols={4}>
        <StatTile icon={FileText} label="Total proposals" value={proposals.length} hint="All time" />
        <StatTile
          icon={Hourglass}
          label="In play"
          value={inPlay}
          hint="Draft or sent"
          tone={inPlay > 0 ? "accent" : "muted"}
          delay={40}
        />
        <StatTile
          icon={CheckCircle2}
          label="Accepted"
          value={accepted}
          hint="Won work"
          tone={accepted > 0 ? "success" : "muted"}
          delay={80}
        />
        <StatTile
          icon={ListChecks}
          label="Scope done"
          value={`${deliverablesDone}/${deliverablesTotal}`}
          hint="Deliverables checked"
          delay={120}
        />
      </ListStats>

      <div className="work-toolbar flex flex-col gap-3 tab:flex-row tab:items-center tab:justify-between">
        <FilterChips
          label="Filter proposals by status"
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
            aria-label="Search proposals"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        proposals.length > 0 ? (
          <EmptyState
            icon={FileText}
            title="No matching proposals"
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
            title="No proposals yet"
            description="Proposals are generated from briefs — open a brief and click “Generate proposal” to draft one."
            action={
              <Button asChild>
                <Link href="/briefs" className="inline-flex min-h-11 min-w-11 items-center">
                  Open briefs
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="work-grid grid gap-4 sm:grid-cols-2 desk:grid-cols-3">
          {visible.map((proposal) => (
            <WorkCard
              key={proposal.id}
              href={`/proposals/${proposal.id}`}
              title={proposal.title}
              client={proposal.client_name}
              icon={FileText}
              badge={<ProposalStatusBadge status={proposal.status} />}
              progress={
                proposal.deliverablesTotal > 0
                  ? {
                      label: "Scope of work",
                      done: proposal.deliverablesDone,
                      total: proposal.deliverablesTotal,
                    }
                  : null
              }
              meta={<span className="work-card-time">Updated {timeAgo(proposal.updated_at)}</span>}
            />
          ))}
        </div>
      )}
    </div>
  );
}
