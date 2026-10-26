import { FEATURES } from "@/app/(marketing)/features/content";

import { FEATURE_MOCK_COMPONENTS } from "./FeatureMocks";

/**
 * The persistent showcase panel for /features — the same construction
 * as the /solutions MockPanel, with six layers instead of four.
 *
 * MEASURED on the reference (1440x900, see
 * docs/FORMA_FEATURES_PAGE_AUDIT.md §3.4):
 *
 *   stage      606.47 × 710 (535.84 wide at 1200), radius 24, the
 *              same 150deg purple sweep and two radial glows the
 *              /solutions stage uses (`lm-solutions-stage`),
 *              `top: 150px` sticky child of a stretched column
 *   cards      content-sized white miniatures, ~52px from the stage
 *              sides, vertically centred, radius 16
 *   foot       "01" 13px/600 white + "/ 06" 13px at 60% white, then
 *              the 2px rail whose fill grows one sixth per step
 *
 * The crossfade rides the shared `.lm-mock-layer` rules: opacity 700ms
 * on `--lm-ease-body` with the 80ms delay, scale 0.97 → 1, visibility
 * delayed 780ms on exit / 80ms on entry — identical timing to
 * /solutions because the same capture pattern drives both pages.
 *
 * ACCESSIBILITY mirrors MockPanel: one labelled `img` role whose label
 * names the feature in view with the same "category NN of NN" pattern,
 * and a decorative (`aria-hidden`) foot. The disclosure inside the
 * miniature stays in the accessibility tree.
 *
 * NO-JS: the fixed 710px height and absolute stacking are gated on
 * `.lm-js` in landing.css, so without JavaScript the six miniatures
 * stack in flow inside the stage and all stay visible.
 */
export function FeatureMockPanel({ active }: { active: number }) {
  const current = FEATURES[active] ?? FEATURES[0];
  const step = String(active + 1).padStart(2, "0");
  const total = String(FEATURES.length).padStart(2, "0");

  return (
    <div
      className="lm-solutions-stage lm-stage-persistent relative overflow-hidden rounded-lm-stage-sm shadow-lm-mock-stage"
      role="img"
      aria-label={`Illustrative example, fictional client — miniature of the roducq ${current.label} workspace, category ${step} of ${total}.`}
    >
      <div className="lm-mock-stage px-[52px] pt-[215px]">
        {FEATURES.map((feature, index) => {
          const Mock = FEATURE_MOCK_COMPONENTS[feature.mock];
          return (
            <div
              key={feature.id}
              className="lm-mock-layer"
              data-mock={feature.mock}
              data-active={index === active}
              aria-hidden="true"
            >
              <Mock />
            </div>
          );
        })}
      </div>

      {/* The stage foot: which feature is in view and the six-step rail.
          The fill grows one sixth per feature, the measured 25%-per-step
          cadence of the four-step /solutions rail, rebased to six. */}
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
            className="block h-full rounded-none bg-lm-cta-fill transition-[width] duration-500 ease-lm-nav"
            style={{ width: `${((active + 1) / FEATURES.length) * 100}%` }}
          />
        </span>
      </div>
    </div>
  );
}
