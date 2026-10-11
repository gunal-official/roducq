/**
 * /proposals/:id — proposal detail (Step 34(b) document treatment): the
 * generated proposal rendered as a paper document with a letterhead strip,
 * stat tiles (deliverables / budget / source), a "next step" CTA card that
 * turns the proposal into a delivery plan, and an activity timeline.
 *
 * PHASE 4A LAYOUT CONTRACT
 *   phone / tablet  the proposal document first, then the rail (next step,
 *                   details, source, activity, version history).
 *   desktop (1024+) the document on the left (2fr), the rail on the right (1fr).
 *   The PDF export sits in the header on every width.
 *
 * HOW TO TEST (locally — Supabase configured per README.md, seed loaded):
 *   1. From /proposals open the seeded "Brightloop Co." proposal.
 *   2. Status dropdown (Draft → Sent → Accepted / Declined): proposals.status
 *      updates; back on /proposals the card badge matches.
 *   3. "Source" card links to /briefs/<id> of the brief it was generated
 *      from; on that brief page, "Generate proposal" creates another draft
 *      and redirects here.
 *   4. "Generate delivery plan" (editors only) creates the plan and
 *      redirects to /plans/<id>.
 *   5. Bogus or foreign-workspace ids render the "not found" state (RLS
 *      hides them identically — no cross-tenant leakage).
 *   6. "Version history" (Queue #7): changing the status appends a new
 *      version capturing the displaced state; "View" opens the read-only
 *      snapshot at /proposals/<id>/versions/<versionId>; editors can
 *      "Restore" (two-click confirm) — the pre-restore state is saved as
 *      a new version first, so nothing is ever lost.
 */

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  FilePlus2,
  FileText,
  ListChecks,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";

import {
  getProposalById,
  getProposalVersions,
} from "@/lib/data/proposals";
import { createClient } from "@/lib/supabase/server";
import { formatDate, isUuid, timeAgo } from "@/lib/utils";
import { GeneratePlanButton } from "@/components/proposals/GeneratePlanButton";
import { CanEdit } from "@/components/app-shell/CanEdit";
import { ProposalContent } from "@/components/proposals/ProposalContent";
import { ProposalStatusBadge } from "@/components/proposals/ProposalStatusBadge";
import { ProposalVersionHistory } from "@/components/proposals/ProposalVersionHistory";
import { DownloadPdfButton } from "@/components/ui/DownloadPdfButton";
import { ProposalStatusSelect } from "@/components/proposals/ProposalStatusSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ActivityTimeline,
  DocHeader,
  PaperCard,
  StatTile,
  type TimelineEvent,
} from "@/components/ui/doc-detail";
import { SectionCard } from "@/components/ui/page";

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

/** A rail panel: the shared SectionCard with the rail's spacing. */
function RailCard({
  id,
  icon,
  title,
  children,
}: {
  id?: string;
  icon: React.ComponentProps<typeof SectionCard>["icon"];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <SectionCard id={id} icon={icon} title={title} className="animate-rise-in">
      <div className="space-y-3.5">{children}</div>
    </SectionCard>
  );
}

