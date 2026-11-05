"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Mail, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openRazorpayCheckout } from "@/lib/razorpay-client";

const BILLING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    cadence: "/ month",
    seats: "1 seat",
    description: "A focused home for solo client work.",
    features: ["Briefs and proposals", "One workspace seat", "Monthly billing"],
    featured: false,
  },
  {
    id: "team",
    name: "Team",
    price: "$79",
    cadence: "/ month",
    seats: "Up to 5 seats",
    description: "More room for a small agency to collaborate.",
    features: ["Everything in Starter", "Task plans and client updates", "Up to five occupied seats"],
    featured: true,
  },
  {
    id: "studio",
    name: "Studio",
    price: "$199",
    cadence: "/ month",
    seats: "Up to 15 seats",
    description: "A tailored setup for growing client teams.",
    features: ["Everything in Team", "Studio workspace tools", "Guided onboarding"],
    featured: false,
  },
] as const;

interface PricingTableProps {
  workspaceName: string;
  userEmail: string;
}

export function PricingTable({ workspaceName, userEmail }: PricingTableProps) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  async function startCheckout(planId: "starter" | "team") {
    if (loadingPlan) return;
    setNotice(null);
    setLoadingPlan(planId);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // planId is the public tier slug, not a provider Plan ID. The API
        // resolves the trusted Razorpay Plan ID from its server-side catalog.
        body: JSON.stringify({
          planId,
          tier: planId,
          request_key: crypto.randomUUID(),
        }),
      });
      const payload = await response.json().catch(() => null) as {
        subscriptionId?: string;
        keyId?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.subscriptionId || !payload.keyId?.startsWith("rzp_test_")) {
        throw new Error(payload?.error || "Checkout is not available right now. Please try again.");
      }

      await openRazorpayCheckout({
        subscriptionId: payload.subscriptionId,
        keyId: payload.keyId,
        userEmail,
        workspaceName,
        onSuccess: () => {
          setNotice("Payment submitted. Your plan will update when the payment is confirmed.");
          router.refresh();
        },
        onError: (error) => setNotice(error.message),
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          {BILLING_PLANS.map((plan) => {
            const isStudio = plan.id === "studio";
            const isLoading = loadingPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${plan.featured ? "border-accent shadow-card ring-1 ring-accent/25" : ""}`}
              >
                {plan.featured && (
                  <Badge className="absolute right-4 top-4 bg-accent text-accent-foreground">Popular</Badge>
                )}
                <CardHeader className="pb-4">
                  <p className="text-sm font-semibold text-muted-foreground">{plan.name}</p>
                  <CardTitle className="flex items-baseline gap-1 text-3xl">
                    <span>{plan.price}</span>
                    <span className="text-sm font-medium text-muted-foreground">{plan.cadence}</span>
                  </CardTitle>
                  <p className="text-sm font-medium text-text">{plan.seats}</p>
                  <p className="min-h-10 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm leading-5 text-text">
                        <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.featured ? "default" : "outline"}
                    disabled={Boolean(loadingPlan)}
                    onClick={() => isStudio ? setContactOpen(true) : void startCheckout(plan.id)}
                    aria-label={isStudio ? "Talk to us about Studio" : `Choose ${plan.name}`}
                  >
                    {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : isStudio ? <Mail aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                    {isLoading ? "Starting secure checkout…" : isStudio ? "Talk to us" : "Choose plan"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        <div className="flex items-start gap-2 rounded-control border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <p>Starter and Team checkout currently runs in Razorpay Test Mode. Studio is available by contacting our team.</p>
        </div>
        {notice && (
          <p role="status" className="rounded-control border border-border bg-card px-4 py-3 text-sm text-text">
            {notice}
          </p>
        )}
      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Let’s talk about Studio</DialogTitle>
            <DialogDescription>
              Tell us about your team and the way you work. We’ll help you find the right setup.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-control bg-muted/50 p-4 text-sm text-muted-foreground">
            Studio is arranged with our team and does not start an online checkout.
          </div>
          <DialogFooter>
            <Button asChild>
              <a href="mailto:contact@nanexi.com?subject=roducq%20Studio%20enquiry">
                <Mail aria-hidden="true" /> Email contact@nanexi.com
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
