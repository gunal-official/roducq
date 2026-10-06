"use server";

/**
 * Server actions for /proposals/[id].
 *
 * TESTING (local, after README setup + seed data):
 *   1. Open the seeded proposal from /proposals ("Brightloop Co.").
 *   2. Change the status dropdown → proposals.status updates in the Table
 *      Editor, and the /proposals list badge matches after navigating back
 *      (both paths are revalidated here).
 */

import { revalidatePath } from "next/cache";
import { recordEvent } from "@/lib/events";
import { redirect } from "next/navigation";

import { getProposalById } from "@/lib/data/proposals";
import { requireEditor } from "@/lib/data/workspace-context";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/utils";
import type { ProposalStatus } from "@/lib/types/proposal";

export type ActionResult = { error?: string } | undefined;

const VALID_STATUSES: ProposalStatus[] = [
  "draft",
  "sent",
  "accepted",
  "declined",
];

export async function updateProposalStatus(input: {
  proposalId: string;
  status: ProposalStatus;
}): Promise<ActionResult> {
  if (!VALID_STATUSES.includes(input.status)) {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session has expired. Please log in again." };
  const viewerGuard = await requireEditor();
  if (viewerGuard) return viewerGuard;

  // Read the current row (RLS-scoped; foreign proposals look absent) so
  // events record real transitions, not re-assertions (invoice precedent).
  const { data: proposal, error: fetchError } = await supabase
    .from("proposals")
    .select("status, workspace_id, title")
    .eq("id", input.proposalId)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!proposal) return { error: "Proposal not found." };

  const previous = proposal.status as ProposalStatus;

  // Plain UPDATE; RLS scopes it to the user's workspaces.
  const { error } = await supabase
    .from("proposals")
    .update({ status: input.status })
    .eq("id", input.proposalId);

  if (error) return { error: error.message };

  if (
    previous !== input.status &&
    (input.status === "accepted" || input.status === "declined")
  ) {
    await recordEvent(supabase, {
      workspace_id: proposal.workspace_id,
      event_type:
        input.status === "accepted" ? "proposal.accepted" : "proposal.declined",
      payload: { proposal_id: input.proposalId, title: proposal.title },
    });
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${input.proposalId}`);
  return { error: undefined };
}

/**
 * Restore a proposal to a historical snapshot (Queue #7). Editors only —
 * requireEditor() here AND the RPC's own is_workspace_editor() re-gate
 * (viewers calling the function directly are refused there too). The RPC
 * snapshots the PRE-restore state as a new 'restored' version inside the
 * same transaction, so a restore can never silently lose the state it
 * displaces: history stays append-only and auditable. No event-log rows —
 * status landing on accepted/declined via a restore is a rollback, not a
 * fresh client decision (the versions table is the audit trail for it).
 */
export async function restoreProposalVersion(input: {
  proposalId: string;
  versionId: string;
}): Promise<ActionResult> {
  if (!isUuid(input.proposalId) || !isUuid(input.versionId)) {
    return { error: "Version not found." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session has expired. Please log in again." };
  const viewerGuard = await requireEditor();
  if (viewerGuard) return viewerGuard;

  // SECURITY DEFINER RPC: row-locks the proposal, refuses non-editors /
  // unknown ids / no-op restores, captures the pre-restore state, applies
  // the snapshot — one transaction. RLS on the versions table still
  // governs which version ids the UI could ever surface.
  const { error } = await supabase.rpc("restore_proposal_version", {
    p_proposal_id: input.proposalId,
    p_version_id: input.versionId,
  });

  if (error) {
    if (/already_current/.test(error.message)) {
      return { error: "That version is already the current content." };
    }
    if (/not_authorized/.test(error.message)) {
      return { error: "Only editors can restore versions." };
    }
    if (/proposal_not_found|version_not_found/.test(error.message)) {
      return { error: "Version not found." };
    }
    return { error: error.message };
  }

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${input.proposalId}`);
  return { error: undefined };
}

/**
 * Generate a plan from a proposal: copies title / client / budget and maps
 * the proposal's deliverables directly into the plan's tasks array (same
 * {id, text, checked} shape, new column), inserts the plans row as
 * 'not_started', then redirects to the new plan's page. Ungated on
 * proposal status (mirrors proposal generation from briefs). All queries
 * go through the session client, so RLS blocks proposals outside the
 * user's workspaces (getProposalById returns null → "Proposal not found.").
 */
export async function createPlanFromProposal(input: {
  proposalId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Your session has expired. Please log in again." };
  const viewerGuard = await requireEditor();
  if (viewerGuard) return viewerGuard;

  const proposal = await getProposalById(input.proposalId);
  if (!proposal) return { error: "Proposal not found." };

  const { data: plan, error } = await supabase
    .from("plans")
    .insert({
      workspace_id: proposal.workspace_id,
      proposal_id: proposal.id,
      title: proposal.title,
      client_name: proposal.client_name,
      budget_timeline: proposal.budget_timeline,
      tasks: proposal.deliverables,
      status: "not_started",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!plan) return { error: "Could not create the plan." };

  revalidatePath("/plans");
  // throws NEXT_REDIRECT — intentionally not wrapped in try/catch
  redirect(`/plans/${plan.id}`);
}
