import { ABOUT_STORY } from "@/app/(marketing)/about/content";
import { Reveal } from "@/components/marketing/landing/Reveal";
import { clsx as cn } from "clsx";

import { Words } from "./Words";

/**
 * /about split band — heading left, three paragraphs right at
 * ≥1200px (45fr/55fr, 64px gap); stacked below with the same 64px
 * gap. First paragraph in ink, the rest in muted slate — the
 * reference's measured treatment (docs/FORMA_ABOUT_REFERENCE.md §4).
 */
export function AboutStory() {
  return (
    <section className="ab-band ab-band-story">
      <div className="lm-shell">
        <div className="ab-story-grid">
          <Reveal>
            <h2 className="ab-split-title text-lm-ink">
              <Words text={ABOUT_STORY.title} />
            </h2>
          </Reveal>
          <div className="flex min-w-0 flex-col gap-[22px]">
            {ABOUT_STORY.paragraphs.map((paragraph, index) => (
              <Reveal key={index} delay={60 + index * 60}>
                <p
                  className={cn(
                    "ab-body",
                    paragraph.emphasis
                      ? "text-lm-ink"
                      : "text-lm-muted-slate"
                  )}
                >
                  {paragraph.text}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
