"use client";

/**
 * Staged-mail list for /intake/inbox (future-list item "Gmail/Outlook")
 * — messages synced from a connected mailbox that are NOT yet attached
 * to a brief. Editors can turn any message into a brief (source_type
 * 'email' via create_brief_bundle); the message then drops out of this
 * list and appears on the brief's Sources card like any pasted source.
 * Viewers see the mail read-only (requireEditor backs the button).
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FilePlus2, Loader2, Mail } from "lucide-react";

import { createBriefFromEmail } from "@/app/(app)/settings/email-actions";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import type { MailboxStagingMessage } from "@/lib/data/mailbox";
import { timeAgo } from "@/lib/utils";

export function MailboxStaging({
  messages,
  canEdit,
}: {
  messages: MailboxStagingMessage[];
  canEdit: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function createBrief(messageId: string) {
    setPendingId(messageId);
    startTransition(async () => {
      const result = await createBriefFromEmail(messageId);
      setPendingId(null);
      if (result?.error) {
        toast(result.error);
        return;
      }
      toast("Brief created from this email.");
      if (result?.briefId) {
        router.push(`/briefs/${result.briefId}`);
      }
    });
  }

  return (
    <SectionCard
      icon={Mail}
      title="Staged mail"
      description="New mail from connected mailboxes — create a brief from any message."
      tone="accent"
      bodyClassName="p-5"
      proof="staged-mail"
      className="animate-rise-in"
    >
      <ul className="divide-y divide-border">
        {messages.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.subject || "(no subject)"}
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {m.service === "gmail" ? "Gmail" : "Outlook"}
                </span>
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {m.sender} · {timeAgo(m.received_at)}
              </p>
              {m.snippet && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {m.snippet}
                </p>
              )}
            </div>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                disabled={pendingId !== null}
                onClick={() => createBrief(m.id)}
                aria-label={`Create a brief from "${m.subject || m.sender}"`}
              >
                {pendingId === m.id ? (
                  <Loader2 size={16} strokeWidth={1.5} aria-hidden="true" className="animate-spin" />
                ) : (
                  <FilePlus2 size={16} strokeWidth={1.5} aria-hidden="true" />
                )}
                Create brief
              </Button>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
