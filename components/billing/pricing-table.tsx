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
    price: "₹2,900",
    cadence: "/ month",
    seats: "1 seat",
    description: "A focused home for solo client work.",
    features: ["Briefs and proposals", "One workspace seat", "Monthly billing"],
    featured: false,
  },
  {
    id: "team",
    name: "Team",
    price: "₹7,900",
    cadence: "/ month",
    seats: "Up to 5 seats",
    description: "More room for a small agency to collaborate.",
    features: ["Everything in Starter", "Task plans and client updates", "Up to five occupied seats"],
    featured: true,
  },
  {
    id: "studio",
    name: "Studio",
    // Contact-only: no Razorpay plan exists, so no per-month figure is shown.
    price: "Contact us",
    cadence: "",
    seats: "Up to 15 seats",
    description: "A tailored setup for growing client teams.",
    features: ["Everything in Team", "Studio workspace tools", "Guided onboarding"],
    featured: false,
  },
] as const;

/** The workspace's live subscription, resolved server-side. */
export interface CurrentSubscription {
  planId: string;
  status: string;
  paidThrough: string | null;
}

interface PricingTableProps {
  workspaceName: string;
  userEmail: string;
  current?: CurrentSubscription | null;
}

function planLabel(planId: string): string {
  return planId === "team" ? "Team"
    : planId === "starter" ? "Starter"
    : planId === "studio" ? "Studio"
    : planId === "pro" ? "Pro"
    : planId.charAt(0).toUpperCase() + planId.slice(1);
}

/** Format an ISO instant as a short local date; never throws on bad input. */
function formatPaidThrough(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The checkout API answers 409 with a stable `code` that names the exact reason
 * a reservation was refused. It was previously discarded, so every failure —
 * a missing migration, an empty plan catalog, an in-flight intent, a stale
 * schema cache — surfaced as the same undiagnosable sentence. Each entry here
 * says what the operator can actually do about it.
 */
const RESERVATION_FIXES: Record<string, string> = {
  plan_not_available:
    "No active Test Mode plan is configured for this tier. Add a row to razorpay_plan_catalog and set its state to active.",
  function_missing:
    "The billing database functions are not installed. Run the pending Stage 1B migration, then retry.",
  schema_cache_stale:
    "The database updated but the API layer has not reloaded it yet. Wait a moment and retry; if it persists, reload the schema cache.",
  intent_already_open:
    "A checkout for this plan is already in progress. Finish or abandon that payment, then try again.",
  subscription_exists:
    "This workspace already has an active subscription. Manage it instead of starting a new checkout.",
  not_authorized:
    "Only a workspace owner can start billing.",
  authentication_required:
    "Your session expired. Sign in again and retry.",
  permission_denied:
    "Billing permissions are not granted to your account. This is a deployment issue, not something you can fix from here.",
  reservation_not_returned:
    "The reservation returned no data. Retry once, then report it if it continues.",
  reservation_unavailable:
    "Billing is temporarily unreachable. Retry in a moment.",
  constraint_violation:
    "The request was rejected as invalid. Reload the page and try again.",
  not_found:
    "This workspace no longer exists. Reload the page.",
  invalid_checkout_request:
    "The request was rejected before reaching the database. Reload the page and try again.",
  reservation_workspace_mismatch:
    "The reservation was created for a different workspace. Reload the page and retry.",
  database_error:
    "The database rejected the reservation for an unclassified reason. Check the server logs for the logged SQLSTATE.",
};

export function PricingTable({ workspaceName, userEmail, current }: PricingTableProps) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeCode, setNoticeCode] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  async function startCheckout(planId: "starter" | "team") {
    if (loadingPlan) return;
    setNotice(null);
    setNoticeCode(null);
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
        code?: string;
      } | null;

      if (!response.ok || !payload?.subscriptionId || !payload.keyId?.startsWith("rzp_test_")) {
        // Keep the machine-readable code so the notice can explain the fix
        // instead of just repeating the generic API sentence.
        setNoticeCode(payload?.code ?? null);
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
        {current && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
            <Check className="size-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="font-semibold text-text">
              Current plan: {planLabel(current.planId)}
            </span>
            <span className="text-muted-foreground">
              {current.status === "canceled" ? "· cancelled" : "· active"}
              {current.paidThrough
                ? ` · paid through ${formatPaidThrough(current.paidThrough)}`
                : ""}
            </span>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {BILLING_PLANS.map((plan) => {
            const isStudio = plan.id === "studio";
            const isLoading = loadingPlan === plan.id;
            const isCurrent = current?.planId === plan.id;
            const isEntitled = Boolean(current) && (current?.status === "active" || current?.status === "canceled");
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${plan.featured ? "border-accent shadow-card ring-1 ring-accent/25" : ""}`}
              >
                {isCurrent && isEntitled ? (
                  <Badge className="absolute right-4 top-4 bg-accent text-accent-foreground">Your plan</Badge>
                ) : plan.featured && (
                  <Badge className="absolute right-4 top-4 bg-accent text-accent-foreground">Popular</Badge>
                )}
                <CardHeader className="pb-4">
                  <p className="text-sm font-semibold text-muted-foreground">{plan.name}</p>
                  <CardTitle className="flex items-baseline gap-1 text-3xl">
                    <span>{plan.price}</span>
                    {plan.cadence && (
                      <span className="text-sm font-medium text-muted-foreground">{plan.cadence}</span>
                    )}
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
                    // A plan the workspace already pays for must not start a
                    // second subscription. Razorpay would happily create one;
                    // the reserve RPC then refuses with subscription_exists,
                    // which reads as an error rather than "you already have it".
                    disabled={Boolean(loadingPlan) || (isCurrent && isEntitled)}
                    onClick={() => isStudio ? setContactOpen(true) : void startCheckout(plan.id)}
                    aria-label={
                      isCurrent && isEntitled
                        ? `You are already on ${plan.name}`
                        : isStudio ? "Talk to us about Studio" : `Choose ${plan.name}`
                    }
                  >
                    {isLoading ? <Loader2 className="animate-spin" aria-hidden="true" /> : isStudio ? <Mail aria-hidden="true" /> : (isCurrent && isEntitled) ? <Check aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                    {isLoading ? "Starting secure checkout…"
                      : isStudio ? "Talk to us"
                      : (isCurrent && isEntitled) ? "Current plan"
                      : "Choose plan"}
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
          <div
            role="status"
            className="rounded-control border border-border bg-card px-4 py-3 text-sm text-text"
          >
            <p>{notice}</p>
            {noticeCode && (
              <p className="mt-2 text-muted-foreground">
                {RESERVATION_FIXES[noticeCode]
                  ?? "No specific guidance is available for this failure."}{" "}
                <span className="whitespace-nowrap font-mono text-xs">({noticeCode})</span>
              </p>
            )}
          </div>
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
