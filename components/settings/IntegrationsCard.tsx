"use client";

/**
 * Integrations card — connect Slack and/or Notion to this workspace.
 * Owner-managed (the OAuth connect is owner-gated in /api/{slack,notion}/connect);
 * members see the connections, not the controls (mailbox/webhooks precedent).
 *
 * v1 shape: one Slack workspace + one Notion workspace per Roducq
 * workspace (disconnect to swap).
 */

import { useState, useTransition } from "react";

import { BookOpen, Hash, Plug, Trash2, X } from "lucide-react";

import { disconnectIntegration } from "@/app/(app)/settings/integration-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import type { IntegrationConnectionSummary } from "@/lib/data/integrations";
import type { IntegrationProvider } from "@/lib/integrations/oauth";

export function IntegrationsCard({
  connections,
  isOwner,
  slackConfigured,
  notionConfigured,
  tokenKeyOk,
}: {
  connections: IntegrationConnectionSummary[];
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
    <Card data-proof="integrations">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="icon-chip icon-chip-accent h-10 w-10">
            <Plug className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Connect Slack and Notion — tokens stay encrypted on the server.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
          onDisconnect={runDisconnect}
          missingHint="Slack: set SLACK_CLIENT_ID + SLACK_CLIENT_SECRET (OAuth app with redirect /api/slack/callback) to enable this."
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
          onDisconnect={runDisconnect}
          missingHint="Notion: set NOTION_CLIENT_ID + NOTION_CLIENT_SECRET (public integration with redirect /api/notion/callback) to enable this."
        />
        {slackConfigured && notionConfigured && !tokenKeyOk && (
          <p className="text-xs text-muted-foreground">
            Also set AUTH_SECRET (or EMAIL_TOKEN_ENCRYPTION_KEY, 64 hex chars) —
            it signs the OAuth state and encrypts stored tokens.
          </p>
        )}
      </CardContent>
    </Card>
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
  onDisconnect: (id: string, provider: IntegrationProvider) => void;
  missingHint: string;
}) {
  const connectHref = `/api/${provider}/connect`;

  if (connection) {
    const title =
      connection.display_name ||
      (provider === "slack" ? "Slack workspace" : "Notion workspace");
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {title}
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {label}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {connection.status === "needs_reauth"
              ? "Needs re-authorization — connect again to restore access."
              : "Connected"}
          </p>
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
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Disconnect ${label}`}
              onClick={() => setConfirmId(connection.id)}
            >
              <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
            </Button>
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
        <span className="inline-flex h-11 min-w-11 cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold text-muted-foreground">
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
