import type { PracticeCategory } from "@/app/(marketing)/solutions/content";

import { PRACTICE_MOCKS } from "./PracticeMocks";

/**
 * The sticky miniature panel — the reference's desktop
 * composition. One white card per practice, stacked in
 * the same 606×710px stage, crossfading as the matching
 * article scrolls to 30% visibility (the measured
 * trigger), with the "01 / 04" counter and progress
 * track at the foot of the stage.
 *
 * MEASURED crossfade: 700ms entrances and 500ms exits
 * on cubic-bezier(0.2, 0.7, 0.2, 1) — expressed in CSS
 * as .lm-mock-layer, where the duration is read from
 * the state a layer is entering.
 *
 * NO-JS FALLBACK. The absolute stacking and the
 * crossfade are gated on .lm-js (landing.css). Without
 * JavaScript the four miniatures simply stack in flow
 * inside the stage, so every one of them stays visible.
 *
 * The stage is decorative duplication on phones (each
 * article carries its own inline miniature there), so
 * it is hidden below the desktop band — but it is NOT
 * aria-hidden, because on desktop it is the only place
 * the miniatures exist. Inactive layers are removed from
 * the accessibility tree by `visibility: hidden`.
 */
export function MockPanel({
  active,
  categories,
}: {
  /** Zero-based index of the practice currently in view. */
  active: number;
  categories: readonly PracticeCategory[];
}) {
  return (
    <div
      className="lm-solutions-stage relative hidden overflow-hidden rounded-lm-stage lg:block"
      aria-label="Practice miniature"
    >
      {/* The card area: measured inset 52px from the
          stage sides, 215px from its top. The absolute
          geometry (and the stage's fixed height) exists
          only under .lm-js — without JavaScript the four
          miniatures stack in flow and every one stays
          visible, at the cost of a taller stage. */}
      <div className="lm-mock-stage px-[52px] pt-[215px]">
        {categories.map((category, index) => {
          const Mock = PRACTICE_MOCKS[category.mock];
          return (
            <div
              key={category.id}
              className="lm-mock-layer"
              data-mock={category.mock}
              data-active={index === active}
            >
              <Mock />
            </div>
          );
        })}
      </div>

      {/* The foot of the stage: which practice is in
          view, and how far through the four the reader
          is. The fill steps at 25% per practice. */}
      <div
        aria-hidden="true"
        className="lm-mock-stage-foot inset-x-8 bottom-[26px] flex items-center gap-3"
      >
        <span className="text-lm-13 font-lm-semibold text-lm-cta-ink">
          {String(active + 1).padStart(2, "0")}
        </span>
        <span className="text-lm-13 text-lm-cta-faint">
          / {String(categories.length).padStart(2, "0")}
        </span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-[2px] bg-lm-cta-track">
          <span
            className="block h-full rounded-[2px] bg-lm-accent transition-[width] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
            style={{ width: `${((active + 1) / categories.length) * 100}%` }}
          />
        </span>
      </div>
    </div>
  );
}
