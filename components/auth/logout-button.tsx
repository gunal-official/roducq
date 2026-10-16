"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Signs the user out of the browser session only ("local" scope — other
 * devices keep their session) and returns them to the login screen.
 *
 * `iconOnly` collapses the label for the account menu, where the label
 * would crowd the trigger; the phone drawer's account plane shows it.
 */
export function LogoutButton({
  className,
  iconOnly = true,
  role,
}: {
  className?: string;
  iconOnly?: boolean;
  role?: "menuitem";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);

    const supabase = createClient();
    // 'local': clear this browser's session + cookie, leave other devices alone.
    await supabase.auth.signOut({ scope: "local" });

    router.replace("/login");
    router.refresh();
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
