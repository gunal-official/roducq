import { ArrowUpRight, Plus } from "lucide-react";

import { FAQ, FAQ_SECTION } from "@/app/(marketing)/home/content";

import { GhostLink } from "./Buttons";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";

/**
 * FAQ — the reference's two-column layout:
 * - Clean white background (`bg-lm-card`).
 * - Left column: eyebrow, heading, "Something else on your mind? Send us a
 *   message.", and underlined "Compare roducq ↗" link.
 * - Right column: native `<details>` / `<summary>` accordion list with thin
 *   horizontal dividers, purple open question title, and `+` / `×` toggle icons.
 */
export function FaqAccordion() {
  return (
    <section id="faq" className="scroll-mt-20 bg-lm-card">
      <div className="lm-shell py-13 md:py-22 lg:py-30">
        <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-start lg:gap-16">
          {/* Left column: section heading and supporting links */}
          <Reveal>
            <SectionHeading
              eyebrow={FAQ_SECTION.eyebrow}
              before={FAQ_SECTION.titleBefore}
              after={FAQ_SECTION.titleAfter}
              align="start"
              variant="faq"
            />
            <p className="mt-5 text-lm-14 text-lm-ink-soft">
              {FAQ_SECTION.intro}{" "}
              <a
                href={FAQ_SECTION.contact.href}
                className="inline-flex min-h-11 items-center font-lm-semibold text-lm-ink-accent underline underline-offset-4 transition-colors duration-200 ease-lm-text hover:text-lm-accent-strong"
              >
                {FAQ_SECTION.contact.label}
                <span className="sr-only"> (opens your email client)</span>
              </a>
              .
            </p>
            <div className="mt-4">
              <GhostLink
                href={FAQ_SECTION.cta.href}
                className="border-b border-lm-border-soft pb-1"
              >
                {FAQ_SECTION.cta.label}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </GhostLink>
            </div>
          </Reveal>

          {/* Right column: accordion questions, thin dividers, minimal icons */}
          <div className="divide-y divide-lm-border-soft border-t border-b border-lm-border-soft">
            {FAQ.map((item, index) => (
              <Reveal key={item.q} delay={index * 60}>
                <details
                  open={index === 0}
                  className="lm-faq group py-1"
                >
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-left font-lm-semibold text-lm-16 text-lm-ink transition-colors duration-200 hover:text-lm-ink-accent group-open:text-lm-ink-accent [&::-webkit-details-marker]:hidden">
                    <span>{item.q}</span>
                    <span
                      className="lm-faq-icon flex h-7 w-7 shrink-0 items-center justify-center text-lm-muted transition-colors group-open:text-lm-ink-accent"
                      aria-hidden="true"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </summary>
                  <p className="pb-4 pr-10 text-lm-14 leading-relaxed text-lm-ink-soft">
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
