import { ABOUT_PRINCIPLES } from "@/app/(marketing)/about/content";
import { Reveal } from "@/components/marketing/landing/Reveal";

import { Words } from "./Words";

/**
 * /about principles — five hairline-separated numbered rows. The
 * reference order principle 05 (data export) is replaced by roducq's
 * honest-limits doctrine; the row geometry is preserved (see
 * docs/FORMA_ABOUT_REFERENCE.md §6–§7).
 */
export function AboutPrinciples() {
  return (
    <section className="ab-band">
      <div className="lm-shell">
        <Reveal>
          <p className="text-lm-14 font-lm-semibold leading-lm-label text-lm-ink-accent">
            {ABOUT_PRINCIPLES.eyebrow}
          </p>
          <h2 className="ab-section-title mt-3 text-lm-ink">
            <Words text={ABOUT_PRINCIPLES.title} />
          </h2>
        </Reveal>
        <ul className="ab-principles-list">
          {ABOUT_PRINCIPLES.items.map((item, index) => (
            <Reveal
              as="li"
              key={item.number}
              delay={index * 60}
              className="ab-principle"
            >
              <p className="ab-principle-number text-lm-14 font-lm-bold text-lm-ink-accent">
                {item.number}
              </p>
              <h3 className="ab-principle-title text-lm-ink">{item.title}</h3>
              <p className="ab-principle-desc text-lm-muted-slate">
                {item.description}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
