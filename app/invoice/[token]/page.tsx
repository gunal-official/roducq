/**
 * /invoice/:token — PUBLIC, read-only invoice document (Step 34(b) client
 * treatment, mirrors the member invoice paper). No auth, no app shell:
 * the page lives outside the route groups (share page precedent) and
 * inherits only the root layout (font/theme).
 *
 * Redesign (Step 35): the paper now reads like a real invoice document —
 * a From / Billed to identity grid, an "Amount due" summary band the
 * client can act on at a glance, a labelled line-item ledger with column
 * headers, and print-aware classes throughout (the chrome is
 * print:hidden, the paper loosens its width, rows never split across
 * pages). Print token/shadow resets live in app/globals.css.
 *
 * HOW TO TEST (locally — ⚠ invoices migration + seed applied first):
 *   1. Seed plants a link for the sent INV-0002 with token
 *      00000000-0000-0000-0000-000000000070 → open
 *      http://localhost:3000/invoice/00000000-0000-0000-0000-000000000070
 *      in an INCOGNITO window (no session) — the invoice renders as a
 *      paper invoice: letterhead, From / Billed to, amount-due band,
 *      wrap-safe line items under column headers, subtotal → tax →
 *      amount due, notes footer, Print button in the chrome.
 *   2. The DRAFT invoice's seeded link (token …0069) opens the SAME
 *      generic "unavailable" state as a revoked or garbage token —
 *      drafts are never shared, and the visitor cannot tell which kind
 *      of link they have (by design).
 *   3. /invoice/not-a-uuid never reaches the database (shape check
 *      first).
 *   4. "Print" → the browser print dialog. Print output = the paper only
 *      (chrome + footer are print:hidden), on light tokens even in dark
 *      mode, with no card shadow and no row split across a page break.
 *   5. "Download PDF" → GET /api/pdf/shared/invoice/<token> streams the
 *      same invoice as a real PDF file (same totals, letterhead and
 *      notes); a revoked or draft link 404s there exactly as it does
 *      here.
 *
 * Security notes: data comes ONLY from the get_shared_invoice SECURITY
 * DEFINER RPC (invoice_links itself is fully member-gated); invalid vs
 * revoked vs draft vs void are indistinguishable; no ids or internals
 * are returned (workspace_name is the intended seller identity).
 */

import { Link2Off } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { PrintButton } from "@/components/invoices/PrintButton";
import { DownloadPdfButton } from "@/components/ui/DownloadPdfButton";
import { PaperCard } from "@/components/ui/doc-detail";
import { getSharedInvoiceByToken } from "@/lib/data/invoices";
import {
  formatDate,
  formatMoney,
  invoiceNumberLabel,
  isUuid,
} from "@/lib/utils";
import { invoiceTotals } from "@/lib/invoice-totals";

function Brand({ token }: { token?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <span className="font-display text-lg font-bold tracking-tight">
        rodu<span className="text-accent">cq</span>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Shared invoice — read only</Badge>
        {/* Only offered once the token resolved: the unavailable state must
            not hand a visitor a download link that 404s. */}
        {token && (
          <DownloadPdfButton
            href={`/api/pdf/shared/invoice/${token}`}
            label="Download PDF"
          />
        )}
        <PrintButton />
      </div>
    </div>
  );
}

