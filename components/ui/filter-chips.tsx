"use client";

/**
 * Accessible filter row for the Phase 3 list pages (Inbox).
 *
 * A labelled `role="group"` of toggle buttons: `aria-pressed` carries the
 * selected state (no radiogroup semantics — the list re-filters instantly,
 * nothing is "submitted"), every chip is a 44px target, and the row wraps
 * instead of scrolling so nothing is unreachable at 320px.
 *
 * Options carry their own counts, derived from the rows actually on the
 * page — never invented totals.
 */

import { cn } from "@/lib/utils";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  /** Rows matching this option; omitted when there is nothing to count. */
  count?: number;
}

export function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  if (options.length < 2) return null;

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-control border px-3 text-xs font-semibold transition-colors",
              selected
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-card text-secondary-text hover:border-accent hover:text-accent"
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "font-display font-bold",
                  selected ? "text-accent" : "text-muted-foreground"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
