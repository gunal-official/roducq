/**
 * Section nav for /settings (Phase 3).
 *
 * A plain list of in-page anchors — no router, no client state, and it
 * degrades to "just scroll" when JavaScript is unavailable. Rendered from
 * 1024px only: on phones and tablets the page is a single column with the
 * sections in priority order, which is what the Phase 3 mobile contract
 * asks for (one column, no side rails competing with the bottom tab bar).
 *
 * The nav is built from the sections the page actually renders, so an
 * owner and a viewer never see a link to a card they were not given.
 */

import type { LucideIcon } from "lucide-react";

export interface SettingsSectionLink {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function SettingsNav({
  sections,
  label = "Settings sections",
}: {
  sections: SettingsSectionLink[];
  label?: string;
}) {
  if (sections.length === 0) return null;

  return (
    <nav
      aria-label={label}
      className="hidden desk:sticky desk:top-6 desk:block desk:self-start"
    >
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-0.5">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="flex min-h-11 items-center gap-2.5 rounded-control px-3 py-2 text-sm text-secondary-text transition-colors hover:bg-muted hover:text-accent"
            >
              <section.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{section.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
