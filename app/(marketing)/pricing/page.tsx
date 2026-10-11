import type { Metadata } from "next";
import { Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PricingPlans } from "./pricing-plans";
import {
  ANNUAL_PRICES,
  buildAnnualView,
  buildMonthlyView,
  FOOTER_NOTE,
  HERO,
  type BillingInterval,
  type IntervalView,
} from "./plans";
import { formatPrice, getPricingOffer, getPricesConfig } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Pricing — roducq",
  description:
    "roducq pricing: three ways to use the same product. The whole pipeline is free — team, templates and webhooks included. The paid plan is a Stripe subscription per workspace in your currency, never per seat. No brief, seat or AI limits.",
};

/**
 * /pricing (redesign, 2026-10-10).
 *
 * Server component by design: this is the only place that reads billing
 * config, and it passes pre-rendered price lines down to the client
 * toggle. The Monthly tab carries the operator's real STRIPE_PRICES; the
 * Annual tab carries what exists for annual billing today, which is
 * nothing — so it renders the honest "not offered yet" note and no
 * discount chip instead of a saving nobody can be charged.
 *
 * When Stripe billing is configured, an optional launch-offer callout
 * can appear above the tiers (see lib/stripe.ts → getPricingOffer). It
 * is hidden when billing is off, or when PRICING_OFFER_TEXT="".
 *
 * Tier copy lives in ./plans.ts; the card/toggle markup in
 * ./pricing-plans.tsx. Structural + truthfulness tests:
 * tests/components/pricing.test.ts. Responsive harness route:
 * scripts/verify-responsive.mjs → slug "marketing-pricing".
 */
export default function PricingPage() {
  const pricesConfig = getPricesConfig();
  const monthlyPrices = pricesConfig.ok ? pricesConfig.prices : [];

  const monthlyLines = monthlyPrices.map(
    (p) => `${formatPrice(p.amount, p.currency)} ${p.currency}`
  );

  const views: Record<BillingInterval, IntervalView> = {
    monthly: buildMonthlyView(monthlyLines, pricesConfig.ok),
    annual: buildAnnualView([], monthlyPrices, ANNUAL_PRICES),
  };

  const offer = getPricingOffer(pricesConfig.ok);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {HERO.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {HERO.title}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          {HERO.intro}
        </p>
      </header>

      {offer ? (
        <div
          className="mx-auto mt-10 flex max-w-3xl flex-col items-center gap-3 rounded-xl border border-highlight/40 bg-highlight-soft px-5 py-4 text-center sm:flex-row sm:gap-4 sm:text-left"
          data-testid="pricing-offer"
          role="note"
          aria-label="Pricing offer"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-highlight/15">
            <Ticket className="h-5 w-5 text-highlight" aria-hidden="true" />
          </span>
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="default" className="text-[11px]">
                {offer.badge}
              </Badge>
              <span className="font-mono text-sm font-semibold tracking-wide text-accent">
                {offer.code}
              </span>
            </div>
            <p className="text-sm text-text">{offer.text}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-12">
        <PricingPlans views={views} />
      </div>

      <p className="mx-auto mt-12 max-w-3xl border-t border-border pt-6 text-center text-xs leading-relaxed text-muted-foreground">
        {FOOTER_NOTE}{" "}
        <a
          href="mailto:hello@roducq.dev"
          className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-2 transition-colors hover:text-text"
        >
          Questions? Get in touch
        </a>
        .
      </p>
    </div>
  );
}
