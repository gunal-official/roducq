import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface WorkspaceBranding {
  name: string;
  logoDataUrl: string | null;
}

/** Active members can read their workspace's name and optional PDF logo. */
export async function getWorkspaceBranding(
  workspaceId: string
): Promise<WorkspaceBranding | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("name, logo_data_url")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    name: data.name,
    logoDataUrl: data.logo_data_url ?? null,
  };
}
