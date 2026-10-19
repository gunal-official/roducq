import { PLAN_BAND } from "@/app/(marketing)/solutions/content";

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
 *   eyebrow    14px / 16.8px (1.2), 600, rgb(205,184,255) — NOT white
 *   headline   36px / 39.6px (1.1), 600, 14px under the eyebrow at
 *              >=1200; 30px / 33px / -0.9 below it (measured at both
 *              768 and 390 in the capture's tablet and phone passes)
 *   body       16.5px / 28.05px (1.7) at 74% white, 12px under the
 *              headline, 560px max
 *   copy col   flex:1 on the desktop band (measured 786.36 of 1142)
 *   buttons    on desktop they are NOT stacked under the copy:
 *              they sit in a right-hand 315.64px column, vertically
 *              centred against the text, 40px away from it, 10px
 *              apart. Below the desktop band they stay SIDE BY SIDE,
 *              left-aligned under the copy at natural width — the
 *              768 and 390 passes both record them on one row
 *              (37 → 201.03 → 352.64 at 390, inside a 316px column).
 *              They are not stretched full-width. Both are 52.03px
 *              tall at radius 10 with 15.5px / 24.03px labels at
 *              every width; the primary is filled white with #2a1570
 *              text, the secondary a borderless rgba(255,255,255,0.08)
 *              wash (the capture reads border-width 0 — §4.4's "1px
 *              border" is not in the rendered style record).
 *
 * The desktop composition switches at 1200px, the reference's own
 * desktop band boundary (§9.5), not Tailwind's 1024px `lg`. The
 * 1024–1199px continuation of the tablet layout is [INFERRED]: the
 * capture never rendered that width.
 *
 * NO ENTRANCE ANIMATION. The reference's motion capture records no
 * WAAPI animation targeting this band at any scroll position, while
 * the scroll pass covered y 0–4551 — the band's whole 3639–3995 span
 * (`sol-1440x900-light-motion.json.gz`). The band is static, so the
 * scroll reveal this used to carry is gone: fading in a band the
 * reference shows immediately was the discrepancy, not the fix.
 * Nothing is pre-hidden now, so the band cannot be left invisible
 * by a failed hydrate either.
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
        <div className="lm-solutions-stage lm-plan-stage rounded-lm-stage-sm p-[21px] shadow-none min-[810px]:p-[49px]">
          <div className="min-[1200px]:flex min-[1200px]:items-center min-[1200px]:gap-10">
            <div className="min-w-0 min-[1200px]:flex-1">
              <p className="text-lm-14 font-lm-semibold leading-[1.2] text-lm-cta-eyebrow">
                {PLAN_BAND.eyebrow}
              </p>
              <h2 className="mt-[14px] font-lm-semibold leading-[1.1] tracking-[-0.03em] text-lm-30 text-lm-cta-ink min-[1200px]:text-lm-36">
                {PLAN_BAND.title}
              </h2>
              <p className="mt-3 max-w-[560px] text-lm-16-5 leading-[1.7] text-lm-cta-muted">
                {PLAN_BAND.copy}
              </p>
            </div>

            <div className="mt-8 flex w-full flex-row flex-wrap items-center gap-2.5 min-[1200px]:mt-0 min-[1200px]:w-auto min-[1200px]:shrink-0">
              <a
                href={PLAN_BAND.primaryCta.href}
                className="inline-flex h-13 min-h-11 items-center justify-center gap-2 rounded-lm-button bg-lm-card px-6.5 text-lm-15-5 font-lm-regular text-lm-cta-button-ink shadow-lm-sm transition-colors hover:bg-lm-surface-accent"
              >
                {PLAN_BAND.primaryCta.label}
              </a>
              <a
                href={PLAN_BAND.secondaryCta.href}
                className="inline-flex h-13 min-h-11 items-center justify-center gap-2 rounded-lm-button border-0 bg-lm-cta-wash px-6.5 text-lm-15-5 font-lm-regular text-lm-cta-ink transition-colors hover:bg-white/15"
              >
                {PLAN_BAND.secondaryCta.label}
                <span className="sr-only">(opens your email client)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
