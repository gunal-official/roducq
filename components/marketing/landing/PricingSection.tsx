import Link from "next/link";
import { ArrowUpRight, Check, Minus } from "lucide-react";

import {
  ENTERPRISE_COLUMN,
  PRICING_SECTION,
} from "@/app/(marketing)/home/content";
import {
  PLAN_TIERS,
  PRICES_UNCONFIGURED_NOTE,
  type PlanTier,
} from "@/app/(marketing)/pricing/plans";
import { clsx as cn } from "clsx";

import { GhostLink, PrimaryLink, SecondaryLink } from "./Buttons";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * Pricing — the reference's four-column tier band, shared with `/pricing`
 * (`app/(marketing)/pricing/plans.ts`) plus the fourth Enterprise column:
 *   1. Starter card ($29 / month, 1 seat)
 *   2. Featured Team card ("MOST POPULAR" badge, $79 / month, Up to 5 seats)
 *   3. Studio card ($199 / month, Up to 15 seats)
 *   4. Dark Enterprise premium card (Custom, `.lm-pricing-dark`, white CTA)
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
    <section id="pricing" className="scroll-mt-20 bg-lm-card">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <SectionHeading
            eyebrow={PRICING_SECTION.eyebrow}
            before={PRICING_SECTION.titleBefore}
            after={PRICING_SECTION.titleAfter}
            intro={PRICING_SECTION.intro}
            align="start"
          />
        </Reveal>

        <ul className="mt-12 grid items-stretch gap-3.5 md:mt-16 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_TIERS.map((tier, index) => (
            <Reveal
              key={tier.slug}
              as="li"
              delay={index * 80}
              className="h-full min-w-0"
            >
              <PricingCard
                tier={tier}
                priceLines={priceLines}
                billingConfigured={billingConfigured}
              />
            </Reveal>
          ))}

          {/* 4th column: Dark premium plan card matching Forma reference */}
          <Reveal as="li" delay={240} className="h-full min-w-0">
            <EnterprisePricingCard />
          </Reveal>
        </ul>

        <Reveal className="mt-10 text-center md:mt-12">
          <GhostLink
            href={PRICING_SECTION.cta.href}
            className="border-b border-lm-border-soft pb-1"
          >
            {PRICING_SECTION.cta.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </GhostLink>
        </Reveal>
      </div>
    </section>
  );
}

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
}: {
  tier: PlanTier;
  priceLines: string[];
  billingConfigured: boolean;
}) {
  const featured = Boolean(tier.badge);

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lm-card bg-lm-card",
        featured
          ? "border-2 border-lm-accent shadow-lm-lg"
          : "border border-lm-border-soft shadow-lm-sm"
      )}
    >
      {/* Full-width top banner on the featured "MOST POPULAR" plan */}
      {featured ? (
        <div className="bg-lm-accent px-4 py-2 text-center text-lm-12 font-lm-bold text-lm-on-accent">
          {tier.badge}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="min-w-0">
          <p className="text-lm-12 font-lm-semibold uppercase tracking-[0.14em] text-lm-muted">
            {tier.eyebrow}
          </p>
          <h3 className="mt-2 font-lm-semibold tracking-[-0.025em] text-lm-23 text-lm-ink lg:text-lm-21 xl:text-lm-23">
            {tier.name}
          </h3>
        </div>

        <p className="mt-2 text-lm-15 leading-relaxed text-lm-ink-soft">
          {tier.tagline}
        </p>

        <div className="mt-5 border-t border-lm-border-soft pt-4.5">
          <p className="font-lm-medium text-lm-36 tracking-[-0.07em] text-lm-ink lg:text-lm-35 xl:text-lm-46">
            {tier.priceDisplay ?? "$0"}
            <span className="ml-2 font-lm-regular text-lm-14 tracking-normal text-lm-muted">
              {tier.cadence}
            </span>
          </p>

          <p className="mt-2 text-lm-12 text-lm-ink-soft">
            {tier.seatsLabel}
            {tier.additionalSeatsLabel ? ` · ${tier.additionalSeatsLabel}` : ""}
          </p>

          {tier.pricing === "configured" ? (
            billingConfigured && priceLines.length > 0 ? (
              <p className="mt-1.5 text-lm-12 text-lm-muted">
                Live checkout: {splitPrice(priceLines[0]).amount}{" "}
                {splitPrice(priceLines[0]).currency} / month
                {priceLines.length > 1
                  ? ` (also ${priceLines.slice(1).join(", ")})`
                  : ""}
              </p>
            ) : (
              <p className="mt-1.5 text-lm-12 leading-relaxed text-lm-muted-readable">
                {PRICES_UNCONFIGURED_NOTE}
              </p>
            )
          ) : (
            <p className="mt-1.5 text-lm-12 text-lm-muted">{tier.billingNote}</p>
          )}
        </div>

        <div className="mt-5">
          {featured ? (
            <PrimaryLink
              href={tier.cta.href}
              className="w-full whitespace-normal text-center leading-tight"
            >
              {tier.cta.label}
            </PrimaryLink>
          ) : (
            <SecondaryLink
              href={tier.cta.href}
              className="w-full whitespace-normal text-center leading-tight"
            >
              {tier.cta.label}
            </SecondaryLink>
          )}
        </div>

        <div className="mt-5 flex flex-1 flex-col border-t border-lm-border-soft pt-4.5">
          {tier.featuresHeading ? (
            <p className="mb-2.5 text-lm-10 font-lm-semibold uppercase tracking-[0.08em] text-lm-muted-label">
              {tier.featuresHeading}
            </p>
          ) : null}
          <ul className="flex flex-1 flex-col gap-2.5">
            {tier.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-lm-15 text-lm-ink-soft"
              >
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-lm-ink-accent"
                  aria-hidden="true"
                />
                <span>{feature}</span>
              </li>
            ))}
            {tier.planned?.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-lm-12 text-lm-muted"
              >
                <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {feature}
                  <span className="ml-1.5 rounded-lm-chip bg-lm-surface-muted px-1.5 py-0.5 text-lm-12 font-lm-semibold text-lm-ink-soft">
                    planned
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function EnterprisePricingCard() {
  return (
    <div className="lm-pricing-dark flex h-full flex-col rounded-lm-card border p-5 md:p-6">
      <div className="min-w-0">
        <p className="text-lm-12 font-lm-semibold uppercase tracking-[0.14em] text-lm-dark-muted">
          {ENTERPRISE_COLUMN.eyebrow}
        </p>
        <h3 className="mt-2 font-lm-semibold tracking-[-0.025em] text-lm-23 text-lm-dark-ink">
          {ENTERPRISE_COLUMN.name}
        </h3>
      </div>

      <p className="mt-2 text-lm-12 leading-relaxed text-lm-dark-muted">
        {ENTERPRISE_COLUMN.tagline}
      </p>

      <div className="mt-5 border-t border-lm-dark-border pt-4.5">
        <p className="font-lm-medium text-lm-36 tracking-[-0.07em] text-lm-dark-ink lg:text-lm-35 xl:text-lm-46">
          Custom
        </p>
        <p className="mt-2 text-lm-12 text-lm-dark-muted">
          {ENTERPRISE_COLUMN.billingNote}
        </p>
      </div>

      <div className="mt-5">
        <Link
          href={ENTERPRISE_COLUMN.cta.href}
          className="inline-flex h-11 min-h-11 w-full items-center justify-center rounded-lm-button bg-lm-card px-5 text-lm-15 font-lm-regular text-lm-ink shadow-lm-sm transition-colors duration-200 hover:bg-lm-surface-accent md:h-13"
        >
          {ENTERPRISE_COLUMN.cta.label}
          <span className="sr-only">(opens your email client)</span>
        </Link>
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5 border-t border-lm-dark-border pt-4.5">
        {ENTERPRISE_COLUMN.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 text-lm-12 text-lm-dark-ink"
          >
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-lm-accent"
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
