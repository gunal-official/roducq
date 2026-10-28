"use client";

import Link from "next/link";
import { Check, CircleMinus, Minus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { PRICING_CARDS, type PricingFeature } from "./pricing-content";

/** Keep the approved status words in the text, not in colour or icons alone. */
function FeatureText({ feature }: { feature: PricingFeature }) {
  if (!feature.emphasis) return <>{feature.text}</>;
  const at = feature.text.indexOf(feature.emphasis);
  if (at < 0) return <>{feature.text}</>;
  return (
    <>
      {feature.text.slice(0, at)}
      <strong>{feature.emphasis}</strong>
      {feature.text.slice(at + feature.emphasis.length)}
    </>
  );
}

/**
 * The cards are server-rendered even without JavaScript. Motion.dev adds only
 * a small optional hover lift: there is no opacity-zero or hidden initial state
 * on a card, its text, or any potential LCP ancestor.
 */
export function PricingPlans() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="rp-cards" data-testid="pricing-cards-grid">
      {PRICING_CARDS.map((tier) => (
        <motion.article
          key={tier.slug}
          initial={false}
          whileHover={reduceMotion ? undefined : { y: -2 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={`rp-card${tier.featured ? " rp-card--featured" : ""}`}
          aria-label={`${tier.name} plan`}
          data-tier={tier.slug}
          data-featured={tier.featured ? "true" : "false"}
        >
          {tier.badge ? (
            <div className="rp-card-badge" data-testid="most-popular-badge">
              {tier.badge}
            </div>
          ) : null}

          <div className="rp-card-heading">
            <h2 className="font-display">{tier.name}</h2>
            <p>{tier.tagline}</p>
          </div>

          <div className="rp-card-price-block">
            <p className="rp-card-price" data-testid={`plan-price-${tier.slug}`}>
              <span className="font-display">{tier.price}</span>
              <span>{tier.cadence}</span>
            </p>
            <p className="rp-card-seats">{tier.seats}</p>
          </div>

          <Link
            href={tier.cta.href}
            data-testid={`plan-cta-${tier.slug}`}
            className={`rp-button rp-card-button${tier.featured ? " rp-button--primary" : " rp-button--outline"}`}
          >
            {tier.cta.label}
            {tier.slug === "studio" ? (
              <span className="sr-only"> (opens your email client)</span>
            ) : null}
          </Link>

          <div className="rp-card-inclusions">
            <p className="rp-card-inclusions-heading">{tier.featuresHeading}</p>
            <ul aria-label={`${tier.name} features`}>
              {tier.features.map((feature) => (
                <li key={feature.text} data-availability={feature.state}>
                  {feature.state === "available" ? (
                    <Check className="rp-feature-icon" aria-hidden="true" />
                  ) : feature.state === "partial" ? (
                    <CircleMinus className="rp-feature-icon" aria-hidden="true" />
                  ) : (
                    <Minus className="rp-feature-icon" aria-hidden="true" />
                  )}
                  <span><FeatureText feature={feature} /></span>
                </li>
              ))}
            </ul>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
