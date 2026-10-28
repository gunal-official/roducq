"use client";

/**
 * Client side of /updates — status filter chips + search over the list the
 * server page fetched. Mirrors components/plans/PlansList.tsx (Step 8);
 * updates originate from plans, so the empty state points to /plans
 * rather than offering an inline create.
 *
 * Phase D: the tab strip is replaced by the shared FilterChips control, the
 * page opens with a lavender band whose connector is drawn from the real
 * number of updates on the page, and each update is a work card whose only
 * numeric signal is its real excerpt (updates carry no counts).
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Send, Megaphone, FileText } from "lucide-react";

import { UpdateStatusBadge } from "@/components/updates/UpdateStatusBadge";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/page";
import { timeAgo } from "@/lib/utils";
import { ListStats, StatTile, StackedBar } from "@/components/ui/doc-detail";
import { UpdateTimelineArt } from "@/components/workflow/ClientWorkArt";
import { WorkBand, WorkCard } from "@/components/workflow/WorkCard";
import type { UpdateStatus, UpdateSummary } from "@/lib/types/update";

type StatusFilter = "all" | UpdateStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Marked sent" },
];

export function UpdatesList({ updates }: { updates: UpdateSummary[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: updates.length,
      draft: 0,
      sent: 0,
    };
    for (const update of updates) counts[update.status] += 1;
    return counts;
  }, [updates]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return updates.filter((update) => {
      if (statusFilter !== "all" && update.status !== statusFilter)
        return false;
      if (!q) return true;
      return (
        update.title.toLowerCase().includes(q) ||
        (update.client_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [updates, statusFilter, query]);

  const sentCount = updates.filter((u) => u.status === "sent").length;
  const draftCount = updates.filter((u) => u.status === "draft").length;

  return (
    <div>
      <WorkBand
        kicker="Updates"
        title="Keep clients in the loop"
        description="Write and save updates from plans. Drafts can be shared by link; changing the status does not send an update."
        art={<UpdateTimelineArt entries={updates.length} />}
        stats={[
          { value: updates.length, label: "updates" },
          { value: draftCount, label: "drafts" },
          { value: sentCount, label: "marked sent" },
        ]}
      />

      <ListStats
        bar={
          <StackedBar
            segments={[
              { label: "Draft", weight: draftCount, className: "bg-accent" },
              { label: "Marked sent", weight: sentCount, className: "bg-success" },
            ]}
          />
        }
      >
        <StatTile icon={Megaphone} label="Total updates" value={updates.length} hint="All time" />
        <StatTile
          icon={Send}
          label="Marked sent"
          value={sentCount}
          hint="Status only; this does not confirm delivery."
          tone={sentCount > 0 ? "success" : "muted"}
          delay={40}
        />
        <StatTile
          icon={FileText}
          label="Drafts"
          value={draftCount}
          hint="Work in progress"
          tone={draftCount > 0 ? "accent" : "muted"}
          delay={80}
        />
      </ListStats>

      <div className="work-toolbar flex flex-col gap-3 tab:flex-row tab:items-center tab:justify-between">
        <FilterChips
          label="Filter updates by status"
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
            aria-label="Search updates"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        updates.length > 0 ? (
          <EmptyState
            icon={Send}
            title="No matching updates"
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
            icon={Send}
            title="No updates yet"
            description="Updates are composed from plans — open a plan and click “Compose update” to draft one for the client."
            action={
              <Button asChild>
                <Link href="/plans" className="inline-flex min-h-11 min-w-11 items-center">
                  Open plans
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="work-grid grid gap-4 sm:grid-cols-2 desk:grid-cols-3">
          {visible.map((update) => (
            <WorkCard
              key={update.id}
              href={`/updates/${update.id}`}
              title={update.title}
              client={update.client_name}
              icon={Megaphone}
              badge={<UpdateStatusBadge status={update.status} />}
              meta={
                <>
                  {update.excerpt ? (
                    <p className="work-card-excerpt">{update.excerpt}</p>
                  ) : (
                    <p className="work-card-quiet">No content yet.</p>
                  )}
                  <span className="work-card-time">Updated {timeAgo(update.updated_at)}</span>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
