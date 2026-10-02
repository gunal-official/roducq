/**
 * Single source of truth for "can this invoice have a public link?".
 *
 * WHY THIS FILE EXISTS
 * The public route /invoice/[token] reads through the SECURITY DEFINER
 * RPC public.get_shared_invoice() (supabase/migrations/
 * 20260923090000_invoices_schema.sql), whose WHERE clause ends with:
 *
 *     and i.status in ('sent', 'paid')
 *
 * Draft and void invoices therefore return ZERO rows — deliberately
 * indistinguishable from an invalid or revoked token — so the visitor
 * sees "This link is invalid or has been revoked".
 *
 * Before this module existed the app happily minted a link for a DRAFT
 * invoice, handed the owner a URL, and that URL was dead on arrival.
 * The decision (see the PR) is to BLOCK link creation until the invoice
 * is marked Sent (or Paid) rather than widen the RPC — a draft is not a
 * document you want a client reading.
 *
 * The rule lives here, once, and is imported by BOTH sides:
 *   - components/invoices/InvoiceLinkPanel.tsx  (disables the buttons +
 *     renders INVOICE_SHARE_HELP as helper text)
 *   - app/(app)/invoices/[id]/actions.ts        (refuses to write, so a
 *     crafted request can't bypass the disabled button)
 *
 * Keep SHAREABLE_INVOICE_STATUSES in lockstep with the RPC's status
 * filter — tests/db/invoice-share-link.test.ts asserts they agree by
 * running the real migrations in PGlite.
 */

import type { InvoiceStatus } from "@/lib/types/invoice";

/** The statuses get_shared_invoice() will render behind a token. */
export const SHAREABLE_INVOICE_STATUSES = ["sent", "paid"] as const;

export type ShareableInvoiceStatus = (typeof SHAREABLE_INVOICE_STATUSES)[number];

/** True when a public link for this invoice would actually resolve. */
export function canShareInvoice(
  status: InvoiceStatus | string | null | undefined
): status is ShareableInvoiceStatus {
  return (SHAREABLE_INVOICE_STATUSES as readonly string[]).includes(
    status as string
  );
}

/**
 * Helper text under the disabled Create/Regenerate button. Exact
 * wording is part of the spec — tests assert it character for
 * character, so don't "improve" it without updating them.
 */
export const INVOICE_SHARE_HELP =
  "Public links are available after the invoice is marked Sent.";

/**
 * Server-side refusal message. Ends with INVOICE_SHARE_HELP so the
 * bypass path tells the caller exactly the same thing the UI does,
 * with a lead that names the offending status.
 */
export function invoiceShareBlockedError(
  status: InvoiceStatus | string | null | undefined
): string {
  const lead =
    status === "draft"
      ? "This invoice is still a draft."
      : status === "void"
        ? "This invoice is void."
        : "This invoice can’t be shared yet.";

  return `${lead} ${INVOICE_SHARE_HELP}`;
}
