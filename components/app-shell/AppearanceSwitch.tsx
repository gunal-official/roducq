"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A persistent Light / Dark / System switch (Forma Phase B).
 *
 * The account menu keeps the radio-style version (`AppearanceMenuItems`)
 * because that is a menu; this is the always-visible counterpart that
 * lives where the eye already is — the rail footer on desktop, the
 * More drawer on a phone. Both write the same next-themes value, so the
 * two controls never disagree.
 */
const APPEARANCE_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function AppearanceSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // Canonical hydration flag (no setState-in-effect): SSR says false, the
  // client says true the moment hydration completes — the pressed state
  // only settles once the persisted theme is readable.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <div
      role="group"
      aria-label="Appearance"
      className={cn(
        "flex w-full items-center gap-1 rounded-control bg-muted p-1",
        className
      )}
    >
      {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={`${label} theme`}
            aria-pressed={selected}
            onClick={() => setTheme(value)}
            className={cn(
              "flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-control transition-colors duration-150",
              selected
                ? "bg-card font-semibold text-accent shadow-rail"
                : "text-muted-foreground hover:text-text"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
