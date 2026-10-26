import { ArrowRight } from "lucide-react";

import {
  CONNECTIONS_MOCK,
  INTEGRATIONS_CLOSING,
  MOCK_DISCLOSURE,
} from "@/app/(marketing)/integrations/content";
import { ChecklistRows } from "@/components/marketing/landing/solutions/PracticeMocks";

/**
 * Band 4 — the closing CTA.
 *
 * MEASURED on the reference (1440x900), and identical to the /solutions
 * closing band, which is why it reuses `.lm-solutions-stage` rather than
 * declaring a third gradient:
 *
 *   section      120px top / 96px bottom at >=1200; 60 / 64 below
 *   stage        radius 28 at >=1200 and 22 below, padding 96/72 at >=1200
 *                and 56/20 below, over the reference's three-layer
 *                `linear-gradient(150deg, #35278a, #5139c9 52%, #7658ec)`
 *                plus two radial glows — exactly what `.lm-solutions-stage`
 *                already encodes
 *   columns      565.28px copy + 466.72px card, 64px apart
 *   headline     64.8px / 66.1px / 600 / -2.268px; 40px below 1200
 *   body         19px / 29.45px on 76% white; 16px below 1200
 *   buttons      52px tall, 36px under the body, 11.5px apart
 *   card         white, radius 18, 24px padding at >=1200 (18 below);
 *                title 17px/600, counter 13px/500, a 6px rail, then the
 *                four measured rows
 *
 * THE MINIATURE IS THE SOLUTIONS CHECKLIST COMPONENT, NOT A COPY OF IT. The
 * reference's closing card is a four-row checklist in both pages; rather than
 * re-derive its 49.25px rows, the 10px "Next" inset and the 4px rail gap from
 * the capture a second time, this band renders `ChecklistRows variant="card"`
 * — the same component, so the two closing bands cannot drift apart. Only the
 * labels differ, and they name things roducq actually ships (a connection
 * that imports, a mailbox that needs re-authorising, a webhook still to come).
 *
 * NO ENTRANCE ANIMATION. The reference records no WAAPI animation for this
 * band's copy — the scroll pass covered the headline, body, buttons and card
 * and none of them appears in the motion log. The reveal this band would
 * otherwise carry is therefore omitted, and nothing is pre-hidden at first
 * paint, which also keeps the closing card out of the LCP path.
 *
 * The headline and CTA labels are the homepage's approved closing, restated
 * from this page's content module so the module stays self-contained.
 */
export function IntegrationsClosingCta() {
  return (
    <section className="bg-lm-card">
      <div className="lm-shell pb-16 pt-[60px] min-[1200px]:pb-24 min-[1200px]:pt-30">
        <div className="lm-solutions-stage rounded-[22px] px-5 py-14 shadow-lm-stage min-[1200px]:rounded-lm-stage min-[1200px]:px-18 min-[1200px]:py-24">
          <div className="grid items-center gap-8 min-[1200px]:grid-cols-[565fr_467fr] min-[1200px]:gap-16">
            <div className="min-w-0">
              <h2 className="font-lm-semibold tracking-[-0.035em] text-lm-40 text-lm-cta-ink min-[1200px]:text-lm-65">
                {INTEGRATIONS_CLOSING.lines[0]
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word) => (
                    <span key={word}>{word} </span>
                  ))}
                {INTEGRATIONS_CLOSING.lines
                  .slice(1)
                  .join(" ")
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word) => (
                    <span key={word} className="lm-text-gradient-soft">
                      {word}{" "}
                    </span>
                  ))}
              </h2>

              <p className="mt-5 text-lm-16 leading-[1.55] text-lm-cta-muted min-[1200px]:text-lm-19">
                {INTEGRATIONS_CLOSING.intro}
              </p>

              {/* MEASURED: stacked full-width below 1200, side by side at
                  natural width above it. Same pair of actions as the
                  /solutions and /features closings. */}
              <div className="mt-9 flex w-full flex-col items-stretch gap-3 min-[1200px]:w-auto min-[1200px]:flex-row min-[1200px]:items-center">
                <a
                  href={INTEGRATIONS_CLOSING.primaryCta.href}
                  className="inline-flex h-13 min-h-11 items-center justify-center gap-2 rounded-lm-button bg-lm-card px-5 text-lm-15-5 font-lm-regular text-lm-cta-button-ink shadow-lm-sm transition-colors hover:bg-lm-surface-accent md:px-6.5"
                >
                  {INTEGRATIONS_CLOSING.primaryCta.label}
                  <ArrowRight
                    className="h-4 w-4 text-lm-accent"
                    aria-hidden="true"
                  />
                </a>
                <a
                  href={INTEGRATIONS_CLOSING.secondaryCta.href}
                  className="inline-flex h-13 min-h-11 items-center justify-center gap-2 rounded-lm-button border-0 bg-lm-cta-wash px-5 text-lm-15-5 font-lm-regular text-lm-cta-ink transition-colors hover:bg-white/15 md:px-6.5"
                >
                  {INTEGRATIONS_CLOSING.secondaryCta.label}
                  <span className="sr-only">(opens your email client)</span>
                </a>
              </div>

              <p className="mt-4 text-lm-14 leading-[1.55] text-lm-cta-faint">
                {INTEGRATIONS_CLOSING.note}
              </p>
            </div>

            {/* The miniature. White card, 18px radius, 24px padding, the
                measured title/counter pair, the 6px rail, four rows. */}
            <div className="flex min-w-0 flex-col">
              <div
                aria-hidden="true"
                className="lm-mock-card flex min-w-0 flex-col rounded-lm-mock p-[18px] min-[1200px]:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lm-17 font-lm-semibold leading-[1.55] text-lm-ink">
                    {CONNECTIONS_MOCK.title}
                  </p>
                  <span className="text-lm-13 font-lm-medium text-lm-ink-soft">
                    {CONNECTIONS_MOCK.progress}
                  </span>
                </div>

                <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-[6px] bg-lm-mock-rail">
                  <div className="h-full w-1/2 rounded-[6px] bg-lm-accent" />
                </div>

                <ChecklistRows items={CONNECTIONS_MOCK.items} variant="card" />
              </div>
              {/* The disclosure sits with the card, not inside the
                  aria-hidden box, so assistive tech reads it too. */}
              <p className="lm-stage-disclosure mt-3 border-t border-lm-cta-track pt-2.5 text-lm-chip text-lm-cta-faint">
                {MOCK_DISCLOSURE}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
