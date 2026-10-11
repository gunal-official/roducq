"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { isNavActive, visibleGroups } from "./nav-items";
import { WorkspaceSwitcher, type SwitcherWorkspace } from "./WorkspaceSwitcher";

// Mobile (<tab) navigation: the topbar hamburger and the bottom tab bar's
// "More" slot both open this drawer — slide-in panel with grouped icon-chip
// rows (Ember Studio language). It carries every route the tab bar omits.
// Nothing clips at 320px, every item is a 44px row, and the panel respects
// top/bottom safe-area insets. Active highlighting is unique (isNavActive).
export function MobileNav({
  open,
  onClose,
  workspaces,
  activeWorkspaceId,
  canSeeMoney,
}: {
  open: boolean;
  onClose: () => void;
  workspaces: SwitcherWorkspace[];
  activeWorkspaceId: string;
  canSeeMoney: boolean;
}) {
  const pathname = usePathname();
  if (!open) return null;
  const groups = visibleGroups(canSeeMoney);

  return (
    <div className="fixed inset-0 z-50 tab:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      />
      <nav
        aria-label="Primary"
        className="absolute left-0 top-0 flex h-full w-[min(288px,86vw)] flex-col gap-1 overflow-y-auto border-r border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] pt-[max(0.75rem,env(safe-area-inset-top,0.75rem))] shadow-pop animate-slide-in"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-text"
          >
            <X aria-hidden="true" className="h-[18px] w-[18px]" />
          </button>
        </div>
        {groups.map((group) => (
          <div key={group.label} className="mb-2">
            <p
              aria-hidden="true"
              className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70"
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
                      "flex min-h-11 items-center gap-3 rounded-control px-1.5 text-sm transition-colors duration-150",
                      "hover:bg-muted/70",
                      active
                        ? "bg-accent-soft font-semibold text-accent"
                        : "text-muted-foreground hover:text-text",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-accent-soft text-accent" : "text-muted-foreground",
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
      </nav>
    </div>
  );
}
