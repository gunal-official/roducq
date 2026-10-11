"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, Menu as MenuIcon, Search } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { MobileNav } from "./MobileNav";
import { WorkspaceSwitcher, type SwitcherWorkspace } from "./WorkspaceSwitcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem } from "@/components/ui/menu";
import { MONEY_HREFS, NAV_ITEMS } from "./nav-items";

/* Phase 2 topbar (Ember Studio shell): translucent warm surface with
   backdrop blur over the page, hairline bottom border, 8px-radius search
   and control buttons, circular avatar chip. 44px tap targets everywhere.
   Notifications: the product has no notification service yet, so the
   supported affordance is the Inbox shortcut (email/file intake alerts) —
   a bell/counter is deliberately NOT faked here. */
export function Topbar({
  initials,
  name,
  email,
  workspaces,
  activeWorkspaceId,
  canSeeMoney,
}: {
  initials: string;
  name: string | null;
  email: string;
  workspaces: SwitcherWorkspace[];
  activeWorkspaceId: string;
  canSeeMoney: boolean;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const items = NAV_ITEMS.filter((item) => canSeeMoney || !MONEY_HREFS.has(item.href));

  // Escape closes the mobile drawer (its close button + overlay handle the rest).
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-border bg-surface-translucent px-3 py-2 backdrop-blur-md sm:px-5">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={navOpen}
        onClick={() => setNavOpen(true)}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-text tab:hidden"
      >
        <MenuIcon aria-hidden="true" className="h-5 w-5" />
      </button>
      <MobileNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        canSeeMoney={canSeeMoney}
      />

      <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />

      {/* Global search (plain GET form → /search, the server-rendered
          results page). Works without JavaScript; type="search" gives the
          native Escape-to-clear. The wrapper classes are load-bearing for
          the mobile row layout (structural tests + Step 33 audit). */}
      <form
        action="/search"
        role="search"
        className="relative order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-sm"
      >
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <label htmlFor="global-search" className="sr-only">Search</label>
        <Input
          id="global-search"
          type="search"
          name="q"
          placeholder="Search..."
          className="h-11 w-full rounded-control border-transparent bg-muted pl-10 shadow-none"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Link
          href="/intake/inbox"
          aria-label="Inbox"
          title="Inbox"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-text"
        >
          <Inbox aria-hidden="true" className="h-[18px] w-[18px]" />
        </Link>
        <Menu label="Account menu" trigger={
          /* Menu wraps its trigger in a <button> — this MUST stay non-interactive
             (button-in-button = invalid HTML = hydration #418). */
          <span className="flex items-center gap-2 rounded-control py-1 pl-1 pr-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[140px] truncate text-sm font-semibold md:inline">{name ?? email}</span>
          </span>
        }>
          {(close) => (
            <>
              {items.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  onClick={close}
                  className="flex min-h-11 w-full items-center rounded-md px-3 text-sm text-text transition-colors duration-150 hover:bg-muted"
                >
                  <Icon aria-hidden="true" className="mr-2 h-4 w-4 text-muted-foreground" />
                  {label}
                </Link>
              ))}
              <div className="mx-2 my-1 h-px bg-border" />
              <LogoutButton />
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
