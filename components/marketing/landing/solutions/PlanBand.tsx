import { PLAN_BAND } from "@/app/(marketing)/solutions/content";

import { Reveal } from "../Reveal";

/**
 * "Choosing a plan" — the reference's single gradient
 * card between the showcase and the closing CTA.
 *
 * MEASURED on the reference (1440x900), and several of these
 * values were wrong here before:
 *
 *   section    120px top padding, 0 bottom (the closing CTA's own
 *              120px supplies the gap between the two cards —
 *              padding both ends doubled it to 240px)
 *              57px top / 0 bottom at 768 and below
 *   card       radius 24px (NOT the closing CTA's 28px),
 *              NO box-shadow at all, padding 49px desktop / 21px
 *   eyebrow    14px / 600
 *   headline   36px / 600, 14px under the eyebrow
 *   body       16.5px, 12px under the headline, 560px max
 *   buttons    on desktop they are NOT stacked under the copy:
 *              they sit in a right-hand 316px column, vertically
 *              centred against the text, 40px away from it, 10px
 *              apart. Below the desktop band they stack full-width.
 *              Both 52px tall at radius 10, 15.5px labels; the
 *              primary is filled white with #2a1570 text, the
 *              secondary a borderless rgba(255,255,255,0.08) wash.
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
      <div className="lm-shell pb-0 pt-[57px] lg:pt-30">
        <Reveal>
          <div className="lm-solutions-stage rounded-lm-stage-sm p-[21px] shadow-none md:p-[49px]">
            <div className="lg:flex lg:items-center lg:justify-between lg:gap-10">
              <div className="min-w-0">
                <p className="text-lm-14 font-lm-semibold leading-[1.55] text-lm-cta-ink">
                  {PLAN_BAND.eyebrow}
                </p>
                <h2 className="mt-[14px] font-lm-semibold tracking-[-0.03em] text-lm-36 text-lm-cta-ink">
                  {PLAN_BAND.title}
                </h2>
                <p className="mt-3 max-w-[560px] text-lm-16 leading-[1.7] text-lm-cta-muted">
                  {PLAN_BAND.copy}
                </p>
              </div>

              <div className="mt-8 flex w-full flex-col items-stretch gap-2.5 lg:mt-0 lg:w-auto lg:shrink-0 lg:flex-row lg:items-center">
                <a
                  href={PLAN_BAND.primaryCta.href}
                  className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-button bg-lm-card px-5 text-lm-15 font-lm-regular text-lm-cta-button-ink shadow-lm-sm transition-colors hover:bg-lm-surface-accent md:h-13 md:px-6.5"
                >
                  {PLAN_BAND.primaryCta.label}
                </a>
                <a
                  href={PLAN_BAND.secondaryCta.href}
                  className="inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-lm-button border-0 bg-lm-cta-wash px-5 text-lm-15 font-lm-regular text-lm-cta-ink transition-colors hover:bg-white/15 md:h-13 md:px-6.5"
                >
                  {PLAN_BAND.secondaryCta.label}
                  <span className="sr-only">(opens your email client)</span>
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
