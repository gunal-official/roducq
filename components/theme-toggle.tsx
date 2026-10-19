"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

const THEMES = ["light", "dark", "system"] as const;

/** Explicit light / dark / system theme picker used by the marketing shell. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Canonical hydration flag (no setState-in-effect): SSR says false, the
  // client says true the moment hydration completes.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <div role="group" aria-label="Appearance" className="flex items-center gap-1 rounded-surface border border-border bg-card p-1">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          aria-label={`Use ${t} theme`}
          aria-pressed={mounted && theme === t}
          onClick={() => setTheme(t)}
          className={cn(
            "min-h-11 min-w-11 flex-1 rounded-control px-3 py-1.5 text-sm capitalize text-muted-foreground transition-colors hover:text-text",
            mounted && theme === t && "bg-accent-soft font-medium text-accent"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/**
 * Single icon button for the marketing header: one tap flips between light
 * and dark via the same `next-themes` setter the segmented control uses, so
 * the two never disagree about the stored theme.
 *
 * Geometry is measured from the Forma reference: a 38px white tile with a
 * 1px hairline and a 2px soft shadow, inside a 44px tap area (the shell's
 * minimum). The sun and moon crossfade with a 200ms opacity/rotate, which is
 * the reference's measured transition; reduced motion switches it off.
 */
export function ThemeIconToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lm-button text-lm-ink"
    >
      <span className="relative flex h-[38px] w-[38px] items-center justify-center overflow-hidden rounded-lm-button border border-lm-surface-muted bg-lm-card shadow-lm-sm transition-colors duration-300 motion-reduce:transition-none">
        <Sun
          aria-hidden="true"
          strokeWidth={2}
          className={cn(
            "absolute h-4 w-4 transition duration-200 motion-reduce:transition-none",
            isDark ? "scale-[0.6] -rotate-[30deg] opacity-0" : "scale-100 rotate-0 opacity-100"
          )}
        />
        <Moon
          aria-hidden="true"
          strokeWidth={2}
          className={cn(
            "absolute h-4 w-4 transition duration-200 motion-reduce:transition-none",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-[0.6] rotate-[30deg] opacity-0"
          )}
        />
      </span>
    </button>
  );
}
