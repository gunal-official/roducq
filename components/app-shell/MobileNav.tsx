"use client";

import Link from "next/link";
import { useEffect, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { isNavActive, visibleGroups } from "./nav-items";
import { AccountPanel } from "./AccountPanel";
import { RoduMark, Wordmark } from "./RoduMark";
import { WorkspaceSwitcher, type SwitcherWorkspace } from "./WorkspaceSwitcher";

/* The Forma drawer (Phase B): the phone's "More" surface.
   The topbar hamburger and the bottom bar's "More" slot both open it —
   a slide-in panel that carries every route the bar omits, grouped the
   same way the rail groups them, with the brand at the top, the
   workspace beneath it, and the account plane (appearance switch and
   sign-out) closing the panel.

   Nothing clips at 320px, every item is a 44px row, and the panel
   respects top/bottom safe-area insets. Active highlighting is unique
   (isNavActive). */
export function MobileNav({
  open,
  onClose,
  returnFocusRef,
  workspaces,
  activeWorkspaceId,
  canSeeMoney,
  initials,
  name,
  email,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  workspaces: SwitcherWorkspace[];
  activeWorkspaceId: string;
  canSeeMoney: boolean;
  initials: string;
  name: string | null;
  email: string;
}) {
  const pathname = usePathname();
  // A modal hidden by the tablet breakpoint must not keep trapping focus.
  useEffect(() => {
    if (!open) return;
    const tablet = window.matchMedia("(min-width: 600px)");
    const closeOnTablet = () => {
      if (tablet.matches) onClose();
    };
    tablet.addEventListener("change", closeOnTablet);
    return () => tablet.removeEventListener("change", closeOnTablet);
  }, [open, onClose]);
  const groups = visibleGroups(canSeeMoney);

  return (
    /* z-[70] — the drawer has to sit above the floating timer (z-50) and
       the skip link (z-60), both of which are rendered later in the DOM
       and would otherwise paint straight over the panel. */
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <div className="fixed inset-0 z-[70] tab:hidden" role="presentation">
          <Dialog.Overlay asChild>
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={-1}
              onClick={onClose}
              className="forma-scrim absolute inset-0 backdrop-blur-[3px] animate-fade-in"
            />
          </Dialog.Overlay>
          <Dialog.Content
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (returnFocusRef.current?.getClientRects().length) {
                returnFocusRef.current?.focus();
              } else {
                document.getElementById("main")?.focus({ preventScroll: true });
              }
            }}
            className="absolute left-0 top-0 flex h-full w-[min(320px,88vw)] flex-col border-r border-border bg-shell-rail shadow-shell animate-slide-in"
          >
            <Dialog.Title className="sr-only">
              Workspace navigation
            </Dialog.Title>
            <nav
              aria-label="Primary"
              className="flex min-h-0 flex-1 flex-col pt-[env(safe-area-inset-top,0px)]"
            >
              {/* Brand row */}
              <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-3">
                <RoduMark size={28} />
                <Wordmark />
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={onClose}
                  className="ml-auto flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-text"
                >
                  <X aria-hidden="true" className="h-[18px] w-[18px]" />
                </button>
              </div>

              {/* Workspace */}
              <div className="shrink-0 px-3 py-3">
                <WorkspaceSwitcher
                  workspaces={workspaces}
                  activeWorkspaceId={activeWorkspaceId}
                  variant="panel"
                />
              </div>

              {/* Routes */}
              <div className="app-rail-nav min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                {groups.map((group) => (
                  <div key={group.label} className="mb-3">
                    <p
                      aria-hidden="true"
                      className="mb-1.5 px-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground/80"
                    >
                      {group.label}
                    </p>
                    <div className="flex flex-col gap-1">
                      {group.items.map(({ label, href, icon: Icon }) => {
                        const active = isNavActive(pathname, href);
                        return (
                          <Link
                            key={href}
                            href={href}
                            aria-current={active ? "page" : undefined}
                            onClick={onClose}
                            className={[
                              "group flex min-h-11 items-center gap-3 rounded-control px-2 text-sm transition-colors duration-150",
                              "hover:bg-muted/70",
                              active
                                ? "bg-accent-soft font-semibold text-accent"
                                : "text-muted-foreground hover:text-text",
                            ].join(" ")}
                          >
                            <span
                              aria-hidden="true"
                              className={[
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                                active
                                  ? "bg-accent text-accent-foreground shadow-rail"
                                  : "text-muted-foreground group-hover:bg-muted group-hover:text-text",
                              ].join(" ")}
                            >
                              <Icon className="h-5 w-5" />
                            </span>
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Account plane */}
              <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))]">
                <AccountPanel
                  initials={initials}
                  name={name}
                  email={email}
                  showSignOut
                  signOutDismissSurface={onClose}
                  signOutReturnFocusSelector="[data-app-menu-trigger]"
                />
              </div>
            </nav>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
