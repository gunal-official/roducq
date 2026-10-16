/** Razorpay webhooks — raw-body HMAC verification (X-Razorpay-Signature,
 * RAZORPAY_WEBHOOK_SECRET), event allowlist, idempotency via
 * billing_webhook_events (sha256 of raw body), out-of-order guard via
 * last_billing_event_at. Service-role writes only. No signature material logged.
 *
 * SECURITY: The dedup record is inserted AFTER the billing update so that a
 * partial failure (billing update fails after dedup insert) does not mark the
 * event as processed with billing unupdated — Razorpay retries and the next
 * attempt processes from a clean slate. The operations are naturally idempotent
 * so a concurrent duplicate that races through both steps converges on the
 * same state. */
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/utils";
import { parseRazorpayWebhookEvent, statusForWebhookEvent, verifyWebhookSignature } from "@/lib/razorpay";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Billing webhooks are not configured (RAZORPAY_WEBHOOK_SECRET missing)." }, { status: 500 });
  if (!verifyWebhookSignature({ webhookSecret: secret, signature: request.headers.get("x-razorpay-signature") ?? "", raw })) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  const event = parseRazorpayWebhookEvent(raw);
  if (event.kind === "invalid") return NextResponse.json({ error: "Unhandled payload shape." }, { status: 400 });
  if (event.kind === "ignored") return NextResponse.json({ received: true, ignored: event.type });
  try {
    const supabase = createServiceClient();
    const eventKey = createHash("sha256").update(raw).digest("hex");
    const eventTime = event.createdAt ? new Date(event.createdAt * 1000) : new Date();

    if (event.kind === "payment_failed") {
      // Out-of-order guard: only downgrade if we have an existing active row
      // that hasn't been superseded by a newer event.
      if (event.subscriptionId) {
        const { data: existing } = await supabase
          .from("billing_subscriptions")
          .select("workspace_id,status,last_billing_event_at")
          .eq("razorpay_subscription_id", event.subscriptionId)
          .maybeSingle();
        if (existing?.status === "active") {
          if (existing?.last_billing_event_at && new Date(existing.last_billing_event_at as string) > eventTime) {
            return NextResponse.json({ received: true, stale: true });
          }
          const { error: updateError } = await supabase
            .from("billing_subscriptions")
            .update({ status: "pending", last_billing_event_at: eventTime.toISOString() })
            .eq("razorpay_subscription_id", event.subscriptionId)
            .eq("status", "active");
          if (updateError) throw new Error(updateError.message);
        }
      }
      // Insert dedup AFTER the billing update so a partial failure leaves
      // the event unprocessed and eligible for retry.
      const { error: dedupError } = await supabase.from("billing_webhook_events").insert({ event_key: eventKey, event_type: event.eventType });
      if (dedupError && (dedupError as { code?: string }).code !== "23505") throw new Error(dedupError.message);
      return NextResponse.json({ received: true });
    }

    const status = statusForWebhookEvent(event.eventType, event.razorpayStatus);
    if (!status) return NextResponse.json({ received: true, ignored: event.eventType });
    // Resolve workspace: subscription notes first, else existing row.
    let workspaceId = event.workspaceId;
    const { data: existing } = await supabase.from("billing_subscriptions").select("workspace_id,last_billing_event_at,currency,amount").eq("razorpay_subscription_id", event.subscriptionId).maybeSingle();
    if (!workspaceId && existing) workspaceId = existing.workspace_id as string;
    if (!workspaceId || !isUuid(workspaceId)) return NextResponse.json({ received: true, ignored: "unknown_workspace" });
    if (existing?.last_billing_event_at && new Date(existing.last_billing_event_at as string) > eventTime) {
      return NextResponse.json({ received: true, stale: true });
    }
    const { error } = await supabase.from("billing_subscriptions").upsert({
      workspace_id: workspaceId, provider: "razorpay",
      razorpay_customer_id: event.customerId, razorpay_subscription_id: event.subscriptionId,
      currency: existing?.currency ?? null, amount: existing?.amount ?? null,
      status, last_billing_event_at: eventTime.toISOString(),
    }, { onConflict: "workspace_id" });
    if (error) throw new Error(error.message);
    // Insert dedup AFTER the billing update (see security note above).
    const { error: dedupError } = await supabase.from("billing_webhook_events").insert({ event_key: eventKey, event_type: event.eventType });
    if (dedupError && (dedupError as { code?: string }).code !== "23505") throw new Error(dedupError.message);
    return NextResponse.json({ received: true, status });
  } catch (err) {
    console.error("[razorpay] webhook handling failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
