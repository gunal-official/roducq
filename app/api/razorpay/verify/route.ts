/** Verify a Razorpay subscription checkout. Authenticated + owner-only.
 * Verifies HMAC(payment_id|subscription_id), then fetches the subscription
 * from Razorpay server-side and checks plan + workspace notes before any
 * entitlement write. Client success alone grants nothing. */
import { NextResponse } from "next/server";
import { fetchRazorpaySubscription, findPlanById, getRazorpayPlansConfig, getRazorpayServerConfig, mapRazorpayStatus, verifyPaymentSignature } from "@/lib/razorpay";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const subscriptionId = typeof body?.razorpay_subscription_id === "string" ? body.razorpay_subscription_id : "";
  const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";
  if (!paymentId || !subscriptionId || !signature) return NextResponse.json({ error: "Missing Razorpay payment fields." }, { status: 400 });
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (context.role !== "owner") return NextResponse.json({ error: "Only workspace owners can manage billing." }, { status: 403 });
  const cfg = getRazorpayServerConfig();
  if (!cfg.ok) return NextResponse.json({ error: cfg.error }, { status: 500 });
  if (!verifyPaymentSignature({ paymentId, subscriptionId, signature, keySecret: cfg.keySecret })) {
    return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
  }
  const fetched = await fetchRazorpaySubscription({ keyId: cfg.keyId, keySecret: cfg.keySecret, subscriptionId });
  if (!fetched.ok) return NextResponse.json({ error: fetched.error }, { status: 502 });
  const sub = fetched.subscription;
  if (sub.notes?.workspace_id !== context.id) return NextResponse.json({ error: "Subscription does not belong to this workspace." }, { status: 403 });
  const plans = getRazorpayPlansConfig();
  const plan = plans.ok ? findPlanById(plans.plans, sub.plan_id) : null;
  if (!plan) return NextResponse.json({ error: "Subscription plan is not a configured RoduCQ plan." }, { status: 400 });
  const status = mapRazorpayStatus(sub.status);
  if (!status) return NextResponse.json({ error: "Unknown subscription status." }, { status: 502 });
  const supabase = createServiceClient();
  const { error } = await supabase.from("billing_subscriptions").upsert({
    workspace_id: context.id, provider: "razorpay", razorpay_customer_id: sub.customer_id,
    razorpay_subscription_id: sub.id, currency: plan.currency, amount: plan.amount, status,
  }, { onConflict: "workspace_id" });
  if (error) return NextResponse.json({ error: "Could not record subscription." }, { status: 500 });
  return NextResponse.json({ received: true, status, plan: status === "active" ? "pro" : "free" });
}
