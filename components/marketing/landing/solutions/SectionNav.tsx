import { SECTION_NAV } from "@/app/(marketing)/solutions/content";

/**
 * The sticky jump strip between the hero and the showcase.
 *
 * MEASURED on the reference (1440x900, both schemes):
 *
 *   outer      position: sticky, full width, 47.7px tall,
 *              transparent — it is NOT a bar and draws no border
 *   inner      centred, content-sized (756px at four chips),
 *              border-radius 999px, rgba(255,255,255,0.72),
 *              backdrop-filter blur(16px),
 *              box-shadow rgba(33,20,56,0.06) 0 1px 2px
 *   chip       37.7px tall, radius 999px, 15px horizontal padding,
 *              2.4px between chips
 *   number     11px / 700 / #5332d6
 *   label      14px / 400 / #687083
 *
 * Roducq reskin: the sticky offset is re-based onto this site's
 * chrome (`top-16 md:top-18`) because Roducq's marketing header is
 * 64/72px, not the reference's 70px. The wash is a token so the
 * dark shell gets an equivalent lift — the reference is light-only
 * and publishes no dark value.
 *
 * One deliberate departure: chips keep `min-h-11` (44px) rather than
 * the measured 37.7px, so the touch target meets the same minimum
 * every other interactive element on this shell meets. The measured
 * 37.7px passes WCAG 2.5.8 AA, but 44px is the shell's own rule and
 * §9 requires it to be preserved.
 */
export function SectionNav() {
  return (
    <nav
      aria-label="Practices on this page"
      className="sticky top-16 z-30 md:top-18"
    >
      <div className="lm-shell">
        <div className="mx-auto flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lm-pill bg-lm-chip-wash px-1.5 py-[5px] shadow-lm-chip backdrop-blur-[16px]">
          {SECTION_NAV.map((chip) => (
            <a
              key={chip.href}
              href={chip.href}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lm-pill px-[15px] py-2 transition-colors duration-200 hover:bg-lm-surface-accent"
            >
              {/* NB: `text-lm-11` is a dead class today — no --lm-size-11
                  token and no fontSize step exist, so it emits no rule.
                  Defining the token would also restyle SectionHeading on
                  /, /about, /pricing and /vs, which is out of scope here,
                  so the measured 11px is written literally. */}
              <span className="text-lm-chip font-lm-bold text-lm-ink-accent">
                {chip.index}
              </span>
              <span className="text-lm-14 font-lm-regular text-lm-muted-slate">
                {chip.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
