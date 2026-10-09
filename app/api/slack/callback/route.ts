import { getWorkspaceContext } from "@/lib/data/workspace-context";
import {
  earlyIntegrationCallback,
  handleIntegrationCallback,
} from "@/lib/integrations/handler";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Slack connect — step 2 of 2. Slack bounces here with ?code=&state=.
 * The signed state is verified BEFORE oauth.v2.access is called, so a
 * tampered callback can never route one user's tokens into another
 * workspace. Tokens are encrypted at rest; the row is upserted through
 * the service role (no user write policies on integration_connections).
 *
 * A bare GET/HEAD (no code, no error) returns 400 — never 404 — so the
 * route is observable with `curl -I`.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const early = earlyIntegrationCallback(url, origin, "slack");
  if (early) return early;

  let userId: string | null = null;
  let workspaceId: string | null = null;
  let role: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    if (user) {
      const context = await getWorkspaceContext();
      workspaceId = context?.id ?? null;
      role = context?.role ?? null;
    }
  } catch {
    // Fall through — handler maps missing auth to a settings redirect.
  }

  return handleIntegrationCallback({
    origin,
    url,
    provider: "slack",
    auth: { userId, workspaceId, role },
    persist: async (row) => {
      const service = createServiceClient();
      const { error } = await service
        .from("integration_connections")
        .upsert(row, { onConflict: "workspace_id,provider" });
      if (error) throw new Error(error.message);
    },
  });
}

export function HEAD(request: Request) {
  return GET(request);
}
