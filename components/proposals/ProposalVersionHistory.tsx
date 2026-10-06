/**
 * "Version history" card on the proposal detail page (Queue #7): every
 * immutable snapshot, NEWEST first. Each row shows what the version
 * captures (v N · reason · who/when · its title), a "View" link to the
 * read-only snapshot page, and — editors only — a "Restore" control with
 * the two-click confirm (the existing two-click wrapper lives inside
 * RestoreVersionButton). A snapshot that IS the current content shows a
 * "Current" mark instead of restore (restoring it would be a no-op; the
 * RPC would refuse it anyway).
 *
 * Viewers see the same list without the Restore affordance: RLS lets
 * every member read history, requireEditor()/the RPC gate restoring.
 */

import Link from "next/link";
import { Eye, History } from "lucide-react";

import { CanEdit } from "@/components/app-shell/CanEdit";
import { RestoreVersionButton } from "@/components/proposals/RestoreVersionButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { versionMatchesCurrent, versionReasonLabel } from "@/lib/proposal-versions";
import type {
  ProposalVersion,
  ProposalVersionContent,
} from "@/lib/types/proposal";
import { timeAgo } from "@/lib/utils";

export function ProposalVersionHistory({
  proposalId,
  versions,
  current,
  currentUserId,
}: {
  proposalId: string;
  /** Newest first (getProposalVersions' order). */
  versions: ProposalVersion[];
  /** The proposal's live content — for the "Current" mark. */
  current: ProposalVersionContent;
  /** For "You" / "Teammate" attribution (brief history precedent). */
  currentUserId: string | null;
}) {
  return (
    <Card className="animate-rise-in" style={{ animationDelay: "120ms" }}>
      <CardHeader className="flex-row items-center gap-2.5 space-y-0 border-b border-border px-5 py-3.5">
        <span className="icon-chip icon-chip-muted h-8 w-8">
          <History className="h-4 w-4" aria-hidden="true" />
        </span>
        <CardTitle className="text-base">Version history</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <ul className="space-y-0">
          {versions.map((version, i) => {
            const isCurrent = versionMatchesCurrent(version, current);
            return (
              <li
                key={version.id}
                className="relative flex gap-3 pb-5 last:pb-0"
              >
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {i < versions.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-snug">
                    <span className="font-medium">
                      v{version.version_number}
                    </span>
                    <span className="text-muted-foreground">
                      {versionReasonLabel(version.reason)}
                    </span>
                    {isCurrent && (
                      <Badge variant="secondary">Current</Badge>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    “{version.title}”
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {version.created_by === null
                      ? "System"
                      : currentUserId && version.created_by === currentUserId
                        ? "You"
                        : "Teammate"}
                    {" · "}
                    {timeAgo(version.created_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        href={`/proposals/${proposalId}/versions/${version.id}`}
                      >
                        <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        View
                      </Link>
                    </Button>
                    {!isCurrent && (
                      <CanEdit>
                        <RestoreVersionButton
                          proposalId={proposalId}
                          versionId={version.id}
                          versionNumber={version.version_number}
                        />
                      </CanEdit>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {versions.length === 0 && (
          <p className="text-sm text-muted-foreground">No versions yet.</p>
        )}
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          Snapshots are taken automatically when content changes and can’t
          be edited or deleted.
        </p>
      </CardContent>
    </Card>
  );
}
