"use client";
/** Razorpay Checkout trigger: server creates the subscription (plan from server env),
 * browser opens official Checkout.js, result is POSTed to /api/razorpay/verify —
 * paid access is never granted from this handler alone. */
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createRazorpayCheckout } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatPrice, type RazorpayPlanConfig } from "@/lib/razorpay";

declare global { interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } } }
function loadCheckoutJs(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true); script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
export function PlanCheckoutButton({ prices }: { prices: RazorpayPlanConfig[] }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [currency, setCurrency] = useState(prices[0]?.currency ?? "");
  const selected = prices.find((p) => p.currency === currency) ?? prices[0];
  return (
    <div className="flex flex-wrap items-center gap-3">
      {prices.length > 1 ? (
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger aria-label="Billing currency" className="h-11 min-h-11 w-auto gap-2"><SelectValue placeholder="Currency" /></SelectTrigger>
          <SelectContent>{prices.map((p) => (<SelectItem key={p.currency} value={p.currency}>{formatPrice(p.amount, p.currency)} {p.currency}</SelectItem>))}</SelectContent>
        </Select>
      ) : null}
      <Button type="button" variant="outline" disabled={pending || !selected} onClick={() => {
        if (!selected) return; const chosen = selected;
        startTransition(async () => {
          const result = await createRazorpayCheckout(chosen.currency);
          if ("error" in result) { toast(result.error); return; }
          if (!(await loadCheckoutJs()) || !window.Razorpay) { toast("Could not load Razorpay Checkout — check your connection and try again."); return; }
          const rzp = new window.Razorpay({
            key: result.keyId, subscription_id: result.subscriptionId, name: "RoduCQ", description: "RoduCQ Pro — per workspace / month",
            handler: async (response: unknown) => {
              const res = await fetch("/api/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(response) });
              const data = await res.json().catch(() => ({})) as { error?: string };
              toast(res.ok ? "Payment confirmed — your plan will update here shortly." : (data.error ?? "Payment verification failed."));
              if (res.ok) window.location.reload();
            },
            modal: { ondismiss: () => toast("Checkout closed — nothing was charged.") },
          });
          rzp.on("payment.failed", () => toast("Payment failed — nothing was charged. Please try again."));
          rzp.open();
        });
      }}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {selected ? `Upgrade to Pro — ${formatPrice(selected.amount, selected.currency)} ${selected.currency}` : "Upgrade to Pro"}
      </Button>
    </div>
  );
}
