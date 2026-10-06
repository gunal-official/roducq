import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BriefDeliverable } from "@/lib/types/brief";
import type {
  ProposalStatus,
  ProposalSummary,
  ProposalVersion,
  ProposalWithBrief,
} from "@/lib/types/proposal";

/**
 * Server-side data access for proposals. Same conventions as
 * lib/data/briefs.ts: cookie-authenticated server client. List reads pin
 * the caller's ACTIVE workspace explicitly (Step 16 — RLS is the security
 * gate; the filter keeps multi-workspace users' lists unmerged).
 * Call only with an active session.
 */

/** Summary rows for the /proposals list, most recently updated first. */
export async function getProposals(
  workspaceId: string
): Promise<ProposalSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposals")
    .select("id, title, client_name, status, updated_at, deliverables")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    title: string;
    client_name: string | null;
    status: ProposalStatus;
    updated_at: string;
    deliverables: BriefDeliverable[] | null;
  }>;

  return rows.map((row) => {
    const deliverables = row.deliverables ?? [];
    return {
      id: row.id,
      title: row.title,
      client_name: row.client_name,
      status: row.status,
      updated_at: row.updated_at,
      deliverablesTotal: deliverables.length,
      deliverablesDone: deliverables.filter((d) => d.checked).length,
    };
  });
}

/** A single proposal with its source brief (id + title) embedded via the
 *  briefs FK. Returns null when not found (or not visible via RLS). */
export async function getProposalById(
  proposalId: string
): Promise<ProposalWithBrief | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposals")
    .select("*, brief:briefs(id, title)")
    .eq("id", proposalId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ProposalWithBrief | null;
}

/** Version history for one proposal, NEWEST first (v_N → v_1). RLS: any
 *  workspace member reads history — viewers included; strangers get zero
 *  rows, indistinguishable from "no versions". */
export async function getProposalVersions(
  proposalId: string
): Promise<ProposalVersion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposal_versions")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("version_number", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProposalVersion[];
}

/** One full snapshot for the read-only "View version" page. Returns null
 *  when not found (or not visible via RLS); the page additionally
 *  verifies the row belongs to the proposal it was reached from. */
export async function getProposalVersionById(
  versionId: string
): Promise<ProposalVersion | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposal_versions")
    .select("*")
    .eq("id", versionId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as ProposalVersion | null;
}
