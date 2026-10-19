"use client";

import { useEffect, useRef, useState } from "react";

import {
  CATEGORIES,
  TEMPLATES_LABEL,
  WORKFLOWS_LABEL,
  type PracticeCategory,
} from "@/app/(marketing)/solutions/content";

import { Reveal } from "../Reveal";
import { MockPanel } from "./MockPanel";
import { PRACTICE_MOCKS } from "./PracticeMocks";

/**
 * The practice showcase — four numbered category blocks in one band,
 * with one persistent showcase beside them, exactly as the reference
 * composes it.
 *
 * THE STICKY GEOMETRY IS THE REFERENCE'S, ELEMENT FOR ELEMENT.
 * Its capture shows three nested boxes (docs/FORMA_SOLUTIONS_REFERENCE.md
 * §4.2/§4.3 and `sol-1440x900-light-structure.json`):
 *
 *   .framer-l1vvvg   the stage column — 606.5 × 3096 at x 733.5,
 *                    `align-self: stretch`: as tall as the whole band
 *   .framer-1pi3c7f  a CHILD of that column — 606.5 × 710,
 *                    `position: sticky; top: 150px`
 *   .framer-f13bqf   the stage itself — 606.5 × 710, radius 24,
 *                    `rgba(30,16,80,0.45) 0 40px 80px -40px`
 *
 * The sticky element must be the child of a stretched column, not the
 * column itself. A grid/flex item with the default `align-self:
 * stretch` is as tall as its row, and `position: sticky` can only
 * travel inside its containing block — so a sticky grid item with a
 * stretched height has exactly zero travel and never sticks. That was
 * the state of this component before this pass: `lg:sticky` sat on the
 * grid item, so the panel scrolled away with the first article. The
 * markup below restores the measured three-box nesting.
 *
 * WHEN IT APPLIES. The reference's own stylesheet flips the row to a
 * column at `max-width: 1199.98px` and hides the stage column below
 * 1200px (`hidden-srm3hm hidden-1xxithx`), moving each miniature
 * inline under its own category. The two-column sticky composition is
 * therefore a ≥1200px behaviour, not Tailwind's `lg` (1024px) — see
 * docs/SOLUTIONS_IMPLEMENTATION.md §14.
 *
 * ACTIVE CATEGORY. The reference constructs four IntersectionObservers
 * with `threshold: 0.3` and each observes that category's HEADLINE
 * element (measured 562 × 92), not the whole 774px article
 * (`sol-1440x900-light-motion.json.gz`, observers at t=567). This
 * component does the same, but keeps a set of the headings currently
 * past 30% instead of assigning on every entry, so the active index is
 * deterministic in BOTH scroll directions — with a single threshold,
 * an entry that crosses downward still reports `isIntersecting`, which
 * is why the ratio, not the flag, decides membership.
 *
 * WORD CADENCE. Every category headline is one masked span per word,
 * dissolving in with the measured blur curve (900ms,
 * cubic-bezier(0.16, 1, 0.3, 1), 50ms apart) once the band's Reveal
 * fires — see .lm-word-blur in landing.css.
 */

