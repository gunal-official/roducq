"use client";

/**
 * The workspace switcher (Forma Phase B).
 *
 * One component, three surfaces:
 *
 *   panel   — the desktop rail: a raised card showing the workspace
 *             monogram, its name and the affordance to switch.
 *   compact — the tablet rail (64px): a single monogram tile that still
 *             opens the same switch list.
 *   inline  — the topbar: name plus chevron, shrinking gracefully.
 *
 * Switching writes profiles.active_workspace_id through the server
 * action, then refreshes so every list re-reads scoped to the new
 * workspace. A single-workspace account gets a static label instead of a
 * control — there is nothing to switch to, and a dead dropdown would be
 * a lie.
 *
 * The switch is a server action plus a client refresh, not a link, so the
 * unsaved-edits guard cannot see it as a click. It asks the guard first:
 * with a dirty update composer the shared dialog opens and neither the
 * action nor the refresh happens until the user confirms; with a clean
 * editor the original handler runs synchronously, once per selection.
 */

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { setActiveWorkspaceAction } from "@/app/(app)/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestGuardedAction } from "@/lib/ui/unsaved-edits-registry";
import { cn } from "@/lib/utils";

export interface SwitcherWorkspace {
  id: string;
  name: string;
}

export type WorkspaceSwitcherVariant = "panel" | "compact" | "inline";

/** First letter of a workspace name, used for the monogram tile. */
function monogram(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 1).toUpperCase();
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  variant = "inline",
  className,
}: {
  workspaces: SwitcherWorkspace[];
  activeWorkspaceId: string;
  variant?: WorkspaceSwitcherVariant;
  className?: string;
}) {
  const router = useRouter();
  // CSS-selector-safe, per-instance trigger id: the guard returns focus here
  // after "Keep editing" (useId() itself contains characters CSS dislikes).
  const triggerId = `workspace-trigger-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const activeName = active?.name ?? "";

  async function applySwitch(workspaceId: string) {
    setPending(true);
    setError(null);
    const result = await setActiveWorkspaceAction({ workspaceId });
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh(); // current page's lists re-read under the new scope
  }

  function handleChange(workspaceId: string) {
    if (workspaceId === activeWorkspaceId) return;
    const outcome = requestGuardedAction({
      action: "switch-workspace",
      returnFocusSelector: `#${triggerId}`,
      run: () => applySwitch(workspaceId),
    });
    // "held": the confirmation dialog owns the switch; the action runs there
    // only if the user discards, exactly once. The control keeps showing the
    // current workspace because nothing has changed yet.
    if (outcome === "ran") void applySwitch(workspaceId);
  }

  // Single-workspace account: a static label, never a dead dropdown.
  if (workspaces.length <= 1) {
    if (variant === "compact") {
      return (
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-control",
            className
          )}
          title={activeName}
          role="img"
          aria-label={`Workspace: ${activeName}`}
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent"
          >
            {monogram(activeName)}
          </span>
        </div>
      );
    }
    if (variant === "panel") {
      return (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-surface border border-border bg-shell-panel px-2.5 py-2",
            className
          )}
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent"
          >
            {monogram(activeName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-tight text-text">
              {activeName}
            </span>
            <span className="block truncate text-xs leading-tight text-muted-foreground">
              Your workspace
            </span>
          </span>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex h-11 min-w-0 items-center gap-2 rounded-control px-2 text-sm text-muted-foreground",
          className
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[10px] font-bold text-accent"
        >
          {monogram(activeName)}
        </span>
        <span className="truncate font-semibold text-text">{activeName}</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex justify-center", className)}>
        <Select
          value={activeWorkspaceId}
          onValueChange={handleChange}
          disabled={pending}
        >
          <SelectTrigger
            id={triggerId}
            className={cn(
              "h-11 w-11 justify-center border-transparent bg-transparent p-0 shadow-none",
              "hover:bg-muted focus:ring-0"
            )}
            aria-label="Switch workspace"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                monogram(activeName)
              )}
            </span>
            <span className="sr-only">
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                <span className="truncate">{workspace.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (variant === "panel") {
    return (
      <div className={cn("px-0.5", className)}>
        <Select
          value={activeWorkspaceId}
          onValueChange={handleChange}
          disabled={pending}
        >
          <SelectTrigger
            id={triggerId}
            className={cn(
              "h-11 w-full justify-start gap-2.5 border-transparent bg-transparent p-0 pl-0 pr-1 text-left shadow-none",
              "hover:bg-muted/70 focus:ring-0"
            )}
            aria-label="Switch workspace"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  monogram(activeName)
                )}
              </span>
              <span className="min-w-0 flex-1">
                <SelectValue className="block truncate text-sm font-semibold leading-tight text-text" />
                <span className="block truncate text-xs leading-tight text-muted-foreground">
                  Switch workspace
                </span>
              </span>
            </span>
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                <span className="truncate">{workspace.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? (
          <p className="px-1 pt-1 text-xs text-error">{error}</p>
        ) : null}
      </div>
    );
  }

  // inline — the topbar trigger.
  return (
    <div className={cn("min-w-0", className)}>
      <Select
        value={activeWorkspaceId}
        onValueChange={handleChange}
        disabled={pending}
      >
        <SelectTrigger
          id={triggerId}
          className={cn(
            "h-11 min-w-11 w-auto max-w-[190px] gap-2 border-transparent bg-transparent px-2 text-sm shadow-none",
            "hover:bg-muted/70 hover:text-text focus:ring-0"
          )}
          aria-label="Switch workspace"
        >
          <span className="flex min-w-0 items-center gap-2">
            {pending ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[10px] font-bold text-accent"
              >
                {monogram(activeName)}
              </span>
            )}
            <SelectValue className="min-w-0 truncate font-semibold text-text" />
          </span>
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              <span className="truncate">{workspace.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="px-2 pt-1 text-xs text-error">{error}</p> : null}
    </div>
  );
}
