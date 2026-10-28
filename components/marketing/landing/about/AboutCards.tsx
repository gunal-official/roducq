import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ABOUT_CARDS } from "@/app/(marketing)/about/content";
import { Reveal } from "@/components/marketing/landing/Reveal";

/**
 * /about link cards — measured geometry from the reference, where
 * the whole card is one <a>. Roducq renders the same card with the
 * link row stretched over it (`.ab-card-link::after`): identical
 * click area and appearance, but the title and description stay
 * readable text and the link's accessible name is its visible
 * label, as WCAG 2.5.3 (Label in Name) requires — a whole-card
 * aria-label failed axe's label-content-name-mismatch rule.
 */
export function AboutCards() {
  return (
    <section className="ab-band">
      <div className="lm-shell">
        <div className="ab-cards">
          {ABOUT_CARDS.map((card, index) => (
            <Reveal key={card.eyebrow} delay={index * 70}>
              <article className="ab-card">
                <p className="text-lm-14 font-lm-semibold leading-lm-label text-lm-ink-accent">
                  {card.eyebrow}
                </p>
                <h3 className="ab-card-title text-lm-ink">{card.title}</h3>
                <p className="ab-card-desc text-lm-muted-slate">
                  {card.description}
                </p>
                <Link
                  href={card.href}
                  className="ab-card-link inline-flex items-center gap-1.5 text-lm-15 font-lm-medium text-lm-ink-accent underline underline-offset-[5px]"
                >
                  {card.linkLabel}
                  <ArrowUpRight
                    className="h-[14px] w-[14px]"
                    aria-hidden="true"
                  />
                  {card.href.startsWith("mailto:") ? (
                    <span className="sr-only">(opens your email client)</span>
                  ) : null}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
