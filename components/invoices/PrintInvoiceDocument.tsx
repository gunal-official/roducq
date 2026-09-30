import { formatDate, formatMoney, invoiceNumberLabel } from "@/lib/utils";
import { invoiceTotals } from "@/lib/invoice-totals";
import type { Invoice } from "@/lib/types/invoice";

/**
 * The print-only invoice document (Step 35 — invoice detail page rebuild).
 * On screen it is invisible (`hidden print:block`); the rest of the detail
 * page (back link, stat tiles, link panel, composer, activity rail) is
 * wrapped in `print:hidden`, and the (app) chrome (topbar + sidebar) is
 * already print:hidden at the layout level — so printing this page (or
 * "Print" → the browser dialog) yields ONLY this document, never the
 * editor UI or app shell around it.
 *
 * Deliberately plain (no shadows, no rounded card chrome, no entrance
 * motion — none of that reads on paper): a letterhead line, billed-to,
 * line items, and the same subtotal → tax → total math the on-screen
 * paper card and the public /invoice/:token page use.
 */
export function PrintInvoiceDocument({
  invoice,
  workspaceName,
}: {
  invoice: Invoice;
  workspaceName: string;
}) {
  const totals = invoiceTotals(invoice.items, invoice.tax_percent);

  return (
    <div className="hidden max-w-3xl print:block">
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        <span className="font-display text-sm font-bold tracking-tight">
          {workspaceName}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Invoice · {invoiceNumberLabel(invoice.invoice_number)}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {invoice.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Billed to {invoice.client_name}
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Issued {formatDate(invoice.created_at)}</p>
          <p>
            Due {invoice.due_date ? formatDate(invoice.due_date) : "on receipt"}
          </p>
          {invoice.paid_at && <p>Paid {formatDate(invoice.paid_at)}</p>}
        </div>
      </div>

      <div className="mt-6 border-t border-border">
        {invoice.items.length === 0 ? (
          <p className="py-3 text-sm italic text-muted-foreground">
            No line items.
          </p>
        ) : (
          invoice.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border py-3"
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

      <div className="mt-5 flex justify-end">
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
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total
            </dt>
            <dd className="font-display text-xl font-bold">
              {formatMoney(totals.total_cents)}
            </dd>
          </div>
        </dl>
      </div>

      {invoice.notes && (
        <div className="mt-8 space-y-1.5 border-t border-border pt-5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Notes
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {invoice.notes}
          </p>
        </div>
      )}

      <p className="mt-12 text-xs text-muted-foreground">
        {workspaceName} — generated from roducq
      </p>
    </div>
  );
}
