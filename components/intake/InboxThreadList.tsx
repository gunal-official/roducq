"use client";

/**
 * /intake/inbox thread list (Step 12 → Phase 3 page redesign). One card
 * per brief that has at least one source: the brief's sources render
 * oldest-first as a running thread of chat bubbles (shared SourceBubbles),
 * with per-source type / sender / timestamp headers, and an inline
 * "Thread a follow-up" composer (AddSourceForm) that appends a real
 * brief_sources row to the thread. Threads arrive pre-sorted server-side
 * (most recently active first).
 *
 * Phase 3 adds the phone-first single column (one card per row, no
 * side-by-side squeeze) and an accessible source-type filter row whose
 * chips only ever appear for source types that actually exist in this
 * workspace — no empty filters, no invented counts.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { EmptyState, SectionCard } from "@/components/ui/page";
import { timeAgo } from "@/lib/utils";
import { AddSourceForm } from "@/components/intake/AddSourceForm";
import { SourceBubbles } from "@/components/intake/SourceBubbles";
import type { InboxThread } from "@/lib/types/inbox";

/** Canonical source-type order for the filter row (matches AddSourceForm). */
const SOURCE_TYPE_ORDER = ["email", "chat", "call_notes", "manual"] as const;

const SOURCE_TYPE_LABELS: Record<string, string> = {
  email: "Email",
  chat: "Chat",
  call_notes: "Call notes",
  manual: "Manual",
};

type FilterValue = "all" | (typeof SOURCE_TYPE_ORDER)[number];

export function InboxThreadList({ threads }: { threads: InboxThread[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");

  // Only source types present in this workspace get a chip.
  const options = useMemo(() => {
    const present = new Set(
      threads.flatMap((t) => t.sources.map((s) => s.source_type))
    );
    const types = SOURCE_TYPE_ORDER.filter((t) => present.has(t));
    return [
      { value: "all" as const, label: "All", count: threads.length },
      ...types.map((t) => ({
        value: t as FilterValue,
        label: SOURCE_TYPE_LABELS[t] ?? t,
        count: threads.filter((thread) =>
          thread.sources.some((s) => s.source_type === t)
        ).length,
      })),
    ];
  }, [threads]);

  // A filter can outlive its data (a source removed elsewhere) — fall back.
  const active: FilterValue = options.some((o) => o.value === filter)
    ? filter
    : "all";

  const visible =
    active === "all"
      ? threads
      : threads.filter((t) =>
          t.sources.some((s) => s.source_type === active)
        );

  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No sources yet"
        description="Client messages you paste appear here as threads — start from Intake."
        action={
          <Button asChild size="sm" variant="secondary">
            <Link
              href="/intake"
              className="inline-flex min-h-11 min-w-11 items-center"
            >
              Go to Intake
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <FilterChips
        label="Filter threads by source type"
        value={active}
        options={options}
        onChange={setFilter}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Nothing in this filter"
          description={`No thread carries a ${SOURCE_TYPE_LABELS[active] ?? active} source yet.`}
          tone="muted"
        />
      ) : (
        <div className="space-y-6" aria-live="polite">
          {visible.map((thread) => (
            <SectionCard
              key={thread.briefId}
              icon={MessageSquare}
              tone="accent"
              title={
                <Link
                  href={`/briefs/${thread.briefId}`}
                  className="inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-accent"
                >
                  {thread.title}
                </Link>
              }
              description={thread.clientName ?? undefined}
              actions={
                <Badge variant="secondary">
                  {thread.sources.length}{" "}
                  {thread.sources.length === 1 ? "source" : "sources"}
                </Badge>
              }
              bodyClassName="space-y-5 bg-muted/40 p-5"
            >
              {thread.sources.map((source) => (
                <div key={source.id}>
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {SOURCE_TYPE_LABELS[source.source_type] ??
                        source.source_type}
                    </Badge>
                    {typeof source.metadata.from === "string" && (
                      <span className="truncate">
                        {String(source.metadata.from)}
                      </span>
                    )}
                    <span>{timeAgo(source.created_at)}</span>
                  </div>
                  <SourceBubbles text={source.raw_content} />
                </div>
              ))}

              <AddSourceForm briefId={thread.briefId} />
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
