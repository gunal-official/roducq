"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { FEATURES, type FeatureArticle } from "@/app/(marketing)/features/content";

import { Reveal } from "../Reveal";
import { FeatureMockPanel } from "./FeatureMockPanel";
import { FEATURE_MOCK_COMPONENTS } from "./FeatureMocks";

/**
 * The /features showcase — six numbered feature articles in one band
 * beside one persistent purple stage, the same composition the
 * reference measures and the same three-box nesting /solutions ships.
 *
 * MEASURED (docs/FORMA_FEATURES_PAGE_AUDIT.md §3.3/§3.4):
 *
 *   band        1440 × 4704, section padding 20 top / 40 bottom, the
 *               same 32px/40px rhythm the /solutions band uses
 *   article     each exactly 774px tall on desktop, content centred;
 *               numbered eyebrow row with a hairline under it, a
 *               word-animated h2 (42px desktop, 34px phones), body at
 *               measure 520, then three bold-lead points
 *   stage       606.47 × 710, sticky child (`top: 150px`) of a
 *               stretched column; hidden below 1200px, where each
 *               article carries its own inline stage
 *   observer    threshold 0.3 on each article's headline wrapper —
 *               the reference observes the headline, not the article
 *
 * ACTIVE FEATURE. As in SolutionsShowcase, a set of the headlines
 * currently past 30% visibility decides the active index, so the panel
 * is deterministic in both scroll directions; the ratio, not the
 * intersecting flag, grants membership.
 *
 * WORD CADENCE. Every headline is one masked span per word dissolving
 * on the measured blur curve (900ms, cubic-bezier(0.16, 1, 0.3, 1),
 * 50ms apart) once the article's Reveal fires — `.lm-word-blur` in
 * landing.css, the same construction /solutions uses.
 */

/** The reference's headline word dissolve, per word. */
function WordHeading({ title, index }: { title: string; index: number }) {
  const words = title.split(/\s+/).filter(Boolean);
  return (
    // The measured observer target: the headline wrapper, 30% visible.
    <h2
      data-feature-heading
      data-feature-index={index}
      className="mt-3.5 font-lm-semibold tracking-[-0.03em] text-lm-34 text-lm-ink lg:text-lm-42"
    >
      {words.map((word, wordIndex) => (
        <span key={`${word}-${wordIndex}`}>
          <span
            className="lm-word-blur"
            style={
              {
                "--lm-word-delay": `${wordIndex * 50}ms`,
              } as React.CSSProperties
            }
          >
            <span>{word}</span>{" "}
          </span>
        </span>
      ))}
    </h2>
  );
}

/** One feature block: eyebrow, headline, body, three bold-lead points,
 *  the article-04 text link, and the compact-band inline stage. */
