import { PLAN_BAND } from "@/app/(marketing)/solutions/content";

import { Reveal } from "../Reveal";

/**
 * "Choosing a plan" — the reference's single gradient
 * card between the showcase and the closing CTA.
 *
 * MEASURED on the reference: a 28px-radius card on the
 * 150deg purple sweep with its two radial glows and the
 * two-shadow lift, an eyebrow, a 36px Manrope headline,
 * a 16.5px white-ish body, and the two-button row (filled
 * white primary, translucent outlined secondary).
 *
 * Roducq copy: the pricing page's own framing, restated —
 * per-workspace billing, no per-seat line, no feature
 * paywalls. No price appears, because this page publishes
 * no price: the paid figure is read from the operator's
 * Razorpay config at render time on /pricing, and the only
 * figure the marketing surface may state is the free
 * plan's $0.
 */
export function PlanBand() {
  return (
    <section className="bg-lm-card">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <div className="lm-solutions-stage rounded-lm-stage px-6.5 py-13 md:p-13">
            <p className="text-lm-13 font-lm-semibold leading-[1.55] text-lm-cta-ink">
              {PLAN_BAND.eyebrow}
            </p>
            <h2 className="mt-3 font-lm-semibold tracking-[-0.03em] text-lm-36 text-lm-cta-ink">
              {PLAN_BAND.title}
            </h2>
            <p className="mt-4 max-w-[560px] text-lm-16 leading-[1.7] text-lm-cta-muted">
              {PLAN_BAND.copy}
            </p>
            <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
              <a
                href={PLAN_BAND.primaryCta.href}
                className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-button bg-lm-card px-5 text-lm-15 font-lm-regular text-lm-ink shadow-lm-sm transition-colors hover:bg-lm-surface-accent md:h-13 md:px-6.5"
              >
                {PLAN_BAND.primaryCta.label}
              </a>
              <a
                href={PLAN_BAND.secondaryCta.href}
                className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-button border border-lm-cta-border bg-lm-cta-wash px-5 text-lm-15 font-lm-regular text-lm-cta-ink transition-colors hover:border-lm-cta-ink md:h-13 md:px-6.5"
              >
                {PLAN_BAND.secondaryCta.label}
                <span className="sr-only">(opens your email client)</span>
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
