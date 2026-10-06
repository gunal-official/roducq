"use client";

/**
 * "Restore" control for proposal version history (Queue #7). Calls the
 * restoreProposalVersion server action, which runs the
 * restore_proposal_version() RPC: editors only, and the PRE-restore state
 * is captured as a new 'restored' version in the same transaction — so
 * restoring never loses the current content.
 *
 * Confirmation: the house two-click inline pattern (workspace danger
 * zone, template delete precedent) — Restore → "Restore v N?" → Cancel /
 * Restore. Rendered only behind <CanEdit>; the action and the RPC
 * re-gate (viewers see no button and would be refused anyway).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History, Loader2 } from "lucide-react";

import { restoreProposalVersion } from "@/app/(app)/proposals/[id]/actions";
import { Button } from "@/components/ui/button";

export function RestoreVersionButton({
  proposalId,
  versionId,
  versionNumber,
  variant = "ghost",
  className,
}: {
  proposalId: string;
  versionId: string;
  versionNumber: number;
  /** ghost+sm in the history list; secondary (full-width via className)
   *  on the snapshot view page. */
  variant?: "ghost" | "secondary";
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRestore() {
    setPending(true);
    setError(null);
    const result = await restoreProposalVersion({ proposalId, versionId });
    setPending(false);
    if (result?.error) {
      setError(result.error);
      setConfirming(false);
      return;
    }
    // The action revalidates /proposals/:id; refresh also covers the
    // snapshot subroute we may be standing on.
    setConfirming(false);
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      {!confirming ? (
        <Button
          type="button"
          variant={variant}
          size={variant === "ghost" ? "sm" : "default"}
          className={className}
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
        >
          <History className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Restore
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            Restore v{versionNumber}? The current content is saved as a new
            version first.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRestore}
            disabled={pending}
          >
            {pending && (
              <Loader2
                className="mr-1.5 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            Restore v{versionNumber}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