function FeatureArticleBlock({
  feature,
  index,
}: {
  feature: FeatureArticle;
  /** Position in the band, for the stage's scroll observer. */
  index: number;
}) {
  const Mock = FEATURE_MOCK_COMPONENTS[feature.mock];
  return (
    <Reveal>
      {/* MEASURED rhythm: every article is 774px tall on desktop with
          its content vertically centred, the same pitch /solutions
          uses. `min-h` (not `h`) so a longer Roducq block grows rather
          than overflowing. Below 1200px the article is content-sized
          and the miniature moves inline. */}
      <article
        id={feature.id}
        data-feature-index={index}
        className="scroll-mt-32 py-14 min-[1200px]:flex min-[1200px]:min-h-[774px] min-[1200px]:flex-col min-[1200px]:justify-center min-[1200px]:py-12"
      >
        <div className="flex items-center gap-2 border-b border-lm-border-soft pb-3.5">
          {/* MEASURED 900 in DM Sans. Manrope tops out at 800, the same
              documented substitution /solutions makes. */}
          <span className="text-lm-12 font-extrabold leading-6 text-lm-ink-accent">
            {feature.index}
          </span>
          <span className="text-lm-12 font-lm-semibold uppercase tracking-[0.08em] text-lm-muted-slate">
            {feature.label}
          </span>
        </div>

        <WordHeading title={feature.title} index={index} />

        <p className="mt-4 max-w-[520px] text-lm-17 leading-[1.7] text-lm-muted-slate">
          {feature.copy}
        </p>

        {/* The three bold-lead points, separated by the faint hairlines
            visible in the reference's band screenshots. */}
        <ol className="mt-[30px] flex flex-col divide-y divide-lm-border-soft">
          {feature.points.map((point, pointIndex) => (
            <li key={point.lead} className="relative pl-8 first:pt-0 last:pb-0">
              <span className="absolute left-0 top-3.5 text-lm-12 font-lm-bold leading-6 text-lm-ink-accent">
                {String(pointIndex + 1).padStart(2, "0")}
              </span>
              <p className="py-3.5 text-lm-15 leading-6 text-lm-muted-slate">
                <strong className="font-lm-semibold text-lm-ink">
                  {point.lead}
                </strong>{" "}
                {point.text}
              </p>
            </li>
          ))}
        </ol>

        {/* Article 04 only — MEASURED 15px/500 accent link with an
            arrow. Points at the homepage integrations band, a real
            anchor on a real route. */}
        {feature.link ? (
          <Link
            href={feature.link.href}
            className="group mt-5 inline-flex min-h-11 w-fit items-center gap-1.5 text-lm-15 font-lm-medium text-lm-ink-accent transition-colors duration-200 hover:text-lm-accent-strong"
          >
            {feature.link.label}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ) : null}

        {/* Compact band: the miniature moves inline under the copy,
            exposed as one labelled illustration as the desktop stage
            is. Hidden from 1200px where the sticky stage takes over. */}
        <div
          role="img"
          aria-label={`Illustrative example, fictional client — miniature of the roducq ${feature.label} workspace.`}
          className="lm-solutions-stage lm-stage-inline mt-6 min-[1200px]:hidden"
        >
          <Mock />
        </div>
      </article>
    </Reveal>
  );
}

export function FeaturesShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const headings = Array.from(
      section.querySelectorAll<HTMLElement>("[data-feature-heading]"),
    );
    if (headings.length === 0) return;

    // MEASURED trigger: threshold 0.3 on the headline wrapper. The set
    // keeps the newest state per heading so scrolling back up switches
    // the stage back deterministically.
    const past = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const heading = entry.target as HTMLElement;
          const index = Number(heading.getAttribute("data-feature-index"));
          if (!Number.isInteger(index)) continue;
          if (entry.intersectionRatio >= 0.3) past.add(index);
          else past.delete(index);
        }
        if (past.size > 0) setActive(Math.max(...past));
      },
      { threshold: 0.3 },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, []);

  return (
    /* MEASURED band padding: 20px top, 40px bottom — the same section
       rhythm as the /solutions showcase (the sticky strip above adds
       the rest of the measured gap). */
    <section
      ref={sectionRef}
      aria-label="Features"
      className="bg-lm-card pb-10 pt-8"
    >
      <div className="lm-shell">
        {/* Two columns from 1200px, stacked below it — the reference's
            own composition boundary, not Tailwind's `lg`. */}
        <div className="min-[1200px]:grid min-[1200px]:grid-cols-[minmax(0,561px)_minmax(0,1fr)] min-[1200px]:gap-[72px]">
          <div>
            {FEATURES.map((feature, index) => (
              <FeatureArticleBlock
                key={feature.id}
                feature={feature}
                index={index}
              />
            ))}
          </div>

          {/* The stage column: stretched to the full band height so the
              sticky child has travel. Hidden below 1200px, where each
              article carries its own miniature. */}
          <div className="hidden min-[1200px]:block">
            <div className="min-[1200px]:sticky min-[1200px]:top-[150px]">
              <FeatureMockPanel active={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
