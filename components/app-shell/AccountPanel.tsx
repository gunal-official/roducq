"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppearanceSwitch } from "./AppearanceSwitch";
import { cn } from "@/lib/utils";

/**
 * The account plane of the shell (Forma Phase B).
 *
 * It answers "who am I working as" and gives the two controls that
 * belong to the person rather than to the page: the appearance switch
 * and, on the phone drawer, the way out. The desktop rail and the phone
 * More drawer share this component so the two surfaces cannot drift.
 */
export function AccountPanel({
  initials,
  name,
  email,
  className,
  showSignOut = false,
  signOutDismissSurface,
  signOutReturnFocusSelector,
}: {
  initials: string;
  name: string | null;
  email: string;
  className?: string;
  /** The phone drawer has no account menu, so it carries sign-out here. */
  showSignOut?: boolean;
  /**
   * Closes the drawer when the unsaved-edits guard takes the sign-out click,
   * so the confirmation dialog is the only dialog on screen.
   */
  signOutDismissSurface?: () => void;
  /** Focus target after "Keep editing", once this panel has been dismissed. */
  signOutReturnFocusSelector?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-surface border border-border bg-shell-panel p-2.5",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <Avatar className="h-9 w-9 ring-2 ring-accent-soft">
          <AvatarFallback className="bg-accent text-xs font-bold text-accent-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-text">
            {name ?? email}
          </p>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            {email}
          </p>
        </div>
      </div>
      <AppearanceSwitch className="mt-2" />
      {showSignOut ? (
        <LogoutButton
          className="mt-2 w-full justify-center rounded-control text-muted-foreground hover:bg-muted hover:text-text"
          iconOnly={false}
          dismissSurface={signOutDismissSurface}
          returnFocusSelector={signOutReturnFocusSelector}
        />
      ) : null}
    </div>
  );
}
