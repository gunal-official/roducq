"use server";

/**
 * Server actions for Slack/Notion connection management. Owner-only;
 * the OAuth callback is the only other writer. Token access + deletes
 * go through the SERVICE client (bypasses RLS) — same trust model as
 * mailbox disconnect.
 */

import { revalidatePath } from "next/cache";

import { getWorkspaceContext } from "@/lib/data/workspace-context";
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
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type ActionResult = { error?: string } | undefined;

function asProvider(v: unknown): IntegrationProvider {
  return v === "notion" ? "notion" : "slack";
}

/** Owner: best-effort revoke at the provider, then delete the connection. */
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
  return undefined;
}
