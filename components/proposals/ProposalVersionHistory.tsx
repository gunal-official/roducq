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
 *
 * Phase 4A: rendered as a SectionCard and a shared HistoryList, so it reads
 * the same as the brief's edit history.
 */

import Link from "next/link";
import { Eye, History } from "lucide-react";

import { CanEdit } from "@/components/app-shell/CanEdit";
import { RestoreVersionButton } from "@/components/proposals/RestoreVersionButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HistoryItem, HistoryList, SectionCard } from "@/components/ui/page";
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
    <SectionCard
      id="version-history"
      icon={History}
      title="Version history"
      footer={
        <p className="text-xs text-muted-foreground">
          Snapshots are taken automatically when content changes and can’t
          be edited or deleted.
        </p>
      }
    >
      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No versions yet.</p>
      ) : (
        <HistoryList label="Proposal versions">
          {versions.map((version, i) => {
            const isCurrent = versionMatchesCurrent(version, current);
            return (
              <HistoryItem
                key={version.id}
                current={isCurrent}
                last={i === versions.length - 1}
                title={
                  <>
                    v{version.version_number}
                    <span className="font-normal text-muted-foreground">
                      {" · "}
                      {versionReasonLabel(version.reason)}
                    </span>
                  </>
                }
                badge={isCurrent ? <Badge variant="secondary">Current</Badge> : undefined}
                detail={`“${version.title}”`}
                meta={
                  <>
                    {version.created_by === null
                      ? "System"
                      : currentUserId && version.created_by === currentUserId
                        ? "You"
                        : "Teammate"}
                    {" · "}
                    {timeAgo(version.created_at)}
                  </>
                }
                actions={
                  <>
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
                  </>
                }
              />
            );
          })}
        </HistoryList>
      )}
    </SectionCard>
  );
}
