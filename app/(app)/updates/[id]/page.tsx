/**
 * /updates/:id — the client update document (Step 34(b) → Phase D): the
 * update rendered as a Forma sheet (letterhead + body), a chronological
 * connector band drawn from the update's real activity entries, stat tiles
 * (status / source plan / public link), the composer below for editors, a
 * share-link panel, markdown export, and an activity timeline.
 *
 * PHASE D LAYOUT CONTRACT
 *   phone / tablet  one column: document, then the composer, then the rail
 *                   panels (public link, details, source, activity).
 *   desktop (1024+) document + composer on the left (2fr), rail on the right
 *                   (1fr) — the same split as Briefs, Proposals and Plans.
 *
 * HOW TO TEST (locally — Supabase configured per README.md, ⚠ apply the
 * new updates migration + seed first):
 *   1. From /updates open the seeded "Week 2" (draft) update.
 *   2. Edit the title/body → "Unsaved changes" chip appears → Save:
 *      updates.title/body update and the chip clears.
 *   3. Status dropdown (Draft → Sent): updates.status updates; list badge
 *      matches after navigating back.
 *   4. "Export as markdown" downloads <title>.md built in the browser
 *      (exports last-saved content).
 *   5. "View source plan" links to /plans/<id>; from that plan page,
 *      "Compose update" creates another draft and redirects here.
 *   6. Share panel: create → copy the /share/<token> URL → open it in an
 *      INCOGNITO window: the update renders read-only. Revoke → the URL
 *      shows the generic "unavailable" state.
 *   7. Bogus or foreign ids render the "not found" state (RLS hides
 *      them identically).
 */

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Clock,
  FilePlus2,
  FileText,
  Link2,
  Megaphone,
  PenLine,
  Send,
} from "lucide-react";

import { getUpdateById } from "@/lib/data/updates";
import { getShareLinkForUpdate } from "@/lib/data/shares";
import { getTemplates } from "@/lib/data/templates";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { CanEdit } from "@/components/app-shell/CanEdit";
import { formatDate, isUuid, timeAgo } from "@/lib/utils";
import { ExportUpdateMarkdownButton } from "@/components/updates/ExportUpdateMarkdownButton";
import { DownloadPdfButton } from "@/components/ui/DownloadPdfButton";
import { ShareLinkPanel } from "@/components/updates/ShareLinkPanel";
import { UpdateComposer } from "@/components/updates/UpdateComposer";
import { UpdateStatusBadge } from "@/components/updates/UpdateStatusBadge";
import { UpdateStatusSelect } from "@/components/updates/UpdateStatusSelect";
import { UpdateTimelineArt } from "@/components/workflow/ClientWorkArt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ActivityTimeline,
  DocHeader,
  PaperCard,
  StatTile,
  type TimelineEvent,
} from "@/components/ui/doc-detail";
import { EmptyState, SectionCard } from "@/components/ui/page";

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
      <span className="min-w-0 break-words text-right">{children}</span>
    </div>
  );
}

function NotFoundState() {
  return (
    <EmptyState
      icon={Megaphone}
      title="Update not found"
      description="This update doesn’t exist — or it belongs to a workspace you’re not a member of."
      action={
        <Button asChild variant="secondary">
          <Link href="/updates" className="inline-flex min-h-11 min-w-11 items-center">
            Back to updates
          </Link>
        </Button>
      }
    />
  );
}

