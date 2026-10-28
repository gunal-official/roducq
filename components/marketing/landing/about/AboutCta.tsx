import Link from "next/link";
import { Check } from "lucide-react";

import { ABOUT_CTA } from "@/app/(marketing)/about/content";
import { Reveal } from "@/components/marketing/landing/Reveal";
import { clsx as cn } from "clsx";

/**
 * /about closing CTA — the reference's purple gradient panel
 * (`.lm-cta-card`, pixel-verified against this page) with the
 * two-tone heading, two actions, a reassurance note and the
 * pipeline checklist illustration.
 *
 * Deviations from the reference, all owner-approved or
 * accessibility-driven (docs/FORMA_ABOUT_REDESIGN.md):
 * - No demo exists in roducq: the secondary action is "See pricing".
 * - The note is the verifiable "Creating an account does not
 *   activate a paid plan." — the reference's "No credit card
 *   needed" is not a claim this site makes.
 * - Lead/note use the solid `--lm-cta-muted` (#efebff) instead of
 *   the reference's 76%/60% alpha whites: on the gradient's light
 *   end the alpha note falls under the 4.5:1 floor, the same
 *   contrast fix the home page's FinalCta already documents.
 * The checklist card is `aria-hidden` decoration (its meaning is
 * carried by the heading and buttons) and is visibly captioned as
 * an illustrative, fictional example.
 */
export function AboutCta() {
  return (
    <section className="ab-cta-band">
      <div className="lm-shell">
        <Reveal className="lm-cta-card ab-cta-panel">
          <div className="ab-cta-grid">
            <div className="min-w-0 text-left">
              <h2 className="ab-cta-title text-lm-cta-ink">
                <span
                  className="lm-line"
                  style={
                    { "--lm-line-delay": "0ms" } as React.CSSProperties
                  }
                >
                  <span>{ABOUT_CTA.titleLine1}</span>
                </span>
                <span
                  className="lm-line"
                  style={
                    { "--lm-line-delay": "90ms" } as React.CSSProperties
                  }
                >
                  <span>
                    <span className="lm-text-gradient-soft">
                      {ABOUT_CTA.titleLine2}
                    </span>
                  </span>
                </span>
              </h2>

              <p className="ab-cta-lead mt-5 text-lm-cta-muted">
                {ABOUT_CTA.intro}
              </p>

              <div className="ab-cta-actions">
                <Link
                  href={ABOUT_CTA.primaryCta.href}
                  className="ab-cta-btn bg-lm-card text-lm-ink shadow-lm-sm hover:bg-lm-surface-accent"
                >
                  {ABOUT_CTA.primaryCta.label}
                </Link>
                <Link
                  href={ABOUT_CTA.secondaryCta.href}
                  className="ab-cta-btn border border-lm-cta-border bg-lm-cta-wash text-lm-cta-ink hover:border-lm-cta-ink"
                >
                  {ABOUT_CTA.secondaryCta.label}
                </Link>
              </div>

              <p className="mt-4 text-lm-14 text-lm-cta-muted">
                {ABOUT_CTA.note}
              </p>
            </div>

            <figure className="min-w-0">
              <div
                aria-hidden="true"
                className="flex min-w-0 flex-col rounded-lm-frame border border-lm-hairline bg-lm-card p-5 shadow-lm-lg min-[1024px]:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lm-17 font-lm-semibold tracking-[-0.02em] text-lm-ink">
                    {ABOUT_CTA.checklistTitle}
                  </p>
                  <span className="text-lm-13 text-lm-ink-soft">
                    {ABOUT_CTA.checklistProgress}
                  </span>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-lm-pill bg-lm-surface-accent">
                  <div className="h-full w-1/2 rounded-lm-pill bg-lm-accent" />
                </div>

                <ul className="mt-3.5 flex flex-col divide-y divide-lm-border-soft">
                  {ABOUT_CTA.checklistItems.map((item) => {
                    const isDone = item.state === "Done";
                    const isNext = item.state === "Next";
                    return (
                      <li
                        key={item.label}
                        className={cn(
                          "flex items-center justify-between gap-3 py-[13px]",
                          isNext &&
                            "rounded-lm-row border-0 bg-lm-surface-accent px-3"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3.5">
                          <span
                            className={cn(
                              "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-lm-tile border",
                              isDone
                                ? "border-lm-accent bg-lm-accent text-lm-on-accent"
                                : isNext
                                  ? "border-lm-accent bg-lm-card"
                                  : "border-lm-surface-neutral bg-lm-card"
                            )}
                          >
                            {isDone ? (
                              <Check
                                className="h-[12px] w-[12px]"
                                strokeWidth={3}
                                aria-hidden="true"
                              />
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "truncate text-lm-15",
                              isNext
                                ? "font-lm-semibold text-lm-ink"
                                : "text-lm-ink-soft"
                            )}
                          >
                            {item.label}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-lm-12 font-lm-medium",
                            isNext ? "text-lm-ink-accent" : "text-lm-ink-soft"
                          )}
                        >
                          {item.state}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <figcaption className="mt-3 text-right text-lm-12 text-lm-cta-muted">
                {ABOUT_CTA.illustrationLabel}
              </figcaption>
            </figure>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
