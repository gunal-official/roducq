/** Razorpay webhooks — thin HTTP shell. All rules live in lib/billing/webhook-processor.ts
 * and the atomic database function apply_razorpay_subscription_event.
 *
 * SECURITY: raw-body HMAC (X-Razorpay-Signature, RAZORPAY_WEBHOOK_SECRET), constant-time
 * compare, server-owned plan config, service-role writes only. The idempotency claim, the
 * ordering check, the workspace binding, the state change and the ledger record all run in
 * ONE database transaction: a failure rolls back everything, so Razorpay's retry (5xx) is
 * processed from a clean slate. No signature, secret, or payload is logged. */
import { NextResponse } from "next/server";
import { fetchRazorpaySubscription, getRazorpayPlansConfig, getRazorpayServerConfig } from "@/lib/razorpay";
import { processRazorpayWebhook } from "@/lib/billing/webhook-processor";
import { makeApplyEvent } from "@/lib/billing/apply-event";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const raw = await request.text();
  const plansConfig = getRazorpayPlansConfig();
  const serverConfig = getRazorpayServerConfig();

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }

  const result = await processRazorpayWebhook(
    {
      raw,
      signature: request.headers.get("x-razorpay-signature"),
      eventIdHeader: request.headers.get("x-razorpay-event-id"),
    },
    {
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
      plans: plansConfig.ok ? plansConfig.plans : [],
      apply: makeApplyEvent(supabase),
      fetchSubscription: async (subscriptionId) => {
        if (!serverConfig.ok) return { ok: false, error: "Billing is not configured." };
        return fetchRazorpaySubscription({ keyId: serverConfig.keyId, keySecret: serverConfig.keySecret, subscriptionId });
      },
    },
  );
  if (result.log) console.error(result.log);
  return NextResponse.json(result.body, { status: result.status });
}
