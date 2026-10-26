import type { Metadata } from "next";
import { Ticket } from "lucide-react";

import { Reveal } from "@/components/marketing/landing/Reveal";
import { Badge } from "@/components/ui/badge";
import { formatPrice, getPricesConfig, getPricingOffer } from "@/lib/razorpay";
import { SOCIAL_IMAGE, TWITTER_IMAGE } from "@/lib/site";
import {
  ANNUAL_PRICES,
  buildAnnualView,
  buildMonthlyView,
  FOOTER_ITEMS,
  FOOTER_NOTE,
  HERO,
  type BillingInterval,
  type IntervalView,
} from "./plans";
import { PricingPlans } from "./pricing-plans";

const PRICING_TITLE = "Pricing — roducq";
const PRICING_DESCRIPTION =
  "Plans that scale with how your team works: Starter ($29/month), Team ($79/month), and Studio ($199/month). Start free and upgrade when your team is ready to turn every client conversation into a plan everyone trusts.";

export const metadata: Metadata = {
  title: PRICING_TITLE,
  description: PRICING_DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    url: "/pricing",
    title: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: PRICING_TITLE,
    description: PRICING_DESCRIPTION,
    images: [TWITTER_IMAGE],
  },
};

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
    <section
      aria-labelledby="pricing-page-heading"
      className="py-13 md:py-22 lg:py-30"
    >
      <div className="lm-shell">
        {/* Pricing Header: Eyebrow + Main Heading + Description.

            THE LCP RULE (PR #53), APPLIED. This block used to sit inside
            <Reveal>, whose hidden state is real CSS: the marketing layout
            adds `.lm-js` before first paint, and `.lm-js .lm-reveal` sets
            opacity 0 until Motion hydrates. The h1 here is this route's LCP
            element (measured, docs/RODUCQ_MARKETING_CONSISTENCY_AUDIT.md
            §7), so the first thing a slow connection painted was an
            invisible headline — exactly the pattern PR #53 forbids. The
            hero now uses the shared `.lm-hero-in` ladder the homepage and
            the /solutions, /features, /integrations and /changelog heroes
            already use: opacity stays 1 in every keyframe and only the
            clip-path band and a small rise travel, so the headline is laid
            out and painted on the first frame, with or without JavaScript
            and under prefers-reduced-motion. */}
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="lm-pricing-eyebrow lm-hero-in text-lm-13 font-semibold uppercase tracking-lm-eyebrow sm:text-lm-14"
            style={
              {
                "--lm-hero-delay": "0ms",
                "--lm-hero-duration": "800ms",
              } as React.CSSProperties
            }
          >
            {HERO.eyebrow}
          </p>
          <h1
            id="pricing-page-heading"
            style={
              {
                "--lm-hero-delay": "80ms",
                "--lm-hero-duration": "900ms",
                "--lm-hero-rise": "16px",
              } as React.CSSProperties
            }
            className="lm-hero-in mt-3 font-display text-lm-32 font-normal leading-lm-heading tracking-lm-display text-lm-ink md:text-lm-34 min-[1200px]:text-lm-54"
          >
            {HERO.title}
          </h1>
          <p
            style={
              {
                "--lm-hero-delay": "450ms",
                "--lm-hero-duration": "800ms",
              } as React.CSSProperties
            }
            className="lm-hero-in mx-auto mt-4 max-w-xl text-lm-14 leading-lm-body text-lm-ink-soft min-[1200px]:text-lm-18"
          >
            {HERO.subtitle}
          </p>
        </div>

        {/* Optional Launch Offer Banner (from getPricingOffer() in lib/razorpay.ts) */}
        {offer ? (
          <Reveal as="div" delay={60}>
            <div
              className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3 rounded-xl border border-highlight/40 bg-highlight-soft px-5 py-4 text-center sm:flex-row sm:gap-4 sm:text-left"
              data-testid="pricing-offer"
              role="note"
              aria-label="Pricing offer"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-highlight/15">
                <Ticket className="h-5 w-5 text-highlight" aria-hidden="true" />
              </span>
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Badge variant="default" className="text-xs">
                    {offer.badge}
                  </Badge>
                  <span className="font-mono text-sm font-semibold tracking-wide text-accent">
                    {offer.code}
                  </span>
                </div>
                <p className="text-sm text-text">{offer.text}</p>
              </div>
            </div>
          </Reveal>
        ) : null}

        {/* Billing Period Toggle + Three Horizontal Pricing Cards */}
        <PricingPlans monthlyPrices={monthlyPrices} views={views} />

        {/* Pricing Footnote Row below cards (exact PDF items + policy note) */}
        <div
          data-testid="pricing-footnote"
          style={{ "--lm-hero-delay": "240ms" } as React.CSSProperties}
          className="lm-hero-in mx-auto mt-12 max-w-4xl border-t border-lm-border-soft pt-8 text-center"
        >
          <ul
            aria-label="Pricing guarantees"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-lm-13 font-medium text-lm-ink-soft sm:text-lm-14"
          >
            {FOOTER_ITEMS.map((item, idx) => (
              <li key={item} className="inline-flex items-center gap-3">
                {idx > 0 ? (
                  <span aria-hidden="true" className="text-lm-muted-readable">
                    ·
                  </span>
                ) : null}
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-4 max-w-3xl text-lm-12 leading-lm-normal text-lm-muted-readable">
            {FOOTER_NOTE}{" "}
            <a
              href="mailto:hello@roducq.dev"
              className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-2 transition-colors hover:text-lm-ink"
            >
              Questions? Get in touch
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
