import { SECTION_NAV } from "@/app/(marketing)/features/content";

/**
 * The sticky jump strip between the hero and the feature showcase.
 *
 * MEASURED on the reference (1440x900, both schemes):
 *
 *   outer      position: sticky, full width, 47.7px tall,
 *              transparent — it is NOT a bar and draws no border;
 *              the reference's own stylesheet pins top:78px
 *              (top:66px in its compact step)
 *   inner      centred, content-sized (794.52px at six chips),
 *              border-radius 999px, rgba(255,255,255,0.72),
 *              backdrop blur, box-shadow rgba(33,20,56,0.06) 0 1px 2px
 *   chip       37.7px tall, radius 999px, 15px horizontal padding,
 *              2.4px between chips; on phones the pill is full width
 *              and scrolls horizontally (overflow:auto, MEASURED 390)
 *   number     11px / 700 / #5332d6
 *   label      14px / 400 / #687083
 *
 * This is the same construction the approved /solutions SectionNav
 * uses, with six chips instead of four. Roducq re-bases the sticky
 * offset onto its own chrome (`top-16 md:top-18`) because Roducq's
 * marketing header is 64/72px, not the reference's 70px. One
 * deliberate departure, identical to /solutions: chips keep
 * `min-h-11` (44px) rather than the measured 37.7px so every touch
 * target meets the shell's 44px floor.
 */
export function FeaturesSectionNav() {
  return (
    <nav
      aria-label="Features on this page"
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
              {/* `text-lm-chip` is the measured 11px step — the shared
                  `text-lm-11` class stays deliberately dead (see the
                  /solutions SectionNav note). */}
              <span className="text-lm-chip font-lm-bold text-lm-ink-accent">
                {chip.index}
              </span>
              <span className="whitespace-nowrap text-lm-14 font-lm-regular text-lm-muted-slate">
                {chip.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