function InvalidState() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col [justify-content:safe_center] px-6">
      <Brand />
      <span className="icon-chip icon-chip-muted mb-4 h-10 w-10">
        <Link2Off className="h-5 w-5" aria-hidden="true" />
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        This link is invalid or has been revoked
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask the sender for a new link, or check that the URL was copied
        in full.
      </p>
    </main>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Shape-check first: /invoice/demo-token and any garbage path never
  // reach the database.
  if (!isUuid(token)) {
    return <InvalidState />;
  }

  let invoice = null;
  try {
    invoice = await getSharedInvoiceByToken(token);
  } catch {
    // RPC/DB failure renders the same generic state — no internals here.
    return <InvalidState />;
  }

  if (!invoice) {
    return <InvalidState />;
  }

  const totals = invoiceTotals(invoice.items, invoice.tax_percent);
  const isPaid = invoice.status === "paid";

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col [justify-content:safe_center] px-6 py-16 print:max-w-none print:px-0 print:py-0">
      <Brand token={token} />

      <PaperCard
        letterLabel="Invoice"
        letterhead={invoice.workspace_name}
        meta={invoiceNumberLabel(invoice.invoice_number)}
        footer={
          invoice.notes.trim() !== "" ? (
            <div className="space-y-1.5">
              <FieldLabel>Notes</FieldLabel>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {invoice.notes}
              </p>
            </div>
          ) : undefined
        }
      >
        {/* Document head: title + status, dated meta on the right. */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {invoice.title}
              </h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {invoiceNumberLabel(invoice.invoice_number)}
            </p>
          </div>
          <dl className="text-right text-sm">
            <div className="flex justify-end gap-2">
              <dt className="text-muted-foreground">Issued</dt>
              <dd>{formatDate(invoice.sent_at)}</dd>
            </div>
            <div className="flex justify-end gap-2">
              <dt className="text-muted-foreground">Due</dt>
              <dd>{formatDate(invoice.due_date)}</dd>
            </div>
            {invoice.paid_at && (
              <div className="flex justify-end gap-2">
                <dt className="text-muted-foreground">Paid</dt>
                <dd>{formatDate(invoice.paid_at)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Amount-due band: the one number a client came here for, plus
            the date that goes with it. Paid invoices flip the wording so
            the band never nags for money already received. */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 rounded-lg border border-border bg-muted/40 px-5 py-4 print:bg-transparent">
          <div>
            <FieldLabel>{isPaid ? "Amount paid" : "Amount due"}</FieldLabel>
            <p className="mt-1 font-display text-3xl font-bold tracking-tight">
              {formatMoney(totals.total_cents)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {isPaid
              ? `Paid ${formatDate(invoice.paid_at)}`
              : `Due ${formatDate(invoice.due_date)}`}
          </p>
        </div>

        {/* Identity grid — who is billing whom, side by side like a
            classic paper invoice. */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <FieldLabel>From</FieldLabel>
            <p className="mt-1 font-display text-lg font-bold">
              {invoice.workspace_name}
            </p>
          </div>
          <div>
            <FieldLabel>Billed to</FieldLabel>
            <p className="mt-1 font-display text-lg font-bold">
              {invoice.client_name}
            </p>
          </div>
        </div>

        {/* Line items — a ledger with column headers on sm+, wrapping
            rows below (no clipped cells at any width). Rows never split
            across a printed page (break-inside-avoid). */}
        <div className="mt-8">
          <div className="hidden items-baseline gap-x-4 border-b border-border pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:flex print:flex">
            <p className="min-w-0 flex-1">Description</p>
            <p className="w-12 shrink-0 text-right">Qty</p>
            <p className="w-20 shrink-0 text-right">Unit</p>
            <p className="w-24 shrink-0 text-right">Amount</p>
          </div>
          <div className="border-t border-border sm:border-t-0 print:border-t-0">
            {invoice.items.length === 0 ? (
              <p className="py-3 text-sm italic text-muted-foreground">
                No line items.
              </p>
            ) : (
              invoice.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border py-3 break-inside-avoid"
                >
                  <p className="min-w-0 flex-1 basis-full text-sm sm:basis-auto">
                    {item.description}
                  </p>
                  <p className="w-12 shrink-0 text-right text-sm text-muted-foreground">
                    ×{item.quantity}
                  </p>
                  <p className="w-20 shrink-0 text-right text-sm text-muted-foreground">
                    {formatMoney(item.unit_amount_cents)}
                  </p>
                  <p className="w-24 shrink-0 text-right text-sm font-medium">
                    {formatMoney(item.quantity * item.unit_amount_cents)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totals — computed, never stored (same math as the member app). */}
        <div className="mt-5 flex justify-end break-inside-avoid">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatMoney(totals.subtotal_cents)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">
                Tax ({invoice.tax_percent}%)
              </dt>
              <dd>{formatMoney(totals.tax_cents)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-6 border-t border-border pt-2">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {isPaid ? "Total paid" : "Amount due"}
              </dt>
              <dd className="font-display text-xl font-bold">
                {formatMoney(totals.total_cents)}
              </dd>
            </div>
          </dl>
        </div>
      </PaperCard>

      <p className="mt-6 text-center text-xs text-muted-foreground print:hidden">
        Shared via roducq — the sender can revoke this link at any
        time.
      </p>
    </main>
  );
}
