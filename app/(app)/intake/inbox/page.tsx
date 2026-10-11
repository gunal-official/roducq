/**
 * /intake/inbox — the workspace-wide source inbox (Step 12 → Phase 3 page
 * redesign).
 *
 * PHASE 3 LAYOUT CONTRACT
 *   phone (<1024)  one column: page head, the staged-import rail (it is
 *                  the actionable part, so it leads), then the threads.
 *   desktop (1024) threads + a 20rem rail holding the staged Slack/Notion
 *                  and mail imports (`desk:grid-cols-[minmax(0,1fr)_20rem]`).
 *
 * HOW TO TEST (locally — requires the Supabase setup from README.md):
 *   ⚠ Apply the add_brief_source migration first (see README "Verify
 *   Step 12") — without it, "Add to thread" replies fail server-side.
 *   1. Sign up / log in (Step 2), then run supabase/seed.sql.
 *   2. Open /intake/inbox: the Brightloop thread shows BOTH seeded emails
 *      (kickoff + the phase-two follow-up), bubbles oldest-first; threads
 *      sort by most recent source.
 *   3. Type a reply in "Thread a follow-up" → Add to thread: an optimistic
 *      bubble appears, then the real row lands — the reply ALSO shows on
 *      /briefs/[id]'s Sources card and a 'source_added' entry appears in
 *      that brief's History.
 *   4. Generate a new brief from /intake → its source becomes a new thread
 *      here immediately.
 *   5. The source-type chips filter the thread list client-side; only types
 *      present in the workspace get a chip.
 */

import Link from "next/link";
import { Inbox as InboxIcon, MessageSquare, PenLine } from "lucide-react";

import { getInboxThreads } from "@/lib/data/inbox";
import { getIntegrationStaging } from "@/lib/data/integrations";
import { getMailboxStaging } from "@/lib/data/mailbox";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { InboxThreadList } from "@/components/intake/InboxThreadList";
import { IntegrationStaging } from "@/components/intake/IntegrationStaging";
import { MailboxStaging } from "@/components/intake/MailboxStaging";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/page";

export default async function IntakeInboxPage() {
  const [threads, staging, imports, context] = await Promise.all([
    getInboxThreads(),
    getMailboxStaging(),
    getIntegrationStaging(),
    getWorkspaceContext(),
  ]);

  const threadCount = threads?.length ?? 0;
  const sourceCount =
    threads?.reduce((n, t) => n + t.sources.length, 0) ?? 0;
  const stagedCount = staging.length + imports.length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={InboxIcon}
        eyebrow={context?.name}
        title="Inbox"
        subtitle="Every client message across every brief, as a running thread."
        meta={
          threads === null ? undefined : (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">
                {threadCount} {threadCount === 1 ? "thread" : "threads"}
              </Badge>
              <Badge variant="secondary">
                {sourceCount} {sourceCount === 1 ? "source" : "sources"}
              </Badge>
              {stagedCount > 0 && (
                <Badge variant="soft">{stagedCount} staged</Badge>
              )}
            </div>
          )
        }
        actions={
          <Button asChild>
            <Link href="/intake" className="inline-flex min-h-11 min-w-11 items-center">
              <PenLine className="h-4 w-4" aria-hidden="true" />
              New brief
            </Link>
          </Button>
        }
      />

      <div className="grid items-start gap-6 desk:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Threads — the reading column. */}
        <div className="min-w-0" data-proof="inbox-threads">
          {threads === null ? (
            <EmptyState
              icon={MessageSquare}
              title="Couldn't load the inbox"
              description="Refresh to retry. If this persists, check your Supabase connection — and that the migrations and seed have been applied (see README)."
              tone="muted"
            />
          ) : (
            <InboxThreadList threads={threads} />
          )}
        </div>

        {/* Staged imports — leads on phones (it is the actionable part),
            sits in the rail from 1024px. */}
        {(staging.length > 0 || imports.length > 0) && (
          <div className="order-first min-w-0 space-y-6 desk:order-none">
            {staging.length > 0 && (
              <MailboxStaging
                messages={staging}
                canEdit={context?.canEdit ?? false}
              />
            )}
            {imports.length > 0 && (
              <IntegrationStaging
                items={imports}
                canEdit={context?.canEdit ?? false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
