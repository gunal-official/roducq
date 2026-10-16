"use client";
/** Cancel Razorpay subscription (at cycle end) — owner-gated server action;
 * no Stripe-style portal exists for Razorpay, cancellation lives here. */
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cancelRazorpaySubscription } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
export function ManageBillingButton() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <Button type="button" variant="outline" disabled={pending} onClick={() => startTransition(async () => {
      const result = await cancelRazorpaySubscription();
      toast(result?.error ?? "Cancellation scheduled — Pro stays active until the current cycle ends.");
      if (!result?.error) window.location.reload();
    })}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      Cancel subscription
    </Button>
  );
}
