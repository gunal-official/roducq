import Link from "next/link";
import { ArrowUpRight, Check, CircleHelp, Minus } from "lucide-react";

import {
  PRICING_CARDS,
  PRICING_DISCLOSURE,
  type PricingCard as ApprovedPricingCard,
  type PricingFeature,
} from "@/app/(marketing)/pricing/pricing-content";
import { PRICING_SECTION } from "@/app/(marketing)/home/content";

import { GhostLink } from "./Buttons";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * Homepage pricing uses the owner-approved `/pricing` presentation data.
 * Three commercial plans sit beside a fourth, non-commercial contact panel
 * to retain the reference's four-column composition. This is presentation
 * only: it does not read or change checkout, billing, or entitlements.
 */
export function PricingSection() {
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
          {PRICING_CARDS.map((plan, index) => (
            <Reveal key={plan.slug} as="li" delay={index * 80} className="h-full min-w-0">
              <PlanCard plan={plan} />
            </Reveal>
          ))}
          <Reveal as="li" delay={240} className="h-full min-w-0">
            <ContactPanel />
          </Reveal>
        </ul>

        <div className="mt-8 space-y-2 rounded-lm-card border border-lm-border-soft bg-lm-canvas p-4 md:p-5">
          {PRICING_DISCLOSURE.map((line) => (
            <p key={line} className="text-lm-12 leading-relaxed text-lm-muted-readable">
              {line}
            </p>
          ))}
        </div>

        <Reveal className="mt-8 text-center md:mt-10">
          <GhostLink href={PRICING_SECTION.cta.href} className="border-b border-lm-border-soft pb-1">
            {PRICING_SECTION.cta.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </GhostLink>
        </Reveal>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: ApprovedPricingCard }) {
  const featured = plan.featured;

  return (
    <article
      aria-labelledby={`home-plan-${plan.slug}`}
      className={[
        "flex h-full flex-col overflow-hidden rounded-lm-card bg-lm-card",
        featured
          ? "border-2 border-lm-accent shadow-lm-lg"
          : "border border-lm-border-soft shadow-lm-sm",
      ].join(" ")}
    >
      {plan.badge ? (
        <div className="bg-lm-accent px-4 py-2 text-center text-lm-12 font-lm-bold text-lm-on-accent">
          {plan.badge}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="min-w-0">
          <h3 id={`home-plan-${plan.slug}`} className="font-lm-semibold tracking-[-0.025em] text-lm-23 text-lm-ink">
            {plan.name}
          </h3>
          <p className="mt-2 min-h-[3.25rem] text-lm-14 leading-relaxed text-lm-ink-soft">
            {plan.tagline}
          </p>
        </div>

        <div className="mt-4 border-t border-lm-border-soft pt-4">
          <p className="font-lm-medium text-lm-36 tracking-[-0.07em] text-lm-ink lg:text-lm-35 xl:text-lm-46">
            {plan.price}
            <span className="ml-2 font-lm-regular text-lm-14 tracking-normal text-lm-muted">
              {plan.cadence}
            </span>
          </p>
          <p className="mt-2 min-h-10 text-lm-12 leading-relaxed text-lm-ink-soft">
            {plan.seats}
          </p>
        </div>

        <Link
          href={plan.cta.href}
          className={[
            "mt-4 inline-flex min-h-11 items-center justify-center rounded-lm-button px-4 text-center text-lm-14 font-lm-regular transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-accent",
            featured
              ? "bg-lm-accent text-lm-on-accent shadow-lm-sm hover:bg-lm-accent-strong"
              : "border border-lm-hairline bg-lm-card text-lm-ink hover:bg-lm-canvas",
          ].join(" ")}
        >
          {plan.cta.label}
        </Link>

        <div className="mt-4 flex-1 border-t border-lm-border-soft pt-4">
          <p className="mb-2.5 text-lm-10 font-lm-semibold uppercase tracking-[0.08em] text-lm-muted-label">
            {plan.featuresHeading}
          </p>
          <ul className="flex flex-col gap-2.5">
            {plan.features.map((feature) => (
              <FeatureLine key={feature.text} feature={feature} />
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function FeatureLine({ feature }: { feature: PricingFeature }) {
  const Icon = feature.state === "available" ? Check : feature.state === "note" ? CircleHelp : Minus;
  return (
    <li className="flex items-start gap-2.5 text-lm-12 leading-relaxed text-lm-ink-soft">
      <Icon
        className="mt-0.5 h-4 w-4 shrink-0 text-lm-ink-accent"
        aria-hidden="true"
      />
      <span>{feature.text}</span>
    </li>
  );
}

function ContactPanel() {
  return (
    <div role="group" aria-labelledby="pricing-contact-title" className="lm-pricing-dark flex h-full flex-col rounded-lm-card border p-5 md:p-6">
      <p className="text-lm-12 font-lm-semibold uppercase tracking-[0.14em] text-lm-dark-muted">
        Questions?
      </p>
      <h3 id="pricing-contact-title" className="mt-2 font-lm-semibold tracking-[-0.025em] text-lm-23 text-lm-dark-ink">
        Talk to us
      </h3>
      <p className="mt-3 text-lm-14 leading-relaxed text-lm-dark-muted">
        Need help understanding the listed plans or their current limitations? Send us a note.
      </p>
      <div className="mt-5 border-t border-lm-dark-border pt-4">
        <p className="text-lm-12 leading-relaxed text-lm-dark-ink">
          This is a contact option, not another plan or a promise of custom services.
        </p>
      </div>
      <Link
        href="mailto:contact@nanexi.com?subject=roducq%20pricing%20question"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lm-button bg-lm-card px-4 text-center text-lm-14 font-lm-regular text-lm-ink transition-colors duration-200 hover:bg-lm-surface-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lm-accent"
      >
        Send a question
        <span className="sr-only">(opens your email client)</span>
      </Link>
    </div>
  );
}
