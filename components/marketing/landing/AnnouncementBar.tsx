import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { ANNOUNCEMENT, HOME_ANNOUNCEMENT } from "@/app/(marketing)/home/chrome-content";

/**
 * The one-line band above the header.
 *
 * It sits outside the sticky header (the reference's does too), so it
 * scrolls away and never eats viewport height on a phone. One fact, one
 * link, no close button: there is nothing to dismiss, because it is not a
 * campaign — it states the product's client-work focus and links to the
 * site-wide solutions page.
 */
export function AnnouncementBar({ homepage = false }: { homepage?: boolean }) {
  const announcement = homepage ? HOME_ANNOUNCEMENT : ANNOUNCEMENT;

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="lm-announce border-b border-lm-border-soft bg-lm-card"
    >
      <div className="lm-shell flex min-h-9 flex-wrap items-center justify-center gap-x-2 gap-y-1 py-2 text-center">
        <Sparkles className="h-4 w-4 shrink-0 text-lm-accent" aria-hidden="true" />
        <span className="text-lm-12 font-lm-semibold text-lm-ink">
          {announcement.label}
        </span>
        <span aria-hidden="true" className="hidden text-lm-12 text-lm-muted sm:inline">
          —
        </span>
        <span className="text-lm-12 text-lm-muted-readable">{announcement.text}</span>
        <Link
          href={announcement.href}
          className="inline-flex min-h-11 items-center gap-1 text-lm-12 font-lm-semibold text-lm-ink-accent transition-colors hover:text-lm-accent-strong"
        >
          {announcement.hrefLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
