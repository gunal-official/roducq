/**
 * Thin adapter over the atomic SECURITY DEFINER function
 * public.apply_razorpay_subscription_event (service role only). All business
 * rules live in the database function and lib/billing/entitlements.ts; this
 * file only maps arguments and results.
 */
import type { ApplyEventArgs, ApplyEventResult } from "./webhook-processor.ts";

/** Minimal shape of the Supabase client we need (keeps this unit-testable). */
export interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export function makeApplyEvent(client: RpcClient): (args: ApplyEventArgs) => Promise<ApplyEventResult> {
  return async (args) => {
    const { data, error } = await client.rpc("apply_razorpay_subscription_event", {
      p_event_key: args.eventKey,
      p_event_type: args.eventType,
      p_event_created_at: args.eventCreatedAt,
      p_subscription_id: args.subscriptionId,
      p_workspace_id: args.workspaceId,
      p_status: args.status,
      p_customer_id: args.customerId,
      p_paid_through: args.paidThrough,
      p_paid_through_source: args.paidThroughSource,
      p_currency: args.currency,
      p_amount: args.amount,
      p_only_if_active: args.onlyIfActive,
      p_body_sha256: args.bodySha256,
      p_razorpay_event_id: args.razorpayEventId,
    });
    if (error) return { ok: false, error: error.message };
    const row = data as { outcome?: unknown; workspace_id?: unknown } | null;
    if (!row || typeof row.outcome !== "string") return { ok: false, error: "malformed ledger response" };
    return { ok: true, outcome: row.outcome, workspaceId: typeof row.workspace_id === "string" ? row.workspace_id : null };
  };
}
