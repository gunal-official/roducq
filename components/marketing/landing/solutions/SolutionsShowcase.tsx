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
 * The practice showcase — four numbered category blocks in
 * one band, exactly as the reference composes them (it is a
 * single section, not four).
 *
 * DESKTOP. The copy column (measured 561.53px of the 1240px
 * shell, 71.5px gap to the stage) is followed by a sticky stage
 * (position: sticky — CONFIRMED by the capture) whose miniature
 * crossfades to the practice whose article is 30% visible — the
 * measured IntersectionObserver trigger.
 *
 * MEASURED: the reference pins the stage at `top: 150px`, read from
 * its own stylesheet in the capture's raw-DOM dump
 * (`.framer-1pi3c7f { position: sticky; top: 150px }`) — not from
 * getComputedStyle, which the harness does not collect for `top`.
 * `lg:top-[150px]` is therefore a true measured value, not a guess.
 *
 * PHONE / TABLET. The stage is hidden and each article
 * carries its own miniature inline, below the templates
 * line, which is where the reference moves them.
 *
 * WORD CADENCE. Every category headline is one masked span
 * per word, dissolving in with the measured blur curve
 * (900ms, cubic-bezier(0.16, 1, 0.3, 1), 50ms apart) once
 * the band's Reveal fires — see .lm-word-blur in
 * landing.css.
 */

/** The reference's headline word dissolve, per word. */
function WordHeading({ title }: { title: string }) {
  const words = title.split(/\s+/).filter(Boolean);
  return (
    <h2 className="mt-3.5 font-lm-semibold tracking-[-0.03em] text-lm-34 text-lm-ink lg:text-lm-42">
      {words.map((word, index) => (
        <span key={word}>
          <span
            className="lm-word-blur"
            style={
              { "--lm-word-delay": `${index * 50}ms` } as React.CSSProperties
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
          Roducq block grows instead of overflowing. */}
      <article
        id={category.id}
        data-practice-index={index}
        className="scroll-mt-32 pb-[106px] lg:flex lg:min-h-[774px] lg:flex-col lg:justify-center lg:py-12"
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

        <WordHeading title={category.title} />

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

        {/* Phones and tablets stack the miniature here,
            under the copy — where the reference moves it
            once the sticky stage is hidden. */}
        <div className="mt-6 lg:hidden">
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
    const articles = Array.from(
      section.querySelectorAll<HTMLElement>("[data-practice-index]"),
    );
    if (articles.length === 0) return;

    // The measured trigger: one observer per practice,
    // firing when 30% of its article is visible, with
    // the default root and margin.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const article = entry.target as HTMLElement;
          const index = Number(
            article.getAttribute("data-practice-index"),
          );
          if (Number.isInteger(index)) setActive(index);
        }
      },
      { threshold: 0.3 },
    );
    articles.forEach((article) => observer.observe(article));
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
        <div className="lg:grid lg:grid-cols-[minmax(0,561px)_minmax(0,1fr)] lg:gap-[72px]">
          <div>
            {CATEGORIES.map((category, index) => (
              <PracticeArticle
                key={category.id}
                category={category}
                index={index}
              />
            ))}
          </div>

          <div className="lg:sticky lg:top-[150px]">
            <MockPanel active={active} categories={CATEGORIES} />
          </div>
        </div>
      </div>
    </section>
  );
}
