/**
 * /proposals/:id/versions/:versionId — the read-only snapshot view for
 * proposal version history (Queue #7). Renders ONE frozen version with
 * the same document treatment as the live proposal (shared
 * ProposalContent), clearly marked read-only: no status select, no PDF
 * export (PDF always exports the CURRENT proposal — out of scope here),
 * no edit affordances. Editors get Restore (two-click confirm, inside
 * RestoreVersionButton); viewers get the identical page minus that
 * button — RLS already governs who can even reach the row.
 *
 * HOW TO TEST (locally — Supabase configured per README.md, seed loaded):
 *   1. Open a proposal, change its status, then open "Version history" →
 *      the displaced state appears as a new version.
 *   2. "View" on that version → this page shows the OLD content exactly,
 *      with the read-only banner.
 *   3. "Restore" (editors) returns the proposal to this snapshot and the
 *      history card gains a 'Before a restore' capture of what WAS live.
 *   4. A version id from a different proposal, or a bogus id, renders the
 *      "not found" state (same RLS indistinguishability as the detail
 *      page — no cross-workspace leakage).
 */

import Link from "next/link";
import { ArrowLeft, Clock, FileText, History, Lock } from "lucide-react";

import { CanEdit } from "@/components/app-shell/CanEdit";
import { ProposalContent } from "@/components/proposals/ProposalContent";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import { RestoreVersionButton } from "@/components/proposals/RestoreVersionButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocHeader, PaperCard } from "@/components/ui/doc-detail";
import { SectionCard } from "@/components/ui/page";
import {
  getProposalById,
  getProposalVersionById,
} from "@/lib/data/proposals";
import { createClient } from "@/lib/supabase/server";
import { versionMatchesCurrent, versionReasonLabel } from "@/lib/proposal-versions";
import { formatDate, isUuid, timeAgo } from "@/lib/utils";

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
      <span className="text-right">{children}</span>
    </div>
  );
}

function NotFoundState({ proposalId }: { proposalId: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <Badge variant="secondary">Not found</Badge>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Version not found
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This version doesn’t exist, belongs to a different proposal — or
          to a workspace you’re not a member of.
        </p>
      </div>
      <Button asChild variant="secondary">
        <Link
          href={isUuid(proposalId) ? `/proposals/${proposalId}` : "/proposals"}
          className="inline-flex min-h-11 min-w-11 items-center"
        >
          Back
        </Link>
      </Button>
    </div>
  );
}

export default async function ProposalVersionPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>;
}) {
  const { id, versionId } = await params;
  if (!isUuid(id) || !isUuid(versionId)) {
    return <NotFoundState proposalId={id} />;
  }

  // The proposal must be visible (RLS) AND the version must belong to
  // it — a version id from another proposal renders "not found", so one
  // proposal's history can never be read behind another's URL.
  const [proposal, version] = await Promise.all([
    getProposalById(id),
    getProposalVersionById(versionId),
  ]);
  if (!proposal || !version || version.proposal_id !== proposal.id) {
    return <NotFoundState proposalId={id} />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isCurrent = versionMatchesCurrent(version, proposal);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/proposals/${proposal.id}`}
        className="mb-3 inline-flex min-h-11 min-w-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to proposal
      </Link>

      <DocHeader
        icon={FileText}
        title={version.title}
        badges={
          <>
            <Badge variant="secondary">v{version.version_number}</Badge>
            <ProposalStatusBadge status={version.status} />
          </>
        }
        subtitle={version.client_name ?? undefined}
      />

      {/* Read-only banner */}
      <div className="mb-6 flex items-start gap-3 rounded-surface border border-border bg-muted/40 px-4 py-3">
        <span className="icon-chip icon-chip-muted h-8 w-8 shrink-0">
          <Lock className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="text-sm">
          <p className="font-medium">
            Read-only snapshot — {versionReasonLabel(version.reason)},
            captured {formatDate(version.created_at)} ({timeAgo(version.created_at)}).
          </p>
          <p className="mt-0.5 text-muted-foreground">
            Versions can’t be edited or deleted. PDF export always uses the
            current proposal.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ── Left: the frozen document ── */}
        <PaperCard
          letterLabel="Proposal"
          letterhead={version.client_name ?? "Proposal"}
          meta={`v${version.version_number} · ${formatDate(version.created_at)}`}
        >
          <ProposalContent
            budget_timeline={version.budget_timeline}
            deliverables={version.deliverables}
          />
        </PaperCard>

        {/* ── Right: metadata + restore rail ── */}
        <div className="space-y-4">
          {!isCurrent && (
            <SectionCard
              id="version-restore"
              icon={History}
              tone="accent"
              title="Restore"
              className="animate-rise-in"
            >
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Make this version the proposal’s content. What’s live
                  right now is saved as a new version first — nothing is
                  lost.
                </p>
                <CanEdit>
                  <RestoreVersionButton
                    proposalId={proposal.id}
                    versionId={version.id}
                    versionNumber={version.version_number}
                    variant="secondary"
                    className="w-full"
                  />
                </CanEdit>
              </div>
            </SectionCard>
          )}

          <SectionCard
            id="version-snapshot"
            icon={Clock}
            title="Snapshot"
            className="animate-rise-in"
          >
            <div className="space-y-3.5">
              <MetaRow label="Version">v{version.version_number}</MetaRow>
              <MetaRow label="Captured">
                {formatDate(version.created_at)}
              </MetaRow>
              <MetaRow label="Reason">
                {versionReasonLabel(version.reason)}
              </MetaRow>
              <MetaRow label="Captured by">
                {version.created_by === null
                  ? "System"
                  : user && version.created_by === user.id
                    ? "You"
                    : "Teammate"}
              </MetaRow>
              {isCurrent && (
                <MetaRow label="Status now">
                  <Badge variant="secondary">Current content</Badge>
                </MetaRow>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
