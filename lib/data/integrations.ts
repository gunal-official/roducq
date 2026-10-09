import "server-only";

import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { createClient } from "@/lib/supabase/server";
import type { IntegrationProvider } from "@/lib/integrations/oauth";

/**
 * Server-side reads for Slack/Notion connection state (Settings card).
 * Tokens are never selected — only identity + status for the UI.
 */

export type IntegrationConnectionSummary = {
  id: string;
  provider: IntegrationProvider;
  external_id: string;
  display_name: string | null;
  status: "active" | "needs_reauth";
  last_error: string | null;
  created_at: string | null;
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
    .select("id, provider, external_id, display_name, status, last_error, created_at")
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
    created_at: (row.created_at as string | null) ?? null,
  }));
}
