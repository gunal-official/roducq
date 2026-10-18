import { SECTION_NAV } from "@/app/(marketing)/solutions/content";

/**
 * The sticky jump strip between the hero and the showcase.
 *
 * MEASURED on the reference: a full-width sticky bar below
 * the site header, four pill chips (number in accent ink,
 * label beside it), each linking to its category's anchor.
 * The reference centres the row; on a phone the row scrolls
 * horizontally instead of wrapping.
 *
 * Roducq reskin: the offset is measured from the reference's
 * own 70px header (`top: 78px`). Roducq's marketing header is
 * 64px (72px from the tablet band up), so the strip hangs
 * directly off `top-16 md:top-18` — the same construction,
 * re-based onto this site's chrome.
 */
export function SectionNav() {
  return (
    <nav
      aria-label="Practices on this page"
      className="sticky top-16 z-30 border-b border-lm-border-soft bg-lm-header-wash backdrop-blur-md md:top-18"
    >
      <div className="lm-shell flex items-center justify-center gap-2 overflow-x-auto py-3">
        {SECTION_NAV.map((chip) => (
          <a
            key={chip.href}
            href={chip.href}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lm-pill px-[15px] py-2 text-lm-12 transition-colors duration-200 hover:bg-lm-surface-accent"
          >
            <span className="font-lm-bold text-lm-ink-accent">
              {chip.index}
            </span>
            <span className="font-lm-semibold text-lm-ink">
              {chip.label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
