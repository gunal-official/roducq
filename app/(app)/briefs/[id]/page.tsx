/**
 * /briefs/:id — brief detail view with question resolution and status changes.
 *
 * PHASE 4A LAYOUT CONTRACT
 *   phone / tablet  one column: the brief document first, then the side panels
 *                   (details & actions, sources, history).
 *   desktop (1024+) the brief reads on the left (2fr) with its side panels on
 *                   the right (1fr), so the status control and "Generate
 *                   proposal" sit in the same place on every brief.
 *   Open questions carry the accent tint (they need an answer); resolved
 *   ones are quiet.
 *
 * HOW TO TEST (locally — Supabase configured per README.md):
 *   1. Apply migrations + run supabase/seed.sql, log in, then open:
 *      /briefs/00000000-0000-0000-0000-000000000010
 *      ("Brightloop Co. — Brand Identity Refresh" — 1 open, 2 resolved
 *      questions, source email, 2 history rows)
 *   2. Status dropdown (Draft → In review → Approved): briefs.status
 *      updates and a 'status_changed' row appears in the History card
 *      (DB trigger writes it).
 *   3. Click Resolve on the open question → answer + answered_by → the
 *      question moves to the Resolved group with its answer, and the
 *      History card gains a 'question_resolved' entry.
 *   4. Unknown or foreign-workspace ids render the "not found" state
 *      (RLS hides them identically — no cross-tenant leakage).
 */

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  FileText,
  HelpCircle,
  History,
  BookOpen,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getBriefById } from "@/lib/data/briefs";
import { formatDate, isUuid, timeAgo } from "@/lib/utils";
import { GenerateProposalButton } from "@/components/briefs/GenerateProposalButton";
import { CanEdit } from "@/components/app-shell/CanEdit";
import { ResolveQuestionDialog } from "@/components/briefs/ResolveQuestionDialog";
import { StatusBadge } from "@/components/briefs/StatusBadge";
import { StatusSelect } from "@/components/briefs/StatusSelect";
import { AddSourceForm } from "@/components/intake/AddSourceForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocHeader } from "@/components/ui/doc-detail";
import { EmptyState, HistoryItem, HistoryList, SectionCard } from "@/components/ui/page";
import type { BriefQuestion } from "@/lib/types/brief";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

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
      <span className="min-w-0 text-right break-words">{children}</span>
    </div>
  );
}

