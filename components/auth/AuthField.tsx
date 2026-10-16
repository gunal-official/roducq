"use client";

import { useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A labelled auth field (Forma Phase B).
 *
 * The control is taller than a standard input and carries a leading
 * icon, so the form reads as a set of rows rather than as a stack of
 * bare boxes. Password fields get a reveal toggle that stays a full
 * 44×44 target — the same floor every other control in the product
 * honours.
 */
export function AuthField({
  id,
  label,
  icon: Icon,
  type = "text",
  className,
  ...props
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  type?: string;
  className?: string;
} & Omit<React.ComponentProps<"input">, "id" | "type" | "className">) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-text"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type={isPassword && revealed ? "text" : type}
          className={cn(
            "h-12 bg-card pl-11",
            isPassword ? "pr-12" : "pr-3"
          )}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:text-text"
          >
            {revealed ? (
              <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