export default async function UpdateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    return <NotFoundState />;
  }

  const update = await getUpdateById(id);
  if (!update) {
    return <NotFoundState />;
  }

  // Templates for the composer's "Insert template" affordance, scoped to
  // the ACTIVE workspace (Step 16) like every other list read.
  const context = await getWorkspaceContext();
  const [shareLink, templates] = await Promise.all([
    getShareLinkForUpdate(id),
    context ? getTemplates(context.id) : Promise.resolve([]),
  ]);

  const events: TimelineEvent[] = [
    {
      icon: FilePlus2,
      title: "Drafted",
      detail: update.plan ? `From “${update.plan.title}”` : undefined,
      at: formatDate(update.created_at),
      tone: "accent",
    },
    ...(update.status === "sent"
      ? [
          {
            icon: Send,
            title: "Marked sent",
            detail: update.client_name ?? undefined,
            at: formatDate(update.updated_at),
            tone: "success",
          } as TimelineEvent,
        ]
      : []),
    {
      icon: Clock,
      title: "Last updated",
      at: timeAgo(update.updated_at),
      tone: "muted",
    },
  ];

  return (
    <div className="forma-core forma-updates mx-auto max-w-6xl">
      <Link href="/updates" className="work-back">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Updates
      </Link>

      <DocHeader
        icon={Megaphone}
        title={update.title}
        badges={<UpdateStatusBadge status={update.status} />}
        subtitle={update.client_name ?? undefined}
        actions={
          <DownloadPdfButton
            href={`/api/pdf/update/${update.id}`}
            label="Download PDF"
          />
        }
      />

      {/* The chronological band: one node per real activity entry. */}
      <div className="work-doc-band work-doc-band-update">
        <div className="work-doc-band-art">
          <UpdateTimelineArt entries={events.length} />
        </div>
        <div className="work-doc-band-copy">
          <p className="forma-kicker">Where this update stands</p>
          <p className="work-doc-band-note">
            {update.status === "sent"
              ? `Marked sent ${timeAgo(update.updated_at)}. Editing it afterwards changes the saved copy, not what the client already received.`
              : "Drafted and saved — it stays private until you mark it sent."}
          </p>
          <div className="work-doc-band-chips">
            <UpdateStatusBadge status={update.status} />
            <Badge variant="secondary">
              {update.body.trim().split(/\s+/).filter(Boolean).length} words
            </Badge>
            <Badge variant="secondary">
              {shareLink ? "Public link live" : "No public link"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={FileText}
          label="Status"
          value={<UpdateStatusBadge status={update.status} />}
          hint={update.status === "sent" ? "Delivered to the client" : "Not sent yet"}
          tone={update.status === "sent" ? "success" : "muted"}
        />
        <StatTile
          icon={BookOpen}
          label="Source plan"
          value={update.plan ? update.plan.title : "—"}
          hint={update.plan ? "View the plan it came from" : "Standalone update"}
          href={update.plan ? `/plans/${update.plan.id}` : undefined}
          delay={40}
        />
        <StatTile
          icon={Link2}
          label="Public link"
          value={shareLink ? "Live" : "Private"}
          hint={
            shareLink
              ? "Clients can open the read-only view"
              : "Create one to share this update"
          }
          tone={shareLink ? "success" : "muted"}
          delay={80}
        />
      </div>

      <div className="grid items-start gap-6 desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ── Left: the update document + composer ── */}
        <div className="min-w-0 space-y-6">
          <PaperCard
            letterLabel="Client update"
            letterhead={update.client_name ?? "Client update"}
            meta={formatDate(update.created_at)}
            footer={
              update.plan ? (
                <p className="text-xs text-muted-foreground">
                  From the plan{" "}
                  <Link
                    href={`/plans/${update.plan.id}`}
                    className="inline-block min-h-11 min-w-11 break-words px-0.5 py-3 text-accent underline-offset-2 hover:underline"
                  >
                    {update.plan.title}
                  </Link>
                </p>
              ) : undefined
            }
          >
            <h2 className="font-display text-xl font-bold tracking-tight">
              {update.title}
            </h2>
            <pre className="mt-4 whitespace-pre-wrap font-sans text-[15px] leading-relaxed">
              {update.body}
            </pre>
          </PaperCard>

          <CanEdit>
            <SectionCard
              id="update-composer"
              icon={PenLine}
              tone="accent"
              title="Edit update"
              description="Edit the title and body, then save — the client gets the exported markdown."
            >
              <UpdateComposer
                updateId={update.id}
                initialTitle={update.title}
                initialBody={update.body}
                templates={templates}
              />
            </SectionCard>
          </CanEdit>
        </div>

        {/* ── Right: share + metadata rail ── */}
        <div className="min-w-0 space-y-6">
          <SectionCard
            id="update-share"
            icon={Link2}
            title="Public link"
            description="Read-only update the client can open — revocable any time."
          >
            <ShareLinkPanel updateId={update.id} shareLink={shareLink} />
          </SectionCard>

          <SectionCard id="update-details" icon={Megaphone} title="Details">
            <div className="space-y-3.5">
              <MetaRow label="Status">
                <CanEdit fallback={<UpdateStatusBadge status={update.status} />}>
                  <UpdateStatusSelect updateId={update.id} status={update.status} />
                </CanEdit>
              </MetaRow>
              {update.client_name && (
                <MetaRow label="Client">{update.client_name}</MetaRow>
              )}
              <MetaRow label="Created">{formatDate(update.created_at)}</MetaRow>
              <MetaRow label="Updated">{timeAgo(update.updated_at)}</MetaRow>
              <div className="border-t border-border pt-3.5">
                <ExportUpdateMarkdownButton
                  title={update.title}
                  body={update.body}
                />
              </div>
            </div>
          </SectionCard>

          {update.plan && (
            <SectionCard id="update-source" icon={BookOpen} title="Source">
              <p className="break-words text-sm">{update.plan.title}</p>
              <Link
                href={`/plans/${update.plan.id}`}
                className="inline-flex min-h-11 min-w-11 items-center group gap-1.5 text-sm text-accent underline-offset-2 hover:underline"
              >
                View source plan
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </SectionCard>
          )}

          <SectionCard id="update-activity" icon={Clock} title="Activity">
            <ActivityTimeline events={events} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
