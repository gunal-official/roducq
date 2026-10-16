"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const APPEARANCE_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/** Theme choices exposed from the authenticated account menu. */
export function AppearanceMenuItems({ close }: { close: () => void }) {
  const { theme, setTheme } = useTheme();
  // Avoid reading the persisted theme before hydration; the menu's selected
  // radio item settles immediately after the client snapshot becomes active.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <div role="group" aria-label="Appearance" className="py-1">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Appearance
      </p>
      {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            onClick={() => {
              setTheme(value);
              close();
            }}
            className={cn(
              "flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-sm transition-colors duration-150",
              selected
                ? "bg-accent-soft font-semibold text-accent"
                : "text-text hover:bg-muted"
            )}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            <span>{label}</span>
            {selected ? (
              <Check aria-hidden="true" className="ml-auto h-4 w-4" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
