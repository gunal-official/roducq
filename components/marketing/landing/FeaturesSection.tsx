import { ArrowUpRight } from "lucide-react";

import {
  FEATURE_BLOCKS,
  FEATURES_SECTION,
} from "@/app/(marketing)/home/content";

import { GhostLink } from "./Buttons";
import { CardLabel, SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { FEATURE_VISUALS } from "./FeatureVisual";

/**
 * Features — the reference's "four jobs" band.
 *
 * COMPOSITION, IN ITS ORDER:
 * - Left-aligned eyebrow + headline ("Four jobs roducq takes off your plate")
 *   + supporting paragraph on a clean white background (`bg-lm-card`).
 * - Four equal-width vertical feature cards in one horizontal row on desktop
 *   (`lg:grid-cols-4`) separated by thin vertical borders, each card carrying
 *   its illustration at top, category label, heading, and description.
 * - Centered bottom text link ("See the whole product ↗").
 */
export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 bg-lm-card">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <SectionHeading
            eyebrow={FEATURES_SECTION.eyebrow}
            before={FEATURES_SECTION.titleBefore}
            after={FEATURES_SECTION.titleAfter}
            intro={FEATURES_SECTION.intro}
            align="start"
          />
        </Reveal>

        {/* Four equal-width vertical feature cards in one horizontal row on desktop */}
        <div className="mt-12 grid divide-y divide-lm-border-soft rounded-lm-card border border-lm-border-soft bg-lm-card sm:grid-cols-2 sm:divide-x sm:divide-y-0 md:mt-16 lg:grid-cols-4">
          {FEATURE_BLOCKS.map((block, index) => {
            const Visual = FEATURE_VISUALS[index];
            return (
              <Reveal
                key={block.label}
                as="article"
                delay={(index % 4) * 80}
                className="flex h-full min-w-0 flex-col justify-between bg-lm-card p-5 transition-colors hover:bg-lm-canvas md:p-6"
              >
                <div>
                  <Visual />
                  <CardLabel className="mt-5">{block.label}</CardLabel>
                  <h3 className="mt-2 font-lm-regular tracking-[-0.035em] text-lm-21 text-lm-ink lg:text-lm-18 xl:text-lm-22">
                    {block.title}
                  </h3>
                  <p className="mt-2.5 text-lm-16 leading-relaxed text-lm-ink-soft">
                    {block.copy}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-10 text-center md:mt-12">
          <GhostLink
            href={FEATURES_SECTION.cta.href}
            className="border-b border-lm-border-soft pb-1"
          >
            {FEATURES_SECTION.cta.label}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </GhostLink>
        </Reveal>
      </div>
    </section>
  );
}