/** The reference's headline word dissolve, per word. */
function WordHeading({ title, index }: { title: string; index: number }) {
  const words = title.split(/\s+/).filter(Boolean);
  return (
    // The measured observer target: the headline wrapper, 30% visible.
    <h2
      data-practice-heading
      data-practice-index={index}
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

/** One practice block: eyebrow, headline, body, the three
 *  first workflows and the templates line. */
function PracticeArticle({
  category,
  index,
}: {
  category: PracticeCategory;
  /** Position in the band, for the mock panel's
   *  scroll observer. */
  index: number;
}) {
  const Mock = PRACTICE_MOCKS[category.mock];
  return (
    <Reveal>
      {/* MEASURED rhythm (1440x900): every article is 774px tall with
          48px padding top and bottom, and its content block is
          vertically centred in what remains — which is why the four
          articles share one pitch even though their copy blocks
          measure 532.9–590.7px. `min-h` (not `h`) so a longer
          Roducq block grows instead of overflowing.

          Compact band (<=1199px): the reference drops to `padding:
          56px 0` with a content-sized article, because the stage is
          hidden and each miniature moves inline. */}
      <article
        id={category.id}
        data-practice-index={index}
        className="scroll-mt-32 py-14 min-[1200px]:flex min-[1200px]:min-h-[774px] min-[1200px]:flex-col min-[1200px]:justify-center min-[1200px]:py-12"
      >
        <div className="flex items-center gap-2 border-b border-lm-border-soft pb-3.5">
          {/* MEASURED 900 in DM Sans. Roducq ships Manrope only, and its
              variable face tops out at 800, so 800 is the heaviest real
              weight available — asking for 900 would synthesise. */}
          <span className="text-lm-12 font-extrabold leading-6 text-lm-ink-accent">
            {category.index}
          </span>
          <span className="text-lm-12 font-lm-semibold uppercase tracking-[0.08em] text-lm-muted-slate">
            {category.label}
          </span>
        </div>

        <WordHeading title={category.title} index={index} />

        <p className="mt-4 max-w-[520px] text-lm-17 leading-[1.7] text-lm-muted-slate">
          {category.copy}
        </p>

        <h3 className="mt-[30px] text-lm-12 font-lm-semibold uppercase tracking-[0.08em] text-lm-muted-slate">
          {WORKFLOWS_LABEL}
        </h3>
        <ol className="mt-1 flex flex-col">
          {category.workflows.map((workflow, workflowIndex) => (
            <li key={workflow.lead} className="relative pl-8">
              <span className="absolute left-0 top-1 text-lm-12 font-lm-bold leading-6 text-lm-ink-accent">
                {String(workflowIndex + 1).padStart(2, "0")}
              </span>
              <p className="py-3.5 text-lm-15 leading-6 text-lm-muted-slate">
                <strong className="font-lm-semibold text-lm-ink">
                  {workflow.lead}
                </strong>{" "}
                {workflow.text}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex items-center gap-3">
          {/* MEASURED: 11px / 600 / 0.06em, and the chip is 19.2px
              tall — 3px of vertical padding around an 13.2px line box,
              not the 4px this had. `text-lm-11` is a dead class (no
              --lm-size-11 token), so the step is written literally. */}
          <span className="shrink-0 rounded-lm-pill bg-lm-canvas px-2.5 py-[3px] text-lm-chip font-lm-semibold uppercase tracking-[0.06em] text-lm-ink">
            {TEMPLATES_LABEL}
          </span>
          <p className="text-lm-17 leading-[1.7] text-lm-muted-slate">
            {category.templates.join(" · ")}
          </p>
        </div>

        {/* Compact band: the miniature moves inline, under the copy —
            where the reference moves it once the stage is hidden. It is
            exposed as one labelled illustration, the same way the
            desktop stage is, rather than as a second copy of the rows. */}
        <div
          role="img"
          aria-label={`Illustrative example, fictional client — miniature of the roducq ${category.label} workspace.`}
          className="lm-solutions-stage lm-stage-inline mt-6 min-[1200px]:hidden"
        >
          <Mock />
        </div>
      </article>
    </Reveal>
  );
}

export function SolutionsShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const headings = Array.from(
      section.querySelectorAll<HTMLElement>("[data-practice-heading]"),
    );
    if (headings.length === 0) return;

    // MEASURED trigger: threshold 0.3 on the headline wrapper. The set
    // keeps the newest state per heading rather than trusting the order
    // entries arrive in, so scrolling back up switches the panel back.
    const past = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const heading = entry.target as HTMLElement;
          const index = Number(heading.getAttribute("data-practice-index"));
          if (!Number.isInteger(index)) continue;
          // The ratio decides, not `isIntersecting`: with a single
          // threshold, a downward crossing still reports the element as
          // intersecting while it is only partly on screen.
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
    /* MEASURED band padding: the reference's showcase section carries
       20px top and 40px bottom, plus a 12px spacer between the sticky
       category strip and the section — 32px above and 40px below. */
    <section
      ref={sectionRef}
      aria-label="Practices"
      className="bg-lm-card pb-10 pt-8"
    >
      <div className="lm-shell">
        {/* Two columns from 1200px, stacked below it — the reference's
            own composition boundary, not Tailwind's `lg`. */}
        <div className="min-[1200px]:grid min-[1200px]:grid-cols-[minmax(0,561px)_minmax(0,1fr)] min-[1200px]:gap-[72px]">
          <div>
            {CATEGORIES.map((category, index) => (
              <PracticeArticle
                key={category.id}
                category={category}
                index={index}
              />
            ))}
          </div>

          {/* The stage column: stretched to the full band height, which
              is what gives the sticky child its travel. Hidden below
              1200px, where each article carries its own miniature. */}
          <div className="hidden min-[1200px]:block">
            <div className="min-[1200px]:sticky min-[1200px]:top-[150px]">
              <MockPanel active={active} categories={CATEGORIES} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
