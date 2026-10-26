import { REQUEST } from "@/app/(marketing)/integrations/content";

/**
 * Band 3 — "Request an integration".
 *
 * MEASURED (docs/FORMA_INTEGRATIONS_REFERENCE.md §6):
 *
 *   section      padding 120px 0 0 0 at >= 1200, 65px at 1024, 57px below
 *   columns      588px copy + 64px gap + 588px card (stacked below 1200)
 *   eyebrow      14px / 16.8px, 600, #5332d6
 *   gap to h2    14px
 *   h2           40.8px / 44.88px, 600, -1.22px
 *   gap to lead  14px
 *   lead         17px / 28.9px, #687083, 420px measure
 *   card         #ffffff, radius 24, padding 29px
 *   label        13.5px, 500, #1b1426, 7px above its field
 *   field shell  #f9f7fc, radius 10, padding 12px 14px, no border
 *   note         12.5px, #687083
 *
 * THE FORM IS NOT REPRODUCED, AND THAT IS THE POINT. The reference's card is a
 * live form posting to Framer's endpoint. Roducq has no request endpoint, has
 * no consent to invent one, and must not ship a submit button that silently
 * drops a request — so the card keeps the reference's composition (white,
 * 24px radius, same padding, same label/field rhythm) and holds what the
 * request should contain plus one action that really works: a `mailto:` link
 * with the fields pre-filled. No spinner, no "sent" state, no fake success.
 *
 * The three rows are styled as static rows rather than inputs on purpose:
 * an input that does not collect anything is a worse lie than no input.
 */
export function RequestIntegration() {
  return (
    <section id="request" className="scroll-mt-20 bg-lm-card pb-0 pt-[57px] min-[1024px]:pt-[65px] min-[1200px]:pt-30">
      <div className="lm-shell">
        <div className="grid grid-cols-1 items-start gap-10 min-[1200px]:grid-cols-2 min-[1200px]:gap-16">
          {/* Copy column */}
          <div className="min-w-0">
            <p className="text-lm-14 font-lm-semibold leading-[1.2] text-lm-ink-accent">
              {REQUEST.eyebrow}
            </p>
            <h2 className="mt-3.5 text-lm-40-8 font-lm-semibold tracking-[-0.03em] text-lm-ink">
              {REQUEST.title}
            </h2>
            <p className="mt-3.5 max-w-[420px] text-lm-17 text-lm-muted-slate">
              {REQUEST.intro}
            </p>
          </div>

          {/* The card. */}
          <div className="min-w-0 rounded-lm-stage-sm border border-lm-border-soft bg-lm-card p-[29px] shadow-lm-sm">
            <p className="text-lm-13-5 font-lm-medium text-lm-ink">
              {REQUEST.card.title}
            </p>

            <ul className="mt-4 flex list-none flex-col gap-4">
              {REQUEST.card.rows.map((row) => (
                <li
                  key={row}
                  className="flex items-start gap-3 rounded-lm-button bg-lm-canvas px-3.5 py-3 text-lm-15 text-lm-ink"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-lm-dot bg-lm-accent"
                  />
                  <span className="min-w-0">{row}</span>
                </li>
              ))}
            </ul>

            {/* One action, and it leaves the page — so it says so. */}
            <a
              href={REQUEST.card.cta.href}
              className="mt-5 inline-flex h-13 min-h-11 w-full items-center justify-center rounded-lm-button bg-lm-accent px-5 text-lm-15 font-lm-semibold text-lm-on-accent transition-colors duration-200 hover:bg-lm-accent-strong"
            >
              {REQUEST.card.cta.label}
            </a>

            <p className="mt-3 text-center text-lm-12-5 text-lm-muted-slate">
              {REQUEST.card.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
