import { CONNECTING_STEPS } from "@/app/(marketing)/integrations/content";
import { Reveal } from "@/components/marketing/landing/Reveal";

/**
 * Band 2 — "How connecting works".
 *
 * MEASURED (docs/FORMA_INTEGRATIONS_REFERENCE.md §5):
 *
 *   section      padding 120px 0 0 0 at >= 1200, 65px 0 0 0 at 1024,
 *                57px 0 0 0 below
 *   eyebrow      14px / 16.8px, 600, #5332d6
 *   gap to h2    12px   (not the hero's 10px)
 *   h2           54px / 59.4px, **weight 400**, -1.62px, #1b1426
 *   gap to lead  16px
 *   lead         18px / 29.7px, #687083, 500px measure
 *   gap to steps 44px
 *   container    #eae6f1, radius 18, padding 1px, gap 1px — the 1px gaps
 *                ARE the dividers, so it cannot be a border
 *   cell         #ffffff, padding 30px 28px
 *   number       13px, 700, #5332d6
 *   h3           21px / 24.16px, 600, -0.94px
 *   body         15px, #687083
 *
 * THE COLUMNS STEP AT 1200, NOT AT 768. The capture renders three cells
 * side by side only at 1440 and 1200; at 1024, 768 and 390 the numbers all sit
 * at the same x (71 / 45 / 45), i.e. the cells stack. So the grid is
 * `min-[1200px]:grid-cols-3` and one column everywhere below — the tablet
 * band keeps the stacked arrangement the reference actually renders.
 *
 * MOTION. MEASURED: the eyebrow arrives first and each h2 word dissolves in
 * (900ms, cubic-bezier(0.16, 1, 0.3, 1)) on a 50ms stagger, triggered by an
 * IntersectionObserver at threshold 0.2; the lead fades in behind it. This
 * band is below the fold, so the approved `.lm-reveal` gate applies: the
 * hidden state lives in CSS behind `.lm-js`, the words ride `.lm-word` (mask
 * only, opacity stays 1 — the PR #53 rule), and `Reveal` supplies the
 * observer. A no-JS visitor and a reduced-motion visitor both get the
 * finished heading, because neither the hidden state nor an inline opacity is
 * ever in the server HTML.
 */
export function ConnectingSteps() {
  return (
    <section className="bg-lm-card pb-0 pt-[57px] min-[1024px]:pt-[65px] min-[1200px]:pt-30">
      <div className="lm-shell">
        <Reveal className="flex flex-col items-start">
          <p className="text-lm-14 font-lm-semibold leading-[1.2] text-lm-ink-accent">
            {CONNECTING_STEPS.eyebrow}
          </p>

          {/* MEASURED: 12px to the headline. */}
          <h2 className="mt-3 text-lm-54 font-lm-regular tracking-[-0.03em] text-lm-ink">
            {CONNECTING_STEPS.title.split(/\s+/).map((word, index) => (
              <span
                key={`${word}-${index}`}
                className="lm-word"
                style={{ "--lm-word-delay": `${index * 50}ms` } as React.CSSProperties}
              >
                <span>{word}</span>{" "}
              </span>
            ))}
          </h2>

          {/* MEASURED: 16px to the lead, and the lead is capped at 500px. */}
          <p className="mt-4 max-w-[500px] text-lm-18 text-lm-muted-slate">
            {CONNECTING_STEPS.intro}
          </p>
        </Reveal>

        {/* MEASURED: 44px, then the 1px-gap container. */}
        <div className="mt-11">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lm-step bg-lm-surface-muted p-px min-[1200px]:grid-cols-3">
            {CONNECTING_STEPS.items.map((item) => (
              <div
                key={item.number}
                className="flex min-w-0 flex-col bg-lm-card px-7 py-[30px]"
              >
                <p className="text-lm-13 font-lm-bold text-lm-ink-accent">
                  {item.number}
                </p>
                <h3 className="mt-[18px] text-lm-21 font-lm-semibold tracking-[-0.02em] text-lm-ink">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-lm-15 text-lm-muted-slate">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
