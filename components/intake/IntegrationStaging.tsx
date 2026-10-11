"use client";

/**
 * Staged Slack/Notion list for /intake/inbox — items imported from a
 * connected workspace that are NOT yet attached to a brief. Editors can
 * turn any item into a brief (source_type 'chat' for Slack, 'manual' for
 * Notion via create_brief_bundle); the item then drops out of this list
 * and appears on the brief's Sources card like any pasted source.
 * Viewers see the list read-only (requireEditor backs the button).
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FilePlus2, Hash, Loader2 } from "lucide-react";

import { createBriefFromImport } from "@/app/(app)/settings/integration-actions";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import type { IntegrationStagingItem } from "@/lib/data/integrations";
import { timeAgo } from "@/lib/utils";

export function IntegrationStaging({
  items,
  canEdit,
}: {
  items: IntegrationStagingItem[];
  canEdit: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function createBrief(importId: string) {
    setPendingId(importId);
    startTransition(async () => {
      const result = await createBriefFromImport(importId);
      setPendingId(null);
      if (result?.error) {
        toast(result.error);
        return;
      }
      toast("Brief created from this import.");
      if (result?.briefId) {
        router.push(`/briefs/${result.briefId}`);
      }
    });
  }

  return (
    <SectionCard
      icon={Hash}
      title="Staged imports"
      description="Recent Slack messages and Notion pages — create a brief from any item. Re-importing the same id is a no-op."
      tone="accent"
      bodyClassName="p-5"
      proof="staged-imports"
      className="animate-rise-in"
    >
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const label = item.provider === "notion" ? "Notion" : "Slack";
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.title || "(untitled)"}
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    {label}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.author} · {timeAgo(item.occurred_at)}
                </p>
                {item.snippet && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.snippet}
                  </p>
                )}
              </div>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingId !== null}
                  onClick={() => createBrief(item.id)}
                  aria-label={`Create a brief from "${item.title || item.author}"`}
                >
                  {pendingId === item.id ? (
                    <Loader2
                      size={16}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="animate-spin"
                    />
                  ) : (
                    <FilePlus2 size={16} strokeWidth={1.5} aria-hidden="true" />
                  )}
                  Create brief
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
