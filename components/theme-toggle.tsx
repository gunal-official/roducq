"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const THEMES = ["light", "dark", "system"] as const;

/** Temporary verification control — lets you flip light / dark / system. */
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
    <div className="flex items-center gap-1 rounded-surface border border-border bg-card p-1">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTheme(t)}
          className={cn(
            "min-h-11 min-w-14 rounded-control px-3 py-1.5 text-sm capitalize text-muted-foreground transition-colors hover:text-text",
            mounted && theme === t && "bg-accent-soft font-medium text-accent"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