function NotFoundState() {
  return (
    <EmptyState
      icon={ClipboardList}
      title="Brief not found"
      description="This brief doesn’t exist — or it belongs to a workspace you’re not a member of."
      action={
        <Button asChild variant="secondary">
          <Link href="/briefs" className="inline-flex min-h-11 min-w-11 items-center">
            Back to briefs
          </Link>
        </Button>
      }
    />
  );
}

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    return <NotFoundState />;
  }

  const brief = await getBriefById(id);
  if (!brief) {
    return <NotFoundState />;
  }

  // For the "Answered by" default and history attribution ("You").
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };
  const userName = profile?.full_name ?? null;

  const openQuestions = brief.questions.filter((q) => q.status === "open");
  const resolvedQuestions = brief.questions.filter(
    (q) => q.status === "resolved"
  );
  const doneCount = brief.deliverables.filter((d) => d.checked).length;

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/briefs"
        className="mb-3 inline-flex min-h-11 min-w-11 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Briefs
      </Link>

      <DocHeader
        icon={ClipboardList}
        title={brief.title}
        badges={<StatusBadge status={brief.status} />}
        subtitle={brief.client_name ?? undefined}
      />

      <div className="grid items-start gap-6 desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ── Left: the brief document + clarifying questions ── */}
        <div className="min-w-0 space-y-6">
          <SectionCard
            id="brief-details"
            icon={FileText}
            title="Brief details"
            description="Structured output from the intake source."
          >
            <div className="space-y-6">
              <div className="space-y-1.5">
                <FieldLabel>Objective</FieldLabel>
                {brief.objective ? (
                  <p className="max-w-prose break-words text-[15px] leading-relaxed">
                    {brief.objective}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    No objective captured.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel>Deliverables</FieldLabel>
                  <span className="text-xs text-muted-foreground">
                    {doneCount} of {brief.deliverables.length} done
                  </span>
                </div>
                <ul className="space-y-1 rounded-control border border-border bg-muted/40 p-2">
                  {brief.deliverables.length === 0 ? (
                    <li className="px-1.5 py-1 text-sm text-muted-foreground">
                      No deliverables captured.
                    </li>
                  ) : (
                    brief.deliverables.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-start gap-2.5 rounded-control px-1.5 py-1.5"
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                            d.checked
                              ? "border-success bg-success text-success-foreground"
                              : "border-border bg-card"
                          }`}
                        >
                          {d.checked && (
                            <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden="true" />
                          )}
                        </span>
                        <span
                          className={
                            d.checked
                              ? "break-words text-sm text-muted-foreground line-through"
                              : "break-words text-sm"
                          }
                        >
                          {d.text}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Budget & timeline</FieldLabel>
                {brief.budget_timeline ? (
                  <p className="max-w-prose whitespace-pre-line break-words text-[15px] leading-relaxed">
                    {brief.budget_timeline}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    No budget or dates captured.
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="brief-questions"
            icon={HelpCircle}
            title="Clarifying questions"
            description="Answer these before the proposal goes out."
            actions={
              <div className="flex flex-wrap gap-1.5">
                <Badge className="border-accent bg-accent-soft text-accent">
                  {openQuestions.length} open
                </Badge>
                <Badge variant="secondary">{resolvedQuestions.length} resolved</Badge>
              </div>
            }
          >
            <div className="space-y-6">
              <section aria-labelledby="questions-open">
                <h3 id="questions-open" className="sr-only">
                  Open questions
                </h3>
                <FieldLabel>Open</FieldLabel>
                {openQuestions.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nothing left to clarify — all questions are resolved.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {openQuestions.map((q: BriefQuestion) => (
                      <li
                        key={q.id}
                        className="rounded-control border border-accent bg-accent-soft p-3.5"
                      >
                        <div className="flex flex-col gap-3 tab:flex-row tab:items-start tab:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium leading-snug">
                              {q.question_text}
                            </p>
                            {q.context_note && (
                              <p className="mt-1 break-words text-xs italic leading-snug text-muted-foreground">
                                {q.context_note}
                              </p>
                            )}
                          </div>
                          <CanEdit>
                            <ResolveQuestionDialog
                              briefId={brief.id}
                              questionId={q.id}
                              questionText={q.question_text}
                              defaultAnsweredBy={
                                userName ? `${userName} (you)` : ""
                              }
                            />
                          </CanEdit>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="questions-resolved">
                <h3 id="questions-resolved" className="sr-only">
                  Resolved questions
                </h3>
                <FieldLabel>Resolved</FieldLabel>
                {resolvedQuestions.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No resolved questions yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {resolvedQuestions.map((q) => (
                      <li
                        key={q.id}
                        className="rounded-control border border-border bg-muted/40 p-3.5"
                      >
                        <p className="break-words text-sm font-medium leading-snug">
                          {q.question_text}
                        </p>
                        <p className="mt-1.5 break-words text-sm leading-snug text-text">
                          {q.answer_text}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {q.answered_by}
                          {q.resolved_at
                            ? ` · ${timeAgo(q.resolved_at)}`
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </SectionCard>
        </div>

        {/* ── Right: status & actions, sources, history ── */}
        <aside className="min-w-0 space-y-6" aria-label="Brief details and actions">
          <SectionCard
            id="brief-meta"
            icon={FileText}
            title="Details"
          >
            <div className="space-y-3.5">
              <MetaRow label="Status">
                <CanEdit fallback={<StatusBadge status={brief.status} />}>
                  <StatusSelect briefId={brief.id} status={brief.status} />
                </CanEdit>
              </MetaRow>
              {brief.client_name && (
                <MetaRow label="Client">{brief.client_name}</MetaRow>
              )}
              <MetaRow label="Created">{formatDate(brief.created_at)}</MetaRow>
              <MetaRow label="Updated">{timeAgo(brief.updated_at)}</MetaRow>
              <MetaRow label="Owner">
                {brief.owner_id && user && brief.owner_id === user.id
                  ? `You${userName ? ` (${userName})` : ""}`
                  : "Team"}
              </MetaRow>
              <div className="border-t border-border pt-4">
                <CanEdit>
                  <GenerateProposalButton briefId={brief.id} />
                </CanEdit>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="brief-sources"
            icon={BookOpen}
            title="Sources"
            description="Original text, stored verbatim."
            actions={<Badge variant="secondary">{brief.sources.length}</Badge>}
          >
            <div className="space-y-4">
              {brief.sources.map((s) => (
                <div key={s.id} className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{s.source_type}</Badge>
                    {typeof s.metadata.from === "string" && (
                      <span className="break-all text-xs text-muted-foreground">
                        {String(s.metadata.from)}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(s.created_at)}
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-control border border-border bg-muted/40 p-3">
                    <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-text">
                      {s.raw_content}
                    </pre>
                  </div>
                </div>
              ))}
              {brief.sources.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No sources attached.
                </p>
              )}
              {/* Step 12: thread a follow-up source onto this brief — the
                  same composer as /intake/inbox; the reply lands here AND
                  in the inbox thread for this brief. */}
              <CanEdit>
                <AddSourceForm briefId={brief.id} />
              </CanEdit>
            </div>
          </SectionCard>

          <SectionCard
            id="brief-history"
            icon={History}
            title="History"
            description="Every change to this brief, newest first."
          >
            {brief.edit_history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <HistoryList label="Brief history">
                {brief.edit_history.map((entry, i) => (
                  <HistoryItem
                    key={entry.id}
                    title={entry.description}
                    meta={
                      <>
                        {entry.user_id === null
                          ? "AI / system"
                          : user && entry.user_id === user.id
                            ? "You"
                            : "Teammate"}
                        {" · "}
                        {timeAgo(entry.created_at)}
                      </>
                    }
                    last={i === brief.edit_history.length - 1}
                  />
                ))}
              </HistoryList>
            )}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
