import {
  FileDown,
  MessageCircleQuestion,
  Moon,
  Search,
  type LucideIcon,
} from "lucide-react";

import { DETAILS_BAND } from "@/app/(marketing)/features/content";

/**
 * "Smaller things that save time" — the reference's four-cell details
 * card between the showcase and the closing CTA.
 *
 * MEASURED (docs/FORMA_FEATURES_PAGE_AUDIT.md §3.5):
 *
 *   section    120px top padding, 0 bottom (the closing CTA supplies
 *              the gap below), 57px top at 768 and below
 *   eyebrow    14px / 16.8px, 600, accent purple, 12px over the title
 *   title      54px / 59.4px, WEIGHT 400 (not the 600 the article
 *              headlines use), 32px on phones
 *   card       full shell width, radius 18px, soft lavender base fill
 *              showing through 1px gaps as the cell dividers; four
 *              white cells in a row on desktop, two on tablet, one
 *              column on phones (358 × 677.8 measured at 390)
 *   cell       16×16 stroke icon, h3 18px / 20.7px / 600, body
 *              15px / 24px muted
 *
 * CONTENT NOTE. The reference's four cells include a ⌘K command menu
 * and CSV/JSON export that roducq does not ship. The approved content
 * module substitutes four real capabilities — global search, tracked
 * brief questions, the theme switch and PDF-only export — keeping the
 * measured four-cell structure without inventing a feature.
 *
 * STATIC. Like the /solutions plan band, the reference records no
 * entrance animation for this band, so it renders immediately with no
 * Reveal and nothing pre-hidden — it also cannot be stranded by a
 * failed hydrate.
 */
const ICONS: Record<string, LucideIcon> = {
  Search,
  MessageCircleQuestion,
  Moon,
  FileDown,
};

export function DetailsBand() {
  return (
    <section className="bg-lm-card">
      <div className="lm-shell pb-0 pt-[57px] lg:pt-30">
        <p className="text-lm-14 font-lm-semibold leading-[1.2] text-lm-ink-accent">
          {DETAILS_BAND.eyebrow}
        </p>
        <h2 className="mt-3 font-lm-regular tracking-[-0.03em] text-lm-32 text-lm-ink min-[1200px]:text-lm-54">
          {DETAILS_BAND.title}
        </h2>

        {/* The soft base fill shows through the 1px grid gaps as the
            measured hairline dividers; each cell paints its own card
            surface, so the same markup stacks to one column on phones. */}
        <div className="mt-11 grid grid-cols-1 gap-px overflow-hidden rounded-lm-mock bg-lm-canvas-alt min-[810px]:grid-cols-2 min-[1200px]:grid-cols-4">
          {DETAILS_BAND.cells.map((cell) => {
            const Icon = ICONS[cell.icon] ?? Search;
            return (
              <div key={cell.title} className="bg-lm-card p-6">
                <Icon
                  className="h-4 w-4 text-lm-ink-accent"
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-lm-18 font-lm-semibold leading-[1.15] text-lm-ink">
                  {cell.title}
                </h3>
                <p className="mt-2 text-lm-15 leading-6 text-lm-muted-slate">
                  {cell.copy}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
