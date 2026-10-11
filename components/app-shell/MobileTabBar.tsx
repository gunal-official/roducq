"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { isNavActive, mobileTabItems } from "./nav-items";
import { MobileNav } from "./MobileNav";
import type { SwitcherWorkspace } from "./WorkspaceSwitcher";

/* Phase 2 phone navigation (<tab): fixed bottom tab bar in the Ember Studio
   language — translucent warm surface + backdrop blur, hairline top border,
   terracotta 3px active indicator echoing the desktop sidebar sliver.
   Four primary destinations (registry order in nav-items.ts) + a "More"
   tab that opens the full MobileNav drawer for every remaining route, so
   nothing is unreachable on a phone. The bar respects the iOS home-indicator
   inset via env(safe-area-inset-bottom); app/(app)/layout's <main> carries
   the matching bottom clearance (globals.css). 56px tabs exceed the 44px
   touch-target floor. */

export function MobileTabBar({
  workspaces,
  activeWorkspaceId,
  canSeeMoney,
}: {
  workspaces: SwitcherWorkspace[];
  activeWorkspaceId: string;
  canSeeMoney: boolean;
}) {
  const pathname = usePathname();
  // Derived open state (no setState-in-effect): the drawer is open only
  // while the route has not changed since "More" was tapped, so navigating
  // from inside the drawer always dismisses it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const moreOpen = openedOn !== null && openedOn === pathname;
  const items = mobileTabItems(canSeeMoney);

  const close = useCallback(() => setOpenedOn(null), []);

  // Escape closes the drawer (its close button + overlay handle the rest).
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenedOn(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const tabClass = (active: boolean) =>
    [
      "relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-control px-1 pb-1 pt-1.5 text-[11px] leading-tight transition-colors duration-150",
      active
        ? "font-semibold text-accent before:absolute before:inset-x-4 before:top-0 before:h-[3px] before:rounded-full before:bg-accent"
        : "text-muted-foreground hover:text-text",
    ].join(" ");

  return (
    <>
      <nav
        aria-label="Primary"
        className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-translucent pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md tab:hidden print:hidden"
      >
        <ul className="flex list-none items-stretch gap-0.5 p-1">
          {items.map(({ label, href, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <li key={href} className="min-w-0 flex-1">
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={tabClass(active)}
                >
                  <Icon aria-hidden="true" className="h-[22px] w-[22px] shrink-0" />
                  <span className="w-full truncate text-center">{label}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              type="button"
              aria-label="More navigation"
              aria-expanded={moreOpen}
              onClick={() => setOpenedOn(pathname)}
              className={tabClass(false)}
            >
              <MoreHorizontal aria-hidden="true" className="h-[22px] w-[22px] shrink-0" />
              <span className="w-full truncate text-center">More</span>
            </button>
          </li>
        </ul>
      </nav>
      <MobileNav
        open={moreOpen}
        onClose={close}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        canSeeMoney={canSeeMoney}
      />
    </>
  );
}
