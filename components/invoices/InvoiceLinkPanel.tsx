"use client";

/**
 * Three-state public-link panel for the invoice detail page (mirrors
 * components/updates/ShareLinkPanel.tsx):
 *   1. no link        → "Create public link"
 *   2. active link    → copyable public URL + "Revoke"
 *   3. revoked link   → "Regenerate" (new token, row kept — history of
 *                       the old link dies with the token)
 * After each action the server page revalidates and fresh props flow
 * in, flipping the panel to the right state.
 *
 * The absolute URL uses window.location.origin, resolved after mount —
 * SSR renders the path-only form first, so there is no hydration
 * mismatch and the copy button always has a full URL by the time
 * anyone can click.
 *
 * Note for the client: only SENT and PAID invoices render behind the
 * link (draft/void return the same "unavailable" state as a revoked
 * one — indistinguishable by design). Because of that, Create and
 * Regenerate are DISABLED while the invoice is draft or void, with
 * INVOICE_SHARE_HELP explaining why — minting a token for a draft
 * only produces a URL that reads "this link is invalid". The same
 * rule is re-enforced server-side in the actions; this is the
 * courtesy half. Source of truth: lib/invoice-sharing.ts.
 */

import { useEffect, useState } from "react";
import { useOrigin } from "@/lib/use-origin";
import { Ban, Check, Copy, Link2, Loader2, RefreshCw } from "lucide-react";

import {
  createInvoiceLink,
  regenerateInvoiceLink,
  revokeInvoiceLink,
} from "@/app/(app)/invoices/[id]/actions";
import { Button } from "@/components/ui/button";
import { canShareInvoice, INVOICE_SHARE_HELP } from "@/lib/invoice-sharing";
import type { InvoiceLink, InvoiceStatus } from "@/lib/types/invoice";

/** Ties the disabled button to its explanation for screen readers. */
const HELP_ID = "invoice-link-status-help";

export function InvoiceLinkPanel({
  invoiceId,
  invoiceLink,
  invoiceStatus,
}: {
  invoiceId: string;
  invoiceLink: InvoiceLink | null;
  invoiceStatus: InvoiceStatus;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const origin = useOrigin();
  const linkUrl = invoiceLink ? `${origin}/invoice/${invoiceLink.token}` : null;

  const isActive = invoiceLink !== null && invoiceLink.revoked_at === null;

  // Draft/void invoices never render behind a token (get_shared_invoice
  // filters them out), so issuing one is blocked rather than broken.
  const shareable = canShareInvoice(invoiceStatus);

  async function run(
    action: () => Promise<{ error?: string } | undefined>
  ) {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result?.error) setError(result.error);
  }

  async function handleCopy() {
    if (!linkUrl) return;
    await navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {invoiceLink === null && (
        <>
          {/* The sales pitch only makes sense when the button works;
              otherwise the helper text below carries the message. */}
          {shareable && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Anyone with the link can view this invoice — read-only, no
              account needed. You can revoke it any time.
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={pending || !shareable}
            aria-describedby={shareable ? undefined : HELP_ID}
            onClick={() => run(() => createInvoiceLink({ invoiceId }))}
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin"  aria-hidden="true" />
            ) : (
              <Link2 className="mr-2 h-4 w-4"  aria-hidden="true" />
            )}
            Create public link
          </Button>
        </>
      )}

      {invoiceLink !== null && isActive && (
        <>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
              {linkUrl ?? `/invoice/${invoiceLink.token}`}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              aria-label="Copy invoice link"
            >
              {copied ? (
                <Check className="h-4 w-4"  aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4"  aria-hidden="true" />
              )}
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={pending}
            onClick={() =>
              run(() =>
                revokeInvoiceLink({ linkId: invoiceLink.id, invoiceId })
              )
            }
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin"  aria-hidden="true" />
            ) : (
              <Ban className="mr-2 h-4 w-4"  aria-hidden="true" />
            )}
            Revoke link
          </Button>
        </>
      )}

      {invoiceLink !== null && !isActive && (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            This link was revoked and no longer works. Regenerating
            issues a new link (the old one stays dead).
          </p>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={pending || !shareable}
            aria-describedby={shareable ? undefined : HELP_ID}
            onClick={() =>
              run(() =>
                regenerateInvoiceLink({ linkId: invoiceLink.id, invoiceId })
              )
            }
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin"  aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4"  aria-hidden="true" />
            )}
            Regenerate link
          </Button>
        </>
      )}

      {/* Why the button above is dead. Rendered for the create AND the
          regenerate state (not for an active link — revoking always
          stays available). */}
      {!shareable && !isActive && (
        <p id={HELP_ID} className="text-xs leading-relaxed text-muted-foreground">
          {INVOICE_SHARE_HELP}
        </p>
      )}

      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
