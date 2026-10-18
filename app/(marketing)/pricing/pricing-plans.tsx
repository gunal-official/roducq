"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";

import { Reveal } from "@/components/marketing/landing/Reveal";
import type { RazorpayPlanConfig } from "@/lib/razorpay";
import { cn } from "@/lib/utils";
import {
  ANNUAL_BADGE_LABEL,
  ANNUAL_PRICES,
  ANNUAL_UNAVAILABLE_HEADLINE,
  ANNUAL_UNAVAILABLE_NOTE,
  BILLING_INTERVALS,
  INTERVAL_LABEL,
  plansForInterval,
  type BillingInterval,
  type IntervalView,
} from "./plans";

export function PricingPlans({
  monthlyPrices,
  views,
}: {
  monthlyPrices: readonly RazorpayPlanConfig[];
  views: Record<BillingInterval, IntervalView>;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const tiers = plansForInterval(interval, monthlyPrices);
  const view = views[interval];
  const isAnnualPending =
    interval === "annual" && !view.available && ANNUAL_PRICES.length === 0;

  return (
    <div className="mt-10 md:mt-12">
      {/* Billing Period Toggle (Segmented Pill: Monthly | Annual + Save 17% badge) */}
      <Reveal as="div" delay={80} className="flex flex-col items-center">
        <div
          role="group"
          aria-label="Billing period"
          className="lm-pricing-toggle-track inline-flex items-center p-1"
        >
          {BILLING_INTERVALS.map((value) => {
            const selected = interval === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setInterval(value)}
                data-testid={`billing-toggle-${value}`}
                className={cn(
                  "relative inline-flex min-h-11 items-center gap-2 rounded-lm-pill px-5 py-2 text-lm-14 font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  selected
                    ? "font-semibold text-lm-ink"
                    : "text-lm-ink-soft hover:text-lm-ink"
                )}
              >
                {selected ? (
                  <motion.span
                    layoutId="pricing-billing-pill"
                    aria-hidden="true"
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="lm-pricing-toggle-pill-active absolute inset-0 rounded-lm-pill"
                  />
                ) : null}
                <span className="relative z-10">{INTERVAL_LABEL[value]}</span>
                {value === "annual" ? (
                  <span
                    data-testid="annual-save-badge"
                    className="lm-pricing-save-badge relative z-10 inline-flex items-center rounded-lm-pill px-2.5 py-0.5 text-lm-12 font-semibold leading-none"
                  >
                    {view.discountLabel ?? ANNUAL_BADGE_LABEL}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Safe Annual-Billing Pending Notice (no fabricated annual price or silent monthly checkout) */}
        {isAnnualPending ? (
          <div
            role="status"
            aria-live="polite"
            data-testid="annual-unavailable-banner"
            className="lm-pricing-annual-notice mt-5 max-w-2xl px-5 py-3.5 text-center text-lm-13 leading-lm-normal text-lm-ink-soft"
          >
            <p className="font-semibold text-lm-ink">
              {ANNUAL_UNAVAILABLE_HEADLINE}
            </p>
            <p className="mt-1 text-lm-12 text-lm-muted-readable">
              {view.unavailableNote ?? ANNUAL_UNAVAILABLE_NOTE}
            </p>
          </div>
        ) : null}
      </Reveal>

      {/* Three Horizontal Pricing Cards on Desktop (Starter | Team | Studio) */}
      <div
        data-testid="pricing-cards-grid"
        className="mt-10 grid grid-cols-1 items-stretch gap-6 lg:mt-14 lg:grid-cols-3 lg:gap-7"
      >
        {tiers.map((tier, index) => {
          const isFeatured = tier.featured;

          return (
            <motion.article
              key={tier.slug}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.62,
                delay: (120 + index * 60) / 1000,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={
                {
                  "--lm-hero-delay": `${120 + index * 60}ms`,
                } as React.CSSProperties
              }
              aria-label={`${tier.name} plan`}
              data-tier={tier.slug}
              data-featured={isFeatured ? "true" : "false"}
              className={cn(
                "lm-hero-in relative flex h-full flex-col justify-between p-6 sm:p-8",
                isFeatured ? "lm-pricing-card-featured" : "lm-pricing-card"
              )}
            >
                {/* Top "MOST POPULAR" Badge on Team Card */}
                {tier.badge ? (
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <span
                      data-testid="most-popular-badge"
                      className="lm-pricing-popular-badge inline-flex items-center rounded-lm-pill px-3 py-1 text-lm-10 font-bold uppercase tracking-lm-label"
                    >
                      {tier.badge}
                    </span>
                  </div>
                ) : null}

                <div>
                  {/* Plan Name + Audience Description */}
                  <div>
                    <h2 className="font-display text-lm-21 font-semibold tracking-lm-title text-lm-ink xl:text-lm-23">
                      {tier.name}
                    </h2>
                    <p className="mt-1.5 text-lm-14 leading-lm-normal text-lm-ink-soft sm:text-lm-15">
                      {tier.tagline}
                    </p>
                  </div>

                  {/* Price Row + Seat Limit + Additional Seat Pricing */}
                  <div className="mt-6 border-t border-lm-border-soft pt-6">
                    {tier.resolvedPriceDisplay ? (
                      <div className="flex items-baseline gap-1.5">
                        <span
                          data-testid={`plan-price-${tier.slug}`}
                          className="font-display text-lm-36 font-medium leading-none tracking-lm-price text-lm-ink xl:text-lm-46"
                        >
                          {tier.resolvedPriceDisplay}
                        </span>
                        {tier.resolvedCadence ? (
                          <span className="text-lm-14 font-normal text-lm-muted-readable">
                            {tier.resolvedCadence}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        data-testid={`plan-price-pending-${tier.slug}`}
                        className="py-1"
                      >
                        <p className="text-lm-15 font-semibold text-lm-ink">
                          Annual pricing pending configuration
                        </p>
                        <p className="mt-1 text-lm-12 leading-lm-normal text-lm-muted-readable">
                          Switch to Monthly ({tier.priceDisplay} {tier.cadence}) or contact us for an annual invoice.
                        </p>
                      </div>
                    )}

                    {/* Seat limit & additional seat pricing */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-lm-13 text-lm-ink-soft">
                      <span className="font-medium text-lm-ink">
                        {tier.seatsLabel}
                      </span>
                      {tier.additionalSeatsLabel ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="text-lm-muted-readable"
                          >
                            ·
                          </span>
                          <span className="text-lm-muted-readable">
                            {tier.additionalSeatsLabel}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {tier.priceNote && !isAnnualPending ? (
                      <p className="mt-2 text-lm-12 leading-lm-normal text-lm-muted-readable">
                        {tier.priceNote}
                      </p>
                    ) : null}
                  </div>

                  {/* Plan CTA Button (Forma placement: directly below price/seat block, above features) */}
                  <div className="mt-6">
                    {tier.ctaDisabled ? (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        data-testid={`plan-cta-disabled-${tier.slug}`}
                        className={cn(
                          "inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center px-5 py-3 text-lm-15 font-semibold opacity-60",
                          isFeatured
                            ? "lm-pricing-cta-primary"
                            : "lm-pricing-cta-light"
                        )}
                      >
                        {tier.cta.label} (Monthly only)
                      </button>
                    ) : (
                      <Link
                        href={tier.cta.href}
                        data-testid={`plan-cta-${tier.slug}`}
                        className={cn(
                          "inline-flex min-h-12 w-full items-center justify-center px-5 py-3 text-lm-15 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          isFeatured
                            ? "lm-pricing-cta-primary"
                            : "lm-pricing-cta-light"
                        )}
                      >
                        {tier.cta.label}
                      </Link>
                    )}
                  </div>

                  {/* Feature List Section Header + Items */}
                  <div className="mt-6 border-t border-lm-border-soft pt-6">
                    {tier.featuresHeading ? (
                      <p className="mb-3.5 text-lm-10 font-semibold uppercase tracking-lm-label text-lm-muted-label sm:text-lm-12">
                        {tier.featuresHeading}
                      </p>
                    ) : (
                      <p className="mb-3.5 text-lm-10 font-semibold uppercase tracking-lm-label text-lm-muted-label sm:text-lm-12">
                        INCLUDES
                      </p>
                    )}

                    <ul
                      aria-label={`${tier.name} features`}
                      className="space-y-3"
                    >
                      {tier.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 text-lm-13 leading-lm-normal text-lm-ink sm:text-lm-15"
                        >
                          <Check
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              isFeatured
                                ? "lm-pricing-check-featured"
                                : "text-lm-ink-accent"
                            )}
                            aria-hidden="true"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
