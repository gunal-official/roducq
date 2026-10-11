"use client";

/**
 * Integrations card — connect Slack and/or Notion to this workspace,
 * then Import now to stage recent messages/pages in the Inbox.
 * Owner-managed (the OAuth connect is owner-gated in /api/{slack,notion}/connect);
 * members see the connections, not the controls (mailbox/webhooks precedent).
 *
 * v1 shape: one Slack workspace + one Notion workspace per Roducq
 * workspace (disconnect to swap). Import is on-demand — there is no
 * /api/cron/slack.
 */

import { useState, useTransition } from "react";

import {
  BookOpen,
  Hash,
  Loader2,
  Plug,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import {
  disconnectIntegration,
  importIntegrationNow,
} from "@/app/(app)/settings/integration-actions";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import type { IntegrationConnectionSummary } from "@/lib/data/integrations";
import type { IntegrationProvider } from "@/lib/integrations/oauth";
import { timeAgo } from "@/lib/utils";

export function IntegrationsCard({
  connections,
  isOwner,
  slackConfigured,
  notionConfigured,
  tokenKeyOk,
  sectionId,
}: {
  connections: IntegrationConnectionSummary[];
  /** Anchor id for the settings page's section nav. */
  sectionId?: string;
  isOwner: boolean;
  /** SLACK_CLIENT_ID + SLACK_CLIENT_SECRET set on the server. */
  slackConfigured: boolean;
  /** NOTION_CLIENT_ID + NOTION_CLIENT_SECRET set on the server. */
  notionConfigured: boolean;
  /** Token encryption key resolvable on the server. */
  tokenKeyOk: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const toast = useToast();

  function runImport(id: string, provider: IntegrationProvider) {
    startTransition(async () => {
      const result = await importIntegrationNow(id);
      if (result?.error) {
        toast(result.error);
      } else {
        const n = result?.imported ?? 0;
        toast(
          n > 0
            ? `${provider === "slack" ? "Slack" : "Notion"} imported — ${n} item(s) staged in the Inbox.`
            : `${provider === "slack" ? "Slack" : "Notion"} imported — nothing new.`
        );
      }
    });
  }

  function runDisconnect(id: string, provider: IntegrationProvider) {
    setConfirmId(null);
    startTransition(async () => {
      const result = await disconnectIntegration(id);
      toast(
        result?.error ??
          (provider === "slack" ? "Slack disconnected." : "Notion disconnected.")
      );
    });
  }

  const slack = connections.find((c) => c.provider === "slack") ?? null;
  const notion = connections.find((c) => c.provider === "notion") ?? null;

  return (
    <SectionCard
      icon={Plug}
      title="Integrations"
      description="Connect Slack and Notion, then import recent messages and pages into the Inbox — tokens stay encrypted on the server."
      tone="accent"
      id={sectionId}
      bodyClassName="space-y-4 p-5"
      proof="integrations"
    >
      <ProviderRow
        provider="slack"
        label="Slack"
        icon={Hash}
        connection={slack}
        isOwner={isOwner}
        configured={slackConfigured && tokenKeyOk}
        pending={pending}
        confirmId={confirmId}
        setConfirmId={setConfirmId}
        onImport={runImport}
        onDisconnect={runDisconnect}
        missingHint="Slack: set SLACK_CLIENT_ID + SLACK_CLIENT_SECRET (OAuth app with redirect /api/slack/callback and history/read bot scopes) to enable this."
      />
      <ProviderRow
        provider="notion"
        label="Notion"
        icon={BookOpen}
        connection={notion}
        isOwner={isOwner}
        configured={notionConfigured && tokenKeyOk}
        pending={pending}
        confirmId={confirmId}
        setConfirmId={setConfirmId}
        onImport={runImport}
        onDisconnect={runDisconnect}
        missingHint="Notion: set NOTION_CLIENT_ID + NOTION_CLIENT_SECRET (public integration with redirect /api/notion/callback) to enable this."
      />
      {slackConfigured && notionConfigured && !tokenKeyOk && (
        <p className="text-xs text-muted-foreground">
          Also set AUTH_SECRET (or EMAIL_TOKEN_ENCRYPTION_KEY, 64 hex chars) —
          it signs the OAuth state and encrypts stored tokens.
        </p>
      )}
    </SectionCard>
  );
}

function ProviderRow({
  provider,
  label,
  icon: Icon,
  connection,
  isOwner,
  configured,
  pending,
  confirmId,
  setConfirmId,
  onImport,
  onDisconnect,
  missingHint,
}: {
  provider: IntegrationProvider;
  label: string;
  icon: typeof Hash;
  connection: IntegrationConnectionSummary | null;
  isOwner: boolean;
  configured: boolean;
  pending: boolean;
  confirmId: string | null;
  setConfirmId: (id: string | null) => void;
  onImport: (id: string, provider: IntegrationProvider) => void;
  onDisconnect: (id: string, provider: IntegrationProvider) => void;
  missingHint: string;
}) {
  const connectHref = `/api/${provider}/connect`;

  if (connection) {
    const title =
      connection.display_name ||
      (provider === "slack" ? "Slack workspace" : "Notion workspace");
    const synced =
      connection.status === "needs_reauth"
        ? "Needs re-authorization — connect again to restore import."
        : connection.last_synced_at
          ? `Last imported ${timeAgo(connection.last_synced_at)}`
          : "Never imported yet";
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {title}
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {label}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{synced}</p>
          {connection.status === "active" && connection.last_error && (
            <p className="mt-0.5 text-xs text-error">{connection.last_error}</p>
          )}
        </div>

        {isOwner &&
          (connection.status === "needs_reauth" ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={connectHref}>
                  <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                  Connect again
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Disconnect ${label}`}
                onClick={() => setConfirmId(connection.id)}
              >
                <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </div>
          ) : confirmId === connection.id ? (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => onDisconnect(connection.id, provider)}
              >
                {pending ? "Working…" : "Confirm disconnect"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Cancel disconnect"
                onClick={() => setConfirmId(null)}
              >
                <X size={16} strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => onImport(connection.id, provider)}
              >
                {pending ? (
                  <Loader2
                    size={16}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCw size={16} strokeWidth={1.5} aria-hidden="true" />
                )}
                Import now
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Disconnect ${label}`}
                onClick={() => setConfirmId(connection.id)}
              >
                <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isOwner && configured ? (
        <Button variant="outline" asChild>
          <a href={connectHref}>
            <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
            Connect {label}
          </a>
        </Button>
      ) : (
        <span className="inline-flex h-11 min-w-11 cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-control border border-border bg-card px-5 py-2 text-sm font-semibold text-muted-foreground">
          <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
          Connect {label}
        </span>
      )}
      {isOwner && !configured && (
        <p className="text-xs text-muted-foreground">{missingHint}</p>
      )}
    </div>
  );
}
