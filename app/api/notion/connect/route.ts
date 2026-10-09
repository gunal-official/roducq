import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { handleIntegrationConnect } from "@/lib/integrations/handler";
import { createClient } from "@/lib/supabase/server";

/**
 * Notion connect — step 1 of 2. Owner clicks "Connect Notion" → 302 to
 * Notion's OAuth authorize URL with a SIGNED state claim. Step 2 is
 * /api/notion/callback.
 *
 * Unauthenticated callers 302 to /login (so `curl -I` is a 302, never a
 * 404). Missing-env cases 302 to /settings with an actionable toast.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
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
    // Unconfigured supabase still 302s (login), never 404s.
  }
  return handleIntegrationConnect({
    origin: url.origin,
    provider: "notion",
    auth: { userId, workspaceId, role },
  });
}

export function HEAD(request: Request) {
  return GET(request);
}
