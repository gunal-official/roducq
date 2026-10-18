import { SOLUTIONS_HERO } from "@/app/(marketing)/solutions/content";

/**
 * /solutions hero — the reference's three-element composition
 * (eyebrow, headline, lead), with its measured entrance:
 *
 *   eyebrow   800ms cubic-bezier(0.2, 0.7, 0.2, 1), delay 0
 *   h1 words  900ms cubic-bezier(0.16, 1, 0.3, 1), 50ms per word
 *   gradient  one unit, 900ms, delay 350ms
 *   lead      800ms cubic-bezier(0.2, 0.7, 0.2, 1), delay 450
 *
 * THE LCP RULE. The reference fades its headline words up from
 * opacity 0.001. That is exactly what PR #53 forbade on
 * first-viewport text: an opacity-zero start suppresses the
 * LCP record. So the hero words run the measured blur dissolve
 * (blur(10px) -> blur(0)) with opacity pinned at 1 in both
 * keyframes — see .lm-hero-word in landing.css. The element
 * paints on the first frame; only the sharpness travels.
 */
/** One headline word: an inline-block so the blur dissolve
 *  can target it without disturbing the line's wrapping. */
function HeroWord({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <span
      className="lm-hero-word"
      style={{ "--lm-word-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </span>
  );
}

export function SolutionsHero() {
  const before = SOLUTIONS_HERO.titleBefore.split(/\s+/).filter(Boolean);
  return (
    <section className="bg-lm-card pt-14 pb-11 md:pt-[56px] md:pb-11 lg:pt-[92px] lg:pb-[72px]">
      <div className="lm-shell">
        <div className="mx-auto flex max-w-full flex-col items-center text-center">
          <p
            className="lm-hero-in text-lm-14 font-lm-semibold text-lm-ink-accent"
            style={
              {
                "--lm-hero-duration": "800ms",
                "--lm-hero-delay": "0ms",
              } as React.CSSProperties
            }
          >
            {SOLUTIONS_HERO.eyebrow}
          </p>

          {/* MEASURED: the reference puts a 10px spacer between the
              eyebrow and the headline (y 178.5 -> 188.5), not 20px. */}
          <h1 className="mt-2.5 font-lm-semibold tracking-[-0.03em] text-lm-44 text-lm-ink lg:text-lm-67">
            {before.map((word, index) => (
              <span key={word}>
                <HeroWord delay={(index + 1) * 50}>{word}</HeroWord>{" "}
              </span>
            ))}
            <HeroWord delay={350}>
              <span className="lm-text-gradient">
                {SOLUTIONS_HERO.titleAfter}
              </span>
            </HeroWord>
          </h1>

          {/* MEASURED: 32px spacer between the headline and the lead
              (y 257.1 -> 289.1), not 24px. */}
          <p
            className="lm-hero-in mt-8 max-w-[640px] text-lm-19 leading-[1.65] text-lm-muted-slate"
            style={
              {
                "--lm-hero-duration": "800ms",
                "--lm-hero-delay": "450ms",
              } as React.CSSProperties
            }
          >
            {SOLUTIONS_HERO.intro}
          </p>
        </div>
      </div>
    </section>
  );
}
