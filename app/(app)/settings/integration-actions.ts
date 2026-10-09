"use server";

/**
 * Server actions for Slack/Notion connection management + intake import.
 * Owner-only for connect-side management (the OAuth callback is the only
 * other writer); createBriefFromImport follows the editor guard (viewers
 * read, never write).
 *
 * Token access + import upserts + attached-brief marking go through the
 * SERVICE client (bypasses RLS) — same trust model as mailbox sync.
 */

import { revalidatePath } from "next/cache";

import { recordEvent } from "@/lib/events";
import {
  getWorkspaceContext,
  requireEditor,
} from "@/lib/data/workspace-context";
import {
  hasIntegrationKey,
  integrationKeyHex,
  tokenDecrypt,
} from "@/lib/integrations/crypto";
import {
  providerEnv,
  revokeToken,
  type IntegrationProvider,
} from "@/lib/integrations/oauth";
import {
  fetchImportedItems,
  IntegrationAuthError,
} from "@/lib/integrations/sync";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type ActionResult = { error?: string } | undefined;

function asProvider(v: unknown): IntegrationProvider {
  return v === "notion" ? "notion" : "slack";
}

/** Owner: pull recent Slack messages / Notion pages and stage them.
 *  Staging upserts on unique(connection_id, external_id) — every import
 *  is idempotent (duplicates are skipped / content refreshed in place). */
export async function importIntegrationNow(
  connectionId: string
): Promise<{ error?: string; imported?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const context = await getWorkspaceContext();
  if (!context) return { error: "No workspace found for your account." };
  if (context.role !== "owner") {
    return { error: "Only workspace owners can import from integrations." };
  }

  const keyHex = integrationKeyHex();
  if (!keyHex || !hasIntegrationKey()) {
    return {
      error: "Token encryption key is not set on the server (AUTH_SECRET or EMAIL_TOKEN_ENCRYPTION_KEY).",
    };
  }

  const { data: row } = await supabase
    .from("integration_connections")
    .select("id, provider, access_token_enc")
    .eq("id", connectionId)
    .eq("workspace_id", context.id)
    .maybeSingle();
  if (!row) return { error: "Connection not found." };

  const provider = asProvider(row.provider);
  const service = createServiceClient();
  const mark = (patch: Record<string, unknown>) =>
    service.from("integration_connections").update(patch).eq("id", connectionId);

  try {
    const access = tokenDecrypt(String(row.access_token_enc), keyHex);
    const items = await fetchImportedItems({
      provider,
      accessToken: access,
    });
    if (items.length) {
      await service.from("integration_imports").upsert(
        items.map((item) => ({
          workspace_id: context.id,
          connection_id: connectionId,
          provider,
          external_id: item.externalId,
          title: item.title,
          author: item.author,
          snippet: item.snippet,
          body_text: item.bodyText,
          permalink: item.permalink,
          occurred_at: item.occurredAt,
          metadata: item.metadata,
        })),
        { onConflict: "connection_id,external_id" }
      );
    }
    await mark({
      last_synced_at: new Date().toISOString(),
      last_error: null,
    });
    revalidatePath("/settings");
    revalidatePath("/intake/inbox");
    return { imported: items.length };
  } catch (e) {
    if (e instanceof IntegrationAuthError) {
      await mark({
        status: "needs_reauth",
        last_error: e.message,
      });
      return { error: e.message };
    }
    const message = e instanceof Error ? e.message : "Import failed.";
    await mark({ last_error: message.slice(0, 300) });
    return { error: message };
  }
}

/** Owner: best-effort revoke at the provider, then delete the connection
 *  (staged imports cascade away with it). */
export async function disconnectIntegration(
  connectionId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const context = await getWorkspaceContext();
  if (!context) return { error: "No workspace found for your account." };
  if (context.role !== "owner") {
    return { error: "Only workspace owners can manage integrations." };
  }

  const { data: row } = await supabase
    .from("integration_connections")
    .select("id, provider, access_token_enc")
    .eq("id", connectionId)
    .eq("workspace_id", context.id)
    .maybeSingle();
  if (!row) return { error: "Connection not found." };

  const provider = asProvider(row.provider);
  const env = providerEnv(provider);
  const keyHex = integrationKeyHex();
  if (env && keyHex && hasIntegrationKey()) {
    try {
      const access = tokenDecrypt(String(row.access_token_enc), keyHex);
      await revokeToken({
        provider,
        accessToken: access,
        clientId: env.clientId,
        clientSecret: env.clientSecret,
      });
    } catch {
      // revocation is best-effort — the local delete always proceeds
    }
  }

  const service = createServiceClient();
  const { error } = await service
    .from("integration_connections")
    .delete()
    .eq("id", connectionId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/intake/inbox");
  return undefined;
}

/** Editor: create a brief from a staged Slack/Notion import (source_type
 *  'chat' for Slack, 'manual' for Notion via the existing
 *  create_brief_bundle RPC) and mark the row attached (service client —
 *  no user write policy on integration_imports by design). */
export async function createBriefFromImport(
  importId: string
): Promise<{ error?: string; briefId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Please log in again." };

  const viewerGuard = await requireEditor();
  if (viewerGuard) return { error: viewerGuard.error };

  const context = await getWorkspaceContext();
  if (!context) return { error: "No workspace found for your account." };

  const { data: item } = await supabase
    .from("integration_imports")
    .select(
      "id, provider, title, author, snippet, body_text, permalink, occurred_at, external_id, attached_brief_id"
    )
    .eq("id", importId)
    .eq("workspace_id", context.id)
    .maybeSingle();
  if (!item) return { error: "That item is no longer staged." };
  if (item.attached_brief_id) {
    return { error: "That item is already attached to a brief." };
  }

  const provider = asProvider(item.provider);
  const author = String(item.author ?? (provider === "notion" ? "Notion" : "Slack"));
  const title = String(item.title || `From ${author}`).slice(0, 120);
  const rawContent = String(item.body_text ?? item.snippet ?? title);
  const sourceType = provider === "slack" ? "chat" : "manual";

  const { data: briefId, error } = await supabase.rpc("create_brief_bundle", {
    p_workspace_id: context.id,
    p_title: title,
    p_objective: "",
    p_deliverables: [],
    p_budget_timeline: "",
    p_client_name: null,
    p_owner_id: user.id,
    p_source_type: sourceType,
    p_raw_content: rawContent,
    p_source_metadata: {
      provider,
      author,
      permalink: item.permalink ?? null,
      occurred_at: item.occurred_at,
      provider_item_id: item.external_id,
    },
    p_questions: [],
  });

  if (error || !briefId) {
    return { error: error?.message ?? "Could not create the brief." };
  }

  const serviceClient = createServiceClient();
  await serviceClient
    .from("integration_imports")
    .update({ attached_brief_id: briefId })
    .eq("id", importId);

  await recordEvent(supabase, {
    workspace_id: context.id,
    event_type: "brief.created",
    payload: {
      brief_id: briefId,
      title,
      source: provider,
    },
  });

  revalidatePath("/intake/inbox");
  revalidatePath("/briefs");
  return { briefId: String(briefId) };
}
