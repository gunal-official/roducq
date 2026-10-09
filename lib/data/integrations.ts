import "server-only";

import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { createClient } from "@/lib/supabase/server";
import type { IntegrationProvider } from "@/lib/integrations/oauth";

/**
 * Server-side reads for Slack/Notion connection state (Settings card)
 * and staged imports (Inbox). Tokens are never selected — only identity
 * + status for the UI.
 */

export type IntegrationConnectionSummary = {
  id: string;
  provider: IntegrationProvider;
  external_id: string;
  display_name: string | null;
  status: "active" | "needs_reauth";
  last_error: string | null;
  last_synced_at: string | null;
  created_at: string | null;
};

export type IntegrationStagingItem = {
  id: string;
  provider: IntegrationProvider;
  title: string;
  author: string;
  snippet: string | null;
  occurred_at: string;
};

type Row = Record<string, unknown>;

function asProvider(value: unknown): IntegrationProvider {
  return value === "notion" ? "notion" : "slack";
}

export async function getIntegrationConnections(): Promise<
  IntegrationConnectionSummary[]
> {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return [];

  const { data, error } = await supabase
    .from("integration_connections")
    .select(
      "id, provider, external_id, display_name, status, last_error, last_synced_at, created_at"
    )
    .eq("workspace_id", context.id)
    .order("created_at", { ascending: true });

  if (error) return [];
  return ((data ?? []) as Row[]).map((row) => ({
    id: String(row.id),
    provider: asProvider(row.provider),
    external_id: String(row.external_id ?? ""),
    display_name: (row.display_name as string | null) ?? null,
    status: row.status === "needs_reauth" ? "needs_reauth" : "active",
    last_error: (row.last_error as string | null) ?? null,
    last_synced_at: (row.last_synced_at as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  }));
}

export async function getIntegrationStaging(): Promise<IntegrationStagingItem[]> {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return [];

  const { data, error } = await supabase
    .from("integration_imports")
    .select("id, provider, title, author, snippet, occurred_at")
    .eq("workspace_id", context.id)
    .is("attached_brief_id", null)
    .order("occurred_at", { ascending: false })
    .limit(20);

  if (error) return [];
  return ((data ?? []) as Row[]).map((row) => ({
    id: String(row.id),
    provider: asProvider(row.provider),
    title: String(row.title ?? "(untitled)"),
    author: String(row.author ?? (asProvider(row.provider) === "notion" ? "Notion" : "Slack")),
    snippet: (row.snippet as string | null) ?? null,
    occurred_at: String(row.occurred_at ?? ""),
  }));
}
