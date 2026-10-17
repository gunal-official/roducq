import { Plus } from "lucide-react";

import { FAQ, FAQ_SECTION } from "@/app/(marketing)/home/content";

import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * FAQ — the reference's disclosure list.
 *
 * NATIVE <details>, ON PURPOSE. Radix has no accordion package installed and
 * adding one for six disclosures would be a dependency for something the
 * platform already does: <details>/<summary> is keyboard operable, is
 * announced as an expandable by assistive tech, keeps its open state
 * through a page restore, and works with JavaScript switched off. The only
 * styling the marker needs is the plus → cross rotation, which landing.css
 * handles with `.lm-faq[open] .lm-faq-icon`.
 *
 * The first item is open by default so the band never renders as a wall of
 * six identical closed rows.
 */
export function FaqAccordion() {
  return (
    <section className="bg-lm-canvas">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <Reveal>
          <SectionHeading
            eyebrow={FAQ_SECTION.eyebrow}
            before={FAQ_SECTION.titleBefore}
            after={FAQ_SECTION.titleAfter}
          />
          <p className="mx-auto mt-5 max-w-lm-measure text-center text-lm-14 text-lm-ink-soft">
            {FAQ_SECTION.intro}{" "}
            <a
              href={FAQ_SECTION.contact.href}
              className="font-lm-semibold text-lm-ink-accent underline underline-offset-4 transition-colors hover:text-lm-accent-strong"
            >
              {FAQ_SECTION.contact.label}
            </a>
            .
          </p>
        </Reveal>

        <div className="mx-auto mt-10 max-w-[46rem] md:mt-12">
          {FAQ.map((item, index) => (
            <Reveal key={item.q} delay={Math.min(index, 3) * 60}>
              <details
                className="lm-faq group border-b border-lm-border-soft"
                open={index === 0}
              >
                <summary className="flex min-h-11 items-start justify-between gap-4 py-5 text-left">
                  <span className="font-lm-semibold text-lm-16 text-lm-ink transition-colors group-hover:text-lm-ink-accent md:text-lm-18">
                    {item.q}
                  </span>
                  <span
                    className="lm-faq-icon mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lm-dot border border-lm-border-soft text-lm-accent"
                    aria-hidden="true"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </span>
                </summary>
                <p className="max-w-[40rem] pb-6 text-lm-14 leading-relaxed text-lm-muted-readable">
                  {item.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
