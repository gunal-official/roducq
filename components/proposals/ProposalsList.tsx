"use client";

/**
 * Client side of /proposals — status filter chips + search over the list the
 * server page fetched. Mirrors components/briefs/BriefsList.tsx; proposals
 * originate from briefs, so the empty state points to /briefs rather than
 * offering an inline create.
 *
 * Phase 4A: shared FilterChips (wraps, 44px targets) and EmptyState.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Search, Hourglass, CheckCircle2, ListChecks } from "lucide-react";

import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/page";
import { ListStats, StatTile } from "@/components/ui/doc-detail";
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

function ProposalCard({ proposal }: { proposal: ProposalSummary }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="space-y-1 border-b border-border px-5 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/proposals/${proposal.id}`}
              className="inline-flex min-h-11 min-w-11 items-center break-words font-display text-base font-semibold leading-snug underline-offset-2 hover:underline"
            >
              {proposal.title}
            </Link>
            {proposal.client_name && (
              <p className="truncate text-sm text-muted-foreground">
                {proposal.client_name}
              </p>
            )}
          </div>
          <ProposalStatusBadge
            status={proposal.status}
            className="shrink-0"
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
        {proposal.deliverablesTotal > 0 ? (
          <Badge variant="secondary">
            {proposal.deliverablesDone}/{proposal.deliverablesTotal}{" "}
            deliverable{proposal.deliverablesTotal === 1 ? "" : "s"} done
          </Badge>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted-foreground">
          Updated {timeAgo(proposal.updated_at)}
        </span>
      </CardContent>
    </Card>
  );
}

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

      <div className="mb-5 flex flex-col gap-3 tab:flex-row tab:items-center tab:justify-between">
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </div>
  );
}
