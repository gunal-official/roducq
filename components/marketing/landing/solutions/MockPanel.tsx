import type { PracticeCategory } from "@/app/(marketing)/solutions/content";

import { PRACTICE_MOCKS } from "./PracticeMocks";

/**
 * The persistent showcase panel — the reference's desktop
 * composition, and the one element that does not scroll between
 * categories.
 *
 * MEASURED (1440x900, `sol-1440x900-light-structure.json`):
 *
 *   stage      606.5 × 710, radius 24, purple 150deg sweep with
 *              two radial glows, shadow `rgba(30,16,80,0.45)
 *              0 40px 80px -40px`
 *   cards      content-sized white cards, horizontally centred at
 *              ~52px from the stage sides and vertically centred in
 *              the stage (their centre sits at ~347 of 710); each is
 *              radius 16 with `rgba(8,2,30,0.55) 0 30px 60px -24px`
 *   foot       32px from the stage sides, 26px from its bottom;
 *              "01" 13px/600 white, "/ 04" 13px at 60% white (4px
 *              away), then a 2px rail at radius 2 on
 *              rgba(255,255,255,0.18) whose fill is solid white
 *              and exactly 25% wider per step (121.4 of 485.5 at 01)
 *
 * CROSSFADE. The reference animates the mock layers with
 * `opacity [1,0]` / `[0,1]`, 700ms, delay 80ms, on
 * cubic-bezier(0.2, 0.7, 0.2, 1) — 14 records in the motion capture.
 * That is what `.lm-mock-layer` implements for BOTH directions now;
 * the earlier 500ms exit was a mis-read (see landing.css and
 * docs/SOLUTIONS_IMPLEMENTATION.md §14.5).
 *
 * ACCESSIBILITY. The stage is an illustration that duplicates the
 * category copy in the left column, so it is exposed as a single
 * labelled `img` role whose label names the active category — a
 * reader gets "which one is showing" without walking a second copy of
 * the same words. The visual foot is decorative (`aria-hidden`) for
 * the same reason. The label is text, so the "Illustrative example ·
 * fictional client" disclosure inside the card stays in the tree.
 *
 * NO-JS FALLBACK. The absolute stacking and the fixed 710px height
 * are gated on `.lm-js` (landing.css). Without JavaScript the four
 * miniatures stack in flow inside the stage, and every one of them
 * stays visible.
 */
export function MockPanel({
  active,
  categories,
}: {
  /** Zero-based index of the practice currently in view. */
  active: number;
  categories: readonly PracticeCategory[];
}) {
  const current = categories[active] ?? categories[0];
  const step = String(active + 1).padStart(2, "0");
  const total = String(categories.length).padStart(2, "0");

  return (
    <div
      className="lm-solutions-stage lm-stage-persistent relative overflow-hidden rounded-lm-stage-sm shadow-lm-mock-stage"
      role="img"
      aria-label={`Illustrative example, fictional client — miniature of the roducq ${current.label} workspace, category ${step} of ${total}.`}
    >
      {/* The card area. MEASURED: cards are content-sized and centred
          in the stage; the absolute geometry (and the stage's fixed
          height) exists only under .lm-js — without JavaScript the four
          miniatures stack in flow and every one stays visible, at the
          cost of a taller stage. */}
      <div className="lm-mock-stage px-[52px] pt-[215px]">
        {categories.map((category, index) => {
          const Mock = PRACTICE_MOCKS[category.mock];
          return (
            <div
              key={category.id}
              className="lm-mock-layer"
              data-mock={category.mock}
              data-active={index === active}
              aria-hidden="true"
            >
              <Mock />
            </div>
          );
        })}
      </div>

      {/* The foot of the stage: which practice is in view, and how far
          through the four the reader is. The fill steps at 25% per
          practice — the measured 121.4px of 485.5px at step 01. */}
      <div
        aria-hidden="true"
        className="lm-mock-stage-foot inset-x-8 bottom-[26px] flex items-center gap-3.5"
      >
        <p className="flex items-baseline gap-1 text-lm-13 leading-[1.55]">
          <span className="font-lm-semibold text-lm-cta-ink">{step}</span>
          <span className="text-lm-cta-faint">/ {total}</span>
        </p>
        <span className="h-0.5 flex-1 overflow-hidden rounded-[2px] bg-lm-cta-track">
          <span
            className="block h-full rounded-none bg-lm-cta-fill transition-[width] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
            style={{ width: `${((active + 1) / categories.length) * 100}%` }}
          />
        </span>
      </div>
    </div>
  );
}
