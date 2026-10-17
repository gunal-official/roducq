import { ArrowRight, Check, Minus } from "lucide-react";

import { PRICING_SECTION } from "@/app/(marketing)/home/content";
import { PLAN_TIERS, PRICES_UNCONFIGURED_NOTE, type PlanTier } from "@/app/(marketing)/pricing/plans";
import { cn } from "@/lib/utils";

import { GhostLink, PrimaryLink, SecondaryLink } from "./Buttons";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * Pricing — the reference's tier band, priced from live config.
 *
 * NO PRICE IS TYPED HERE. The free tier's zero is the only literal; the
 * paid row is the operator's RAZORPAY_PLANS read through getPricesConfig
 * and formatted by formatPrice, exactly as app/(marketing)/pricing/page.tsx
 * does. When billing is not configured, the card says so in the words
 * plans.ts already publishes instead of showing a number nobody can be
 * charged. That is why this component takes props from the server page
 * rather than reading env itself: the landing page stays a plain server
 * component and the money still comes from one place.
 *
 * NO BILLING TOGGLE. The reference has a two-interval switch. roducq has
 * one recurring monthly price per currency and no yearly price to charge
 * (ANNUAL_PRICES is empty), so an interval toggle here would advertise a
 * saving that cannot be billed. The honest comparison lives on /pricing.
 */
export interface HomePricingProps {
  /** Pre-formatted price lines from the live Razorpay config (amount + currency code). */
  priceLines: string[];
  /** False when RAZORPAY_PLANS is absent, so no price row is invented. */
  billingConfigured: boolean;
}

export function PricingSection({
  priceLines,
  billingConfigured,
}: HomePricingProps) {
  return (
    <section className="bg-lm-canvas-alt">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <SectionHeading
            eyebrow={PRICING_SECTION.eyebrow}
            before={PRICING_SECTION.titleBefore}
            after={PRICING_SECTION.titleAfter}
            intro={PRICING_SECTION.intro}
          />
        </Reveal>

        <ul className="mt-12 grid items-start gap-2.5 md:mt-16 lg:grid-cols-3">
          {PLAN_TIERS.map((tier, index) => (
            <Reveal key={tier.slug} as="li" delay={index * 90}>
              <PricingCard
                tier={tier}
                priceLines={priceLines}
                billingConfigured={billingConfigured}
              />
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-10 text-center md:mt-12">
          <GhostLink href={PRICING_SECTION.cta.href}>
            {PRICING_SECTION.cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </GhostLink>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * A pre-formatted line like "NN CUR" splits into `{ amount, currency }`.
 *
 * The amount and the currency are set at different sizes in the reference's
 * tier cards, so the pre-formatted line has to be split rather than
 * re-formatted here — the number itself still comes from formatPrice, which
 * is the only place a price is rendered from a raw amount.
 */
function splitPrice(line: string): { amount: string; currency: string } {
  const match = line.match(/^(.*?)\s*([A-Z]{3})$/);
  return match
    ? { amount: match[1].trim(), currency: match[2] }
    : { amount: line, currency: "" };
}

function PricingCard({
  tier,
  priceLines,
  billingConfigured,
}: { tier: PlanTier; priceLines: string[]; billingConfigured: boolean }) {
  const featured = Boolean(tier.badge);

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lm-card border p-5 shadow-lm-sm md:p-6.5",
        featured
          ? "border-lm-border-emphasis bg-lm-card shadow-lm-lg"
          : "border-lm-border-soft bg-lm-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lm-10 font-lm-semibold uppercase tracking-[0.18em] text-lm-muted">
            {tier.eyebrow}
          </p>
          <h3 className="mt-2 font-lm-bold tracking-[-0.015em] text-lm-22 text-lm-ink">
            {tier.name}
          </h3>
        </div>
        {featured ? (
          <span className="shrink-0 rounded-lm-pill bg-lm-accent px-2.5 py-1 text-lm-10 font-lm-bold uppercase tracking-[0.12em] text-lm-on-accent">
            {tier.badge}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-lm-12 leading-relaxed text-lm-ink-soft">{tier.tagline}</p>

      {/* The money row. One source of truth: the free tier is $0 because
          billing_subscriptions has no row for it; the configured tier shows
          what Razorpay would actually charge; the contact tier publishes no
          number because there is no number to publish. */}
      <div className="mt-5 border-t border-lm-border-soft pt-4.5">
        {tier.pricing === "free" ? (
          <p className="font-lm-bold text-lm-54 leading-none tracking-[-0.03em] text-lm-ink">
            $0
            <span className="ml-2 font-lm-regular text-lm-12 tracking-normal text-lm-muted">
              / month
            </span>
          </p>
        ) : tier.pricing === "configured" ? (
          billingConfigured && priceLines.length > 0 ? (
            <p className="font-lm-bold text-lm-54 leading-none tracking-[-0.03em] text-lm-ink">
              {splitPrice(priceLines[0]).amount}
              <span className="ml-2 font-lm-regular text-lm-12 tracking-normal text-lm-muted">
                {splitPrice(priceLines[0]).currency} / month
              </span>
            </p>
          ) : (
            <p className="text-lm-14 leading-relaxed text-lm-muted-readable">
              {PRICES_UNCONFIGURED_NOTE}
            </p>
          )
        ) : (
          <p className="font-lm-bold text-lm-29 leading-none tracking-[-0.02em] text-lm-ink">
            Custom
          </p>
        )}
        <p className="mt-2 text-lm-12 text-lm-muted">{tier.billingNote}</p>
        {tier.pricing === "configured" && billingConfigured && priceLines.length > 1 ? (
          <p className="mt-1.5 text-lm-12 text-lm-muted">
            Also available in {priceLines.slice(1).join(", ")}
          </p>
        ) : null}
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-lm-12 text-lm-ink-soft">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-lm-success" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
        {tier.planned?.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-lm-12 text-lm-muted">
            <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {feature}
              <span className="ml-1.5 rounded-lm-chip bg-lm-surface-muted px-1.5 py-0.5 text-lm-10 font-lm-semibold text-lm-muted-readable">
                planned
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {tier.cta.primary ? (
          <PrimaryLink href={tier.cta.href} className="w-full">
            {tier.cta.label}
          </PrimaryLink>
        ) : (
          <SecondaryLink href={tier.cta.href} className="w-full">
            {tier.cta.label}
          </SecondaryLink>
        )}
      </div>
    </div>
  );
}
