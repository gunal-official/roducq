import "server-only";

import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { createClient } from "@/lib/supabase/server";
import {
  calculateSeatAvailability,
  effectiveSeatPlan,
  type CanInviteMemberResult,
  type SeatBillingRecord,
} from "@/lib/billing/seat-limit-policy";

export { calculateSeatAvailability, effectiveSeatPlan, seatLimitForPlan } from "@/lib/billing/seat-limit-policy";
export type { CanInviteMemberResult, EffectiveSeatPlan, SeatBillingRecord } from "@/lib/billing/seat-limit-policy";

/**
 * Counts active members and pending invitations as occupied seats. The DB
 * trigger in the Stage 2 migration applies the same rule atomically to prevent
 * concurrent invite requests from racing past the final available seat.
 */
export async function canInviteMember(workspaceId: string): Promise<CanInviteMemberResult> {
  const context = await getWorkspaceContext();
  if (!context || context.id !== workspaceId) {
    throw new Error("Workspace access is required to check seat availability.");
  }

  const supabase = await createClient();
  const [billingResult, memberResult, invitationResult] = await Promise.all([
    supabase
      .from("billing_subscriptions")
      .select("plan_name, status, paid_through")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("team_invites")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);

  const error = billingResult.error ?? memberResult.error ?? invitationResult.error;
  if (error) throw new Error(`Could not check workspace seats: ${error.message}`);

  return calculateSeatAvailability(
    memberResult.count ?? 0,
    invitationResult.count ?? 0,
    effectiveSeatPlan(billingResult.data as SeatBillingRecord | null),
  );
}
