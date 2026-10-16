/** Razorpay webhooks — raw-body HMAC verification (X-Razorpay-Signature,
 * RAZORPAY_WEBHOOK_SECRET), event allowlist, idempotency via
 * billing_webhook_events (sha256 of raw body), out-of-order guard via
 * last_billing_event_at. Service-role writes only. No signature material logged. */
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
    const { error: dedupError } = await supabase.from("billing_webhook_events").insert({ event_key: eventKey, event_type: event.eventType });
    if (dedupError) {
      if ((dedupError as { code?: string }).code === "23505") return NextResponse.json({ received: true, duplicate: true });
      throw new Error(dedupError.message);
    }
    if (event.kind === "payment_failed") {
      if (event.subscriptionId) {
        await supabase.from("billing_subscriptions").update({ status: "pending" }).eq("razorpay_subscription_id", event.subscriptionId).eq("status", "active");
      }
      return NextResponse.json({ received: true });
    }
    const status = statusForWebhookEvent(event.eventType, event.razorpayStatus);
    if (!status) return NextResponse.json({ received: true, ignored: event.eventType });
    // Resolve workspace: subscription notes first, else existing row.
    let workspaceId = event.workspaceId;
    const { data: existing } = await supabase.from("billing_subscriptions").select("workspace_id,last_billing_event_at,currency,amount").eq("razorpay_subscription_id", event.subscriptionId).maybeSingle();
    if (!workspaceId && existing) workspaceId = existing.workspace_id as string;
    if (!workspaceId || !isUuid(workspaceId)) return NextResponse.json({ received: true, ignored: "unknown_workspace" });
    const eventTime = event.createdAt ? new Date(event.createdAt * 1000) : new Date();
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
    return NextResponse.json({ received: true, status });
  } catch (err) {
    console.error("[razorpay] webhook handling failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }
}
