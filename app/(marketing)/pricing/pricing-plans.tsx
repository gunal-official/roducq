"use client";

/**
 * The /pricing toggle + tier cards (pricing redesign, 2026-10-10).
 *
 * Client-side for one reason only: the Monthly/Annual switch is local UI
 * state. Every number it can show arrives pre-rendered from the server
 * page as an IntervalView, so this bundle reads no env and can't invent a
 * price. When the active interval has nothing real to bill (annual, today)
 * the card shows the honest note instead of a figure.
 */

import Link from "next/link";
import { useState } from "react";
import { Building2, Check, Rocket, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BILLING_INTERVALS,
  INTERVAL_LABEL,
  PLAN_TIERS,
  type BillingInterval,
  type IntervalView,
  type PlanTier,
} from "./plans";

const TIER_ICON: Record<PlanTier["slug"], typeof Rocket> = {
  starter: Rocket,
  team: Users,
  studio: Building2,
};

const TIER_CHIP: Record<PlanTier["slug"], string> = {
  starter: "icon-chip-success",
  team: "icon-chip-accent",
  studio: "icon-chip-muted",
};

function PriceRow({
  tier,
  view,
}: {
  tier: PlanTier;
  view: IntervalView;
}) {
  if (tier.pricing === "free") {
    return (
      <p className="font-display text-3xl font-bold tracking-tight">
        $0
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">
          forever
        </span>
      </p>
    );
  }
  if (tier.pricing === "contact") {
    return (
      <p className="font-display text-3xl font-bold tracking-tight">
        Let&apos;s talk
      </p>
    );
  }
  // The configured (paid) tier — the only row that ever shows a figure, and
  // it shows exactly what the operator's Stripe config says.
  if (!view.available) {
    return (
      <p className="text-sm text-muted-foreground">
        {view.unavailableNote ?? "Billing isn't configured yet."}
      </p>
    );
  }
  return (
    <p className="font-display text-3xl font-bold leading-tight tracking-tight">
      {view.lines.join("  ·  ")}
      <span className="ml-1.5 text-sm font-normal text-muted-foreground">
        per workspace
      </span>
    </p>
  );
}

export function PricingPlans({
  views,
}: {
  views: Record<BillingInterval, IntervalView>;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const view = views[interval];
  // The "Save N%" chip belongs to the Annual tab and only exists when real
  // annual prices back the percentage — null today, so nothing renders.
  const annualLabel = views.annual.discountLabel;

  return (
    <div>
      <div
        className="flex flex-wrap items-center justify-center gap-3"
        role="group"
        aria-label="Billing period"
      >
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {BILLING_INTERVALS.map((value) => {
            const active = interval === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setInterval(value)}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-text"
                )}
              >
                {INTERVAL_LABEL[value]}
                {value === "annual" && annualLabel ? (
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {annualLabel}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-3">
        {PLAN_TIERS.map((tier) => {
          const Icon = TIER_ICON[tier.slug];
          const highlighted = tier.slug === "team";
          return (
            <Card
              key={tier.slug}
              className={cn(
                "flex flex-col",
                highlighted && "border-highlight shadow-pop"
              )}
              data-tier={tier.slug}
            >
              <CardHeader className="space-y-3 border-b border-border px-5 py-5">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "icon-chip h-9 w-9",
                      TIER_CHIP[tier.slug]
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {tier.badge ? (
                    <Badge className="border-accent bg-accent-soft text-accent">
                      {tier.badge}
                    </Badge>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <p className="font-display text-xl font-bold tracking-tight">
                    {tier.name}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {tier.eyebrow}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">{tier.tagline}</p>
                <PriceRow tier={tier} view={view} />
                <p className="text-xs text-muted-foreground">
                  {tier.billingNote}
                </p>
              </CardHeader>

              <CardContent className="flex-1 space-y-4 p-5">
                <ul className="space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span className="text-text">{feature}</span>
                    </li>
                  ))}
                </ul>
                {tier.planned && tier.planned.length > 0 ? (
                  <ul className="space-y-2.5 border-t border-border pt-4">
                    {tier.planned.map((feature) => (
                      <li
                        key={feature}
                        className="flex gap-2.5 text-sm text-muted-foreground"
                      >
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                        <span>
                          {feature} <span className="italic">— planned</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>

              <CardFooter className="p-5 pt-0">
                <Button
                  asChild
                  variant={tier.cta.primary ? "default" : "outline"}
                  className="w-full"
                >
                  <Link href={tier.cta.href}>{tier.cta.label}</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
