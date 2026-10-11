"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { isNavActive, visibleGroups } from "./nav-items";
import { WorkspaceSwitcher, type SwitcherWorkspace } from "./WorkspaceSwitcher";

/* Phase 2 sidebar (Ember Studio shell): warm surface with a subtle right
   border. Bands: 64px icon rail (tab–desk) so tablet content is never
   squeezed, 256px labeled nav (desk+). Desktop sections are collapsible
   disclosures (aria-expanded/aria-controls) persisted in localStorage and
   shared across tabs via the external store below. Active row = soft ember
   pill + accent icon + 3px terracotta indicator sliver. Only the most
   specific route lights up (isNavActive) — /intake/inbox no longer
   activates Intake and Inbox together. */

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
}: {
  workspaces: SwitcherWorkspace[];
  activeWorkspaceId: string;
  canSeeMoney: boolean;
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
      className="sticky top-0 h-dvh w-[64px] shrink-0 overflow-y-auto border-r border-border bg-card px-2 py-4 desk:w-[256px] desk:px-3"
      aria-label="Primary"
    >
      <Link href="/" className="mb-4 flex h-11 items-center gap-2.5 px-1 desk:px-2">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-base font-extrabold text-accent-foreground shadow-rail"
        >
          R
        </span>
        <span className="font-display text-lg font-bold tracking-tight max-desk:sr-only">
          Roducq
        </span>
      </Link>
      <div className="mb-3 px-1 max-desk:hidden">
        <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
      </div>
      {groups.map((group) => {
        const navId = `sidebar-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`;
        const isCollapsed = hydrated && collapsed[group.label] === true;
        return (
          <div key={group.label} className="mb-3">
            {/* Section disclosure — desktop only; the rail has no labels to
                collapse (icons stay visible at 64px). */}
            <button
              type="button"
              onClick={() => toggleSection(group.label)}
              aria-expanded={!isCollapsed}
              aria-controls={navId}
              className="mb-1 hidden min-h-11 w-full items-center justify-between gap-2 rounded-control px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors duration-150 hover:bg-muted/70 hover:text-text desk:flex"
            >
              {group.label}
              <ChevronDown
                aria-hidden="true"
                className={[
                  "h-4 w-4 shrink-0 transition-transform duration-150",
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
                      "relative flex min-h-11 items-center gap-3 rounded-control px-1.5 text-sm transition-colors duration-150",
                      "max-desk:justify-center max-desk:px-0",
                      "hover:bg-muted/70 focus-visible:bg-muted/70",
                      active
                        ? "bg-accent-soft font-semibold text-accent before:absolute before:left-0 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-accent max-desk:before:hidden"
                        : "text-muted-foreground hover:text-text",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
                        active
                          ? "bg-accent-soft text-accent"
                          : "text-muted-foreground group-hover:text-text",
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
    </aside>
  );
}
