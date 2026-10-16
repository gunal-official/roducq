"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { isNavActive, visibleGroups } from "./nav-items";
import { AccountPanel } from "./AccountPanel";
import { RoduMark, Wordmark } from "./RoduMark";
import { WorkspaceSwitcher, type SwitcherWorkspace } from "./WorkspaceSwitcher";

/* The Forma rail (Phase B): a full-height plane that owns the brand,
   the workspace, the navigation and the account controls in a single
   column, so the content area is left to the work.

   Bands: 64px icon rail (tab–desk) so tablet content is never
   squeezed, 256px labeled nav (desk+). Desktop sections are collapsible
   disclosures (aria-expanded/aria-controls) persisted in localStorage
   and shared across tabs via the external store below. Active row = soft
   lavender pill + solid accent icon tile + 3px purple/lilac indicator
   sliver. Only the most specific route lights up (isNavActive) —
   /intake/inbox no longer activates Intake and Inbox together. */

const STORAGE_KEY = "roducq.sidebar.collapsed";

type CollapsedMap = Record<string, boolean>;

const EMPTY: CollapsedMap = {};

function readCollapsed(): CollapsedMap {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as CollapsedMap) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/* External store (canonical hydration pattern — no setState-in-effect):
   SSR renders the stable EMPTY snapshot (every section expanded); the
   client snapshot lazily reads localStorage and only changes through
   toggleSection() or a cross-tab `storage` event. */
let snapshot: CollapsedMap | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  snapshot = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): CollapsedMap {
  if (snapshot === null) snapshot = readCollapsed();
  return snapshot;
}

function getServerSnapshot(): CollapsedMap {
  return EMPTY;
}

function toggleSection(label: string) {
  const next = { ...getSnapshot(), [label]: !getSnapshot()[label] };
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota — collapse state is a convenience, not data */
  }
  emit();
}

export function Sidebar({
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
  const groups = visibleGroups(canSeeMoney);
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Hydration flag (theme-toggle precedent): SSR says false, the client
  // says true the moment hydration completes — localStorage-backed
  // collapse state only applies after that flip.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <aside
      className="app-sidebar relative sticky top-0 flex h-full min-h-0 w-[64px] shrink-0 flex-col overflow-hidden border-r border-border bg-shell-rail desk:w-[256px]"
      aria-label="Primary"
    >
      {/* A brand glow that falls from the top of the rail — the only
          ornament the shell needs. */}
      <span
        aria-hidden="true"
        className="rail-wash pointer-events-none absolute inset-x-0 top-0 h-44"
      />

      {/* Brand */}
      <div className="relative z-10 flex shrink-0 items-center px-2.5 py-2 desk:px-4">
        <Link
          href="/"
          aria-label="RoduCQ home"
          className="group flex min-h-11 min-w-11 items-center gap-2.5 rounded-control px-1 transition-transform duration-200 hover:scale-[1.02] max-desk:justify-center max-desk:px-0"
        >
          <RoduMark size={30} animated />
          <span className="max-desk:sr-only">
            <Wordmark />
          </span>
        </Link>
      </div>

      {/* Workspace */}
      <div className="relative z-10 shrink-0 px-2 pb-2 desk:px-3">
        <div className="flex justify-center max-desk:flex desk:hidden">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            variant="compact"
          />
        </div>
        <div className="hidden desk:block">
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            variant="panel"
          />
        </div>
      </div>

      {/* Navigation — the only part of the rail that scrolls, so the
          brand and the account controls never move. */}
      <div className="app-rail-nav relative z-10 min-h-0 flex-1 px-2 pb-2 desk:px-3">
        {groups.map((group) => {
          const navId = `sidebar-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
          const isCollapsed = hydrated && collapsed[group.label] === true;
          return (
            <div key={group.label} className="mb-0.5">
              {/* Section disclosure — desktop only; the rail has no labels to
                  collapse (icons stay visible at 64px). */}
              <button
                type="button"
                onClick={() => toggleSection(group.label)}
                aria-expanded={!isCollapsed}
                aria-controls={navId}
                className="mb-0.5 hidden min-h-11 w-full items-center gap-2 rounded-control px-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground/80 transition-colors duration-150 hover:bg-muted/70 hover:text-text desk:flex"
              >
                <span className="shrink-0">{group.label}</span>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                <ChevronDown
                  aria-hidden="true"
                  className={[
                    "h-4 w-4 shrink-0 transition-transform duration-200",
                    isCollapsed ? "-rotate-90" : "",
                  ].join(" ")}
                />
              </button>
              {/* Collapsed hides the desk list; the tablet rail (max-desk)
                  always keeps its icons one tap away. */}
              <nav
                id={navId}
                aria-label={group.label}
                className={[
                  "flex-col gap-1",
                  isCollapsed ? "hidden max-desk:flex" : "flex",
                ].join(" ")}
              >
                {group.items.map(({ label, href, icon: Icon }) => {
                  const active = isNavActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-label={label}
                      aria-current={active ? "page" : undefined}
                      title={label}
                      className={[
                        "group relative flex min-h-11 items-center gap-3 rounded-control px-2 text-sm transition-colors duration-150",
                        "max-desk:justify-center max-desk:px-0",
                        "hover:bg-muted/70 focus-visible:bg-muted/70",
                        active
                          ? "bg-accent-soft font-semibold text-accent before:absolute before:-left-2 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-accent max-desk:before:hidden"
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
                      <span className="max-desk:sr-only">{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* Account plane — the rail's closing block. Hidden on the tablet
          rail, where the topbar already carries the account menu. */}
      <div className="relative z-10 mt-auto hidden shrink-0 border-t border-border p-2 desk:block">
        <AccountPanel initials={initials} name={name} email={email} />
      </div>
    </aside>
  );
}
