/** Verify a Razorpay subscription checkout. Authenticated + owner-only.
 * Logic lives in lib/billing/checkout-verify.ts: HMAC(payment_id|subscription_id), a
 * server-side fetch from Razorpay, workspace + plan checks, then the same atomic
 * database function the webhook uses. Browser success alone grants nothing. */
import { NextResponse } from "next/server";
import { fetchRazorpaySubscription, getRazorpayPlansConfig, getRazorpayServerConfig } from "@/lib/razorpay";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { verifyRazorpayCheckout } from "@/lib/billing/checkout-verify";
import { makeApplyEvent } from "@/lib/billing/apply-event";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const cfg = getRazorpayServerConfig();
  if (!cfg.ok) return NextResponse.json({ error: cfg.error }, { status: 500 });
  const plans = getRazorpayPlansConfig();
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Could not record subscription." }, { status: 500 });
  }

  const result = await verifyRazorpayCheckout(
    {
      paymentId: typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "",
      subscriptionId: typeof body?.razorpay_subscription_id === "string" ? body.razorpay_subscription_id : "",
      signature: typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "",
      workspaceId: context.id,
      role: context.role,
    },
    {
      keyId: cfg.keyId,
      keySecret: cfg.keySecret,
      plans: plans.ok ? plans.plans : [],
      fetchSubscription: (subscriptionId) => fetchRazorpaySubscription({ keyId: cfg.keyId, keySecret: cfg.keySecret, subscriptionId }),
      apply: makeApplyEvent(supabase),
    },
  );
  if (result.log) console.error(result.log);
  return NextResponse.json(result.body, { status: result.status });
}
