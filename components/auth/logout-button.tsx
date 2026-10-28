"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { requestGuardedAction } from "@/lib/ui/unsaved-edits-registry";
import { cn } from "@/lib/utils";

/**
 * Signs the user out of the browser session only ("local" scope — other
 * devices keep their session) and returns them to the login screen.
 *
 * `iconOnly` collapses the label for the account menu, where the label
 * would crowd the trigger; the phone drawer's account plane shows it.
 *
 * If the update composer has unsaved edits, the shared confirmation dialog
 * opens FIRST and the Supabase sign-out is not called until the user
 * confirms; "Keep editing" leaves the session, the workspace and the draft
 * exactly as they were. With a clean editor this is the original handler,
 * unchanged, synchronous and once per click.
 */
export function LogoutButton({
  className,
  iconOnly = true,
  role,
  dismissSurface,
  returnFocusSelector,
}: {
  className?: string;
  iconOnly?: boolean;
  role?: "menuitem";
  /**
   * Closes the menu/drawer that holds this button when the guard takes the
   * click, so the confirmation is the only dialog on screen.
   */
  dismissSurface?: () => void;
  /** Where focus returns after "Keep editing" if this button unmounts. */
  returnFocusSelector?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function performSignOut() {
    setPending(true);

    const supabase = createClient();
    // 'local': clear this browser's session + cookie, leave other devices alone.
    await supabase.auth.signOut({ scope: "local" });

    router.replace("/login");
    router.refresh();
  }

  function handleLogout() {
    const outcome = requestGuardedAction({
      action: "sign-out",
      returnFocusSelector,
      run: performSignOut,
    });
    if (outcome === "ran") {
      void performSignOut();
      return;
    }
    // Held by the guard: the surface closes, the dialog takes over, and
    // sign-out runs only if the user discards (exactly once).
    dismissSurface?.();
  }

  return (
    <Button
      role={role}
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={pending}
      title="Log out"
      className={cn(
        "text-muted-foreground hover:text-text",
        iconOnly ? "px-0" : "px-3",
        className
      )}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span className={iconOnly ? "sr-only" : undefined}>
        {pending ? "Logging out…" : "Log out"}
      </span>
    </Button>
  );
}
