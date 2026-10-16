"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { isNavActive, mobileTabItems } from "./nav-items";
import { MobileNav } from "./MobileNav";
import type { SwitcherWorkspace } from "./WorkspaceSwitcher";

/* The Forma phone dock (Phase B): a floating, blurred bar that hovers
   just above the home indicator instead of sitting flush to the screen
   edge. Four primary destinations (registry order in nav-items.ts) plus
   a "More" tab that opens the full MobileNav drawer for every
   remaining route, so nothing is unreachable on a phone.

   The active destination is a soft lavender plate behind the icon, not
   a rule under the label — the plate keeps the bar's rhythm and never
   collides with the safe-area inset. The bar respects the iOS
   home-indicator inset via env(safe-area-inset-bottom); app/(app)/layout's
   <main> carries the matching bottom clearance (globals.css). 56px tabs
   exceed the 44px touch-target floor. */

export function MobileTabBar({
  workspaces,
  activeWorkspaceId,
  canSeeMoney,
  initials,
  name,
  email,
}: {
  workspaces: SwitcherWorkspace[];
  activeWorkspaceId: string;
  canSeeMoney: boolean;
  initials: string;
  name: string | null;
  email: string;
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
      "relative flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-control px-1 pt-1.5 text-[11px] leading-tight transition-colors duration-150",
      active
        ? "font-semibold text-accent"
        : "text-muted-foreground hover:text-text",
    ].join(" ");

  return (
    <>
      <nav
        aria-label="Primary"
        className="app-tabbar fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom,0px)] tab:hidden print:hidden"
      >
        <div className="px-3 pb-1.5">
          <ul className="flex list-none items-stretch gap-1 rounded-dock border border-border bg-surface-translucent p-1 shadow-shell backdrop-blur-xl">
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
                    <span
                      aria-hidden="true"
                      className={[
                        "flex h-7 w-full max-w-[52px] items-center justify-center rounded-full transition-colors duration-200",
                        active ? "bg-accent-soft" : "",
                      ].join(" ")}
                    >
                      <Icon className="h-[22px] w-[22px] shrink-0" />
                    </span>
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
                className={tabClass(moreOpen)}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "flex h-7 w-full max-w-[52px] items-center justify-center rounded-full transition-colors duration-200",
                    moreOpen ? "bg-accent-soft" : "",
                  ].join(" ")}
                >
                  <LayoutGrid className="h-[22px] w-[22px] shrink-0" />
                </span>
                <span className="w-full truncate text-center">More</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
      <MobileNav
        open={moreOpen}
        onClose={close}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        canSeeMoney={canSeeMoney}
        initials={initials}
        name={name}
        email={email}
      />
    </>
  );
}