function NotFoundState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <Badge variant="secondary">Not found</Badge>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Proposal not found
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This proposal doesn’t exist — or it belongs to a workspace you’re
          not a member of.
        </p>
      </div>
      <Button asChild variant="secondary">
        <Link href="/proposals" className="inline-flex min-h-11 min-w-11 items-center">Back to proposals</Link>
      </Button>
    </div>
  );
}

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    return <NotFoundState />;
  }

  const proposal = await getProposalById(id);
  if (!proposal) {
    return <NotFoundState />;
  }

  // History is a separate member-scoped read (viewers included) — a
  // stranger never reaches it because the proposal read above hid first.
  const versions = await getProposalVersions(proposal.id);

  // For "You" / "Teammate" attribution in the version history (brief
  // history precedent).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const doneCount = proposal.deliverables.filter((d) => d.checked).length;
  const budgetCaptured = !!proposal.budget_timeline?.trim();
  const decided =
    proposal.status === "accepted" ? "accepted" : proposal.status === "declined" ? "declined" : null;

  const events: TimelineEvent[] = [
    {
      icon: FilePlus2,
      title: "Generated from brief",
      detail: proposal.brief ? proposal.brief.title : undefined,
      at: formatDate(proposal.created_at),
      tone: "accent",
    },
    ...(decided
      ? [
          {
            icon: decided === "accepted" ? Check : X,
            title: decided === "accepted" ? "Accepted" : "Declined",
            detail: "Recorded on the proposal",
            at: formatDate(proposal.updated_at),
            tone: decided === "accepted" ? "success" : "error",
          } as TimelineEvent,
        ]
      : []),
    {
      icon: Clock,
      title: "Last updated",
      at: timeAgo(proposal.updated_at),
      tone: "muted",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/proposals"
        className="mb-3 inline-flex min-h-11 min-w-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Proposals
      </Link>

      <DocHeader
        icon={FileText}
        title={proposal.title}
        badges={<ProposalStatusBadge status={proposal.status} />}
        subtitle={proposal.client_name ?? undefined}
        actions={<DownloadPdfButton href={`/api/pdf/proposal/${proposal.id}`} />}
      />

      {/* Stat tiles */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={ListChecks}
          label="Deliverables"
          value={`${doneCount} of ${proposal.deliverables.length} done`}
          hint={
            proposal.deliverables.length > 0
              ? "Agreed scope items"
              : "None captured"
          }
          tone={doneCount > 0 ? "accent" : "muted"}
        />
        <StatTile
          icon={Wallet}
          label="Budget & timeline"
          value={budgetCaptured ? "Captured" : "Not captured"}
          hint={
            budgetCaptured
              ? proposal.budget_timeline!.slice(0, 64) +
                (proposal.budget_timeline!.length > 64 ? "…" : "")
              : "Add when generating from the brief"
          }
          tone={budgetCaptured ? "success" : "muted"}
        />
        <StatTile
          icon={BookOpen}
          label="Source brief"
          value={proposal.brief ? proposal.brief.title : "—"}
          hint={proposal.brief ? "View the brief it came from" : undefined}
          href={proposal.brief ? `/briefs/${proposal.brief.id}` : undefined}
          delay={80}
        />
      </div>

      <div className="grid items-start gap-6 desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ── Left: the proposal document ── */}
        <PaperCard
          letterLabel="Proposal"
          letterhead={proposal.client_name ?? "Proposal"}
          meta={formatDate(proposal.created_at)}
          footer={
            proposal.brief ? (
              <p className="text-xs text-muted-foreground">
                Generated from the brief{" "}
                <Link
                  href={`/briefs/${proposal.brief.id}`}
                  className="inline-block min-h-11 min-w-11 break-words px-0.5 py-3 text-accent underline-offset-2 hover:underline"
                >
                  {proposal.brief.title}
                </Link>
              </p>
            ) : undefined
          }
        >
          <ProposalContent
            budget_timeline={proposal.budget_timeline}
            deliverables={proposal.deliverables}
          />
        </PaperCard>

        {/* ── Right: action + metadata rail ── */}
        <div className="space-y-4">
          <SectionCard
            id="proposal-next-step"
            icon={Sparkles}
            tone="accent"
            title="Next step"
            className="animate-rise-in"
          >
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Turn this proposal into a delivery plan with tasks your
                client can follow.
              </p>
              <CanEdit>
                <GeneratePlanButton proposalId={proposal.id} />
              </CanEdit>
            </div>
          </SectionCard>

          <RailCard id="proposal-details" icon={FileText} title="Details">
            <MetaRow label="Status">
              <CanEdit
                fallback={<ProposalStatusBadge status={proposal.status} />}
              >
                <ProposalStatusSelect
                  proposalId={proposal.id}
                  status={proposal.status}
                />
              </CanEdit>
            </MetaRow>
            {proposal.client_name && (
              <MetaRow label="Client">{proposal.client_name}</MetaRow>
            )}
            <MetaRow label="Created">{formatDate(proposal.created_at)}</MetaRow>
            <MetaRow label="Updated">{timeAgo(proposal.updated_at)}</MetaRow>
          </RailCard>

          {proposal.brief && (
            <RailCard id="proposal-source" icon={BookOpen} title="Source">
              <p className="break-words text-sm">{proposal.brief.title}</p>
              <Link
                href={`/briefs/${proposal.brief.id}`}
                className="inline-flex min-h-11 min-w-11 items-center group gap-1.5 text-sm text-accent underline-offset-2 hover:underline"
              >
                View source brief
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </RailCard>
          )}

          <RailCard id="proposal-activity" icon={Clock} title="Activity">
            <ActivityTimeline events={events} />
          </RailCard>

          <ProposalVersionHistory
            proposalId={proposal.id}
            versions={versions}
            current={proposal}
            currentUserId={user?.id ?? null}
          />
        </div>
      </div>
    </div>
  );
}
