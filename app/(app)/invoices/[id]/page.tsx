/**
 * /invoices/:id — the invoice document (Step 34(b) money treatment): the
 * invoice rendered as a paper invoice (line items, computed totals block,
 * notes), stat tiles (total / due / paid), the public-link panel, and an
 * activity timeline with the audit stamps. The composer sits below for
 * editing — totals are computed here exactly as on the public view.
 *
 * PHASE E: the page is a Forma financial plane — the lavender status band
 * (drawing + honest payment copy + the document's own chips) sits between
 * the head and the stat tiles, the ledger gained real column headers from
 * 600px, and the hand-rolled rail cards became shared SectionCards. The
 * paper, math, stamps, link panel and exports are untouched.
 *
 * Status badges (draft/sent/paid/void) each read as a distinct color —
 * see components/invoices/InvoiceStatusBadge.tsx — with "sent" using the
 * --info/--info-soft blue tokens instead of reusing the accent purple, so
 * "awaiting payment" is never confused with a brand action.
 *
 * Printing: the on-screen editor + rail is wrapped in `print:hidden`;
 * PrintInvoiceDocument (hidden on screen, `print:block`) renders instead,
 * so browser print of this page — same as the app chrome, which is
 * print:hidden at the (app) layout level — yields ONLY the invoice
 * document, never the composer, stat tiles, link panel or timeline.
 *
 * HOW TO TEST (locally — ⚠ invoices migration + seed applied first):
 *   1. From /invoices open the seeded INV-0002 (sent). The paper invoice
 *      shows line items; totals (subtotal → tax → total) match the
 *      public view's math and the composer below.
 *   2. Edit a price in the composer → "Unsaved changes" chip → Save: the
 *      items jsonb updates and the chip clears.
 *   3. Status: Sent → Paid stamps invoices.paid_at (tiles + timeline
 *      update after reload); Paid → Sent clears it; Void keeps stamps.
 *   4. Link panel (SENT or PAID only): create → copy the /invoice/<token>
 *      URL → open it in an INCOGNITO window: the invoice renders
 *      read-only with a Print button. Revoke → the URL shows
 *      "unavailable"; regenerate works.
 *   4b. Flip the invoice to Draft (or Void): "Create public link" /
 *      "Regenerate" go disabled and the panel explains "Public links
 *      are available after the invoice is marked Sent." — because
 *      get_shared_invoice() only renders sent/paid, a token minted on
 *      a draft would open as "this link is invalid". The server
 *      actions refuse the same transition, so a crafted request can't
 *      route around the disabled button.
 *   5. Bogus or foreign ids render the "not found" state (RLS hides
 *      them identically).
 *   6. Print (button or browser, Ctrl/Cmd+P): the preview shows only the
 *      invoice document — no sidebar/topbar, no composer, no rail cards.
 */

import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CircleDollarSign,
  Clock,
  FilePlus2,
  Hourglass,
  Link2,
  Receipt,
  Send,
  Wallet,
} from "lucide-react";

import { getInvoiceById } from "@/lib/data/invoices";
import { getInvoiceLinkForInvoice } from "@/lib/data/invoices";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { invoiceTotals } from "@/lib/invoice-totals";
import { formatDate, formatMoney, isUuid, invoiceNumberLabel, timeAgo } from "@/lib/utils";
import { InvoiceComposer } from "@/components/invoices/InvoiceComposer";
import { InvoiceLinkPanel } from "@/components/invoices/InvoiceLinkPanel";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvoiceStatusSelect } from "@/components/invoices/InvoiceStatusSelect";
import { PrintButton } from "@/components/invoices/PrintButton";
import { PrintInvoiceDocument } from "@/components/invoices/PrintInvoiceDocument";
import { InvoiceFlowArt } from "@/components/workflow/FinancialArt";
import { DownloadPdfButton } from "@/components/ui/DownloadPdfButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ActivityTimeline,
  DocHeader,
  PaperCard,
  StatTile,
  type TimelineEvent,
} from "@/components/ui/doc-detail";
import { EmptyState, SectionCard } from "@/components/ui/page";

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right">{children}</span>
    </div>
  );
}

function NotFoundState() {
  return (
    <EmptyState
      icon={Receipt}
      title="Invoice not found"
      description="This invoice doesn’t exist — or it belongs to a workspace you’re not a member of."
      action={
        <Button asChild variant="secondary">
          <Link href="/invoices" className="inline-flex min-h-11 min-w-11 items-center">
            Back to invoices
          </Link>
        </Button>
      }
    />
  );
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) {
    return <NotFoundState />;
  }

  const context = await getWorkspaceContext();
  if (!context?.canSeeMoney) {
    return (
      <div className="mx-auto max-w-3xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">
          View only — invoices and time entries aren’t visible to viewers.
        </p>
      </div>
    );
  }

  const invoice = await getInvoiceById(id);
  if (!invoice) {
    return <NotFoundState />;
  }

  // The link read is RLS-scoped to the caller's workspaces.
  const link = await getInvoiceLinkForInvoice(id);

  const totals = invoiceTotals(invoice.items, invoice.tax_percent);
  const today = new Date().toISOString().slice(0, 10);
  const overdue =
    invoice.status === "sent" && !!invoice.due_date && invoice.due_date < today;

  const events: TimelineEvent[] = [
    {
      icon: FilePlus2,
      title: "Created",
      detail: invoiceNumberLabel(invoice.invoice_number),
      at: formatDate(invoice.created_at),
      tone: "muted",
    },
    ...(invoice.sent_at
      ? [
          {
            icon: Send,
            title: "Sent to client",
            detail: invoice.client_name,
            at: formatDate(invoice.sent_at),
            tone: "accent",
          } as TimelineEvent,
        ]
      : []),
    ...(invoice.paid_at
      ? [
          {
            icon: CircleDollarSign,
            title: "Paid",
            detail: formatMoney(totals.total_cents),
            at: formatDate(invoice.paid_at),
            tone: "success",
          } as TimelineEvent,
        ]
      : []),
    ...(invoice.status === "void"
      ? [
          {
            icon: Ban,
            title: "Voided",
            detail: "Keeps every audit stamp",
            at: timeAgo(invoice.updated_at),
            tone: "error",
          } as TimelineEvent,
        ]
      : []),
    ...(invoice.due_date && invoice.status !== "paid" && invoice.status !== "void"
      ? [
          {
            icon: Hourglass,
            title: overdue ? "Overdue" : "Payment due",
            detail: overdue ? "Past the due date" : "Last day to pay",
            at: formatDate(invoice.due_date),
            tone: overdue ? "error" : "muted",
          } as TimelineEvent,
        ]
      : []),
  ];

  // The band's honest one-liner: what state this money is in, in words.
  const statusNote =
    invoice.status === "paid"
      ? `Paid in full on ${formatDate(invoice.paid_at!)} — the audit stamp is never overwritten.`
      : invoice.status === "void"
        ? "Voided — the audit-safe cancel. Every stamp and edit is kept."
        : invoice.status === "sent"
          ? overdue
            ? `Sent and past its due date (${formatDate(invoice.due_date!)}). Payment is recorded by you, never assumed.`
            : `Sent${invoice.due_date ? ` — due ${formatDate(invoice.due_date)}` : ""}. Awaiting payment; you mark it paid when the money lands.`
          : "Still a draft — totals below are live from the line items, and nothing is sent to the client yet.";

  return (
    <div className="forma-core forma-invoices mx-auto max-w-6xl">
      {/* On-screen editor + document preview — hidden when printing; see
          PrintInvoiceDocument below for what actually prints. */}
      <div className="print:hidden">
        <Link href="/invoices" className="work-back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Invoices
        </Link>

        <DocHeader
          icon={Receipt}
          title={invoice.title}
          badges={<InvoiceStatusBadge status={invoice.status} />}
          subtitle={`${invoiceNumberLabel(invoice.invoice_number)} · ${invoice.client_name}`}
          actions={
            <>
              <DownloadPdfButton href={`/api/pdf/invoice/${invoice.id}`} />
              <PrintButton />
            </>
          }
        />

        {/* The payment-status band: the drawing is decorative, the note and
            chips state the document's real position in words. */}
        <div className="work-doc-band">
          <div className="work-doc-band-art">
            <InvoiceFlowArt />
          </div>
          <div className="work-doc-band-copy">
            <p className="forma-kicker">Payment status</p>
            <p className="work-doc-band-note">{statusNote}</p>
            <div className="work-doc-band-chips">
              <Badge variant="secondary">
                {invoiceNumberLabel(invoice.invoice_number)}
              </Badge>
              <Badge variant="secondary">
                {formatMoney(totals.total_cents)}
                {invoice.tax_percent > 0 ? ` incl. ${invoice.tax_percent}% tax` : ""}
              </Badge>
              {invoice.due_date && (
                <Badge variant="secondary">
                  {overdue ? "Overdue — " : ""}Due {formatDate(invoice.due_date)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            icon={Wallet}
            label="Total due"
            value={formatMoney(totals.total_cents)}
            hint={
              invoice.tax_percent > 0
                ? `incl. ${invoice.tax_percent}% tax`
                : "No tax applied"
            }
            tone="accent"
          />
          <StatTile
            icon={Clock}
            label="Due date"
            value={invoice.due_date ? formatDate(invoice.due_date) : "No due date"}
            hint={
              overdue
                ? "Overdue"
                : invoice.due_date
                  ? "Last day to pay"
                  : "Payable on receipt"
            }
            tone={overdue ? "error" : "muted"}
          />
          <StatTile
            icon={CircleDollarSign}
            label="Payment"
            value={
              invoice.paid_at
                ? formatDate(invoice.paid_at)
                : invoice.status === "sent"
                  ? "Awaiting"
                  : invoice.status === "void"
                    ? "Void"
                    : "Not sent"
            }
            hint={
              invoice.paid_at
                ? "Recorded in full"
                : `Outstanding ${formatMoney(totals.total_cents)}`
            }
            tone={invoice.paid_at ? "success" : "muted"}
          />
        </div>

        <div className="grid items-start gap-6 desk:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* ── Left: the invoice document + composer ── */}
          <div className="min-w-0 space-y-6">
            <PaperCard
              letterLabel="Invoice"
              letterhead={context.name}
              meta={invoiceNumberLabel(invoice.invoice_number)}
              footer={
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {invoice.notes || "—"}
                  </p>
                </div>
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Billed to
                  </p>
                  <p className="mt-1 font-display text-lg font-bold">
                    {invoice.client_name}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Issued {formatDate(invoice.created_at)}</p>
                  <p>
                    Due {invoice.due_date ? formatDate(invoice.due_date) : "on receipt"}
                  </p>
                </div>
              </div>

              {/* Line items — a labelled ledger with column headers from
                  600px; below that each row wraps, so nothing is clipped. */}
              <div className="ledger mt-6 border-t border-border">
                <div className="ledger-head" aria-hidden="true">
                  <span className="ledger-desc">Item</span>
                  <span className="ledger-qty">Qty</span>
                  <span className="ledger-unit">Unit</span>
                  <span className="ledger-amount">Amount</span>
                </div>
                {invoice.items.map((item) => (
                  <div key={item.id} className="ledger-row">
                    <p className="ledger-desc">{item.description}</p>
                    <p className="ledger-qty">×{item.quantity}</p>
                    <p className="ledger-unit">
                      {formatMoney(item.unit_amount_cents)}
                    </p>
                    <p className="ledger-amount">
                      {formatMoney(item.quantity * item.unit_amount_cents)}
                    </p>
                  </div>
                ))}
                {invoice.items.length === 0 && (
                  <p className="ledger-row ledger-desc text-muted-foreground">
                    No line items yet — add them in the editor below.
                  </p>
                )}
              </div>

              {/* Totals — computed, never stored. */}
              <div className="ledger-totals">
                <dl>
                  <div className="ledger-totals-row">
                    <dt className="ledger-totals-label">Subtotal</dt>
                    <dd className="ledger-totals-value">
                      {formatMoney(totals.subtotal_cents)}
                    </dd>
                  </div>
                  <div className="ledger-totals-row">
                    <dt className="ledger-totals-label">
                      Tax ({invoice.tax_percent}%)
                    </dt>
                    <dd className="ledger-totals-value">
                      {formatMoney(totals.tax_cents)}
                    </dd>
                  </div>
                  <div className="ledger-totals-row ledger-totals-final">
                    <dt className="ledger-totals-label">Total</dt>
                    <dd className="ledger-totals-value">
                      {formatMoney(totals.total_cents)}
                    </dd>
                  </div>
                </dl>
              </div>
            </PaperCard>

            <SectionCard
              icon={Receipt}
              title="Edit invoice"
              description="Line items are in dollars; the math is the same on the client’s public view. Totals are computed, never stored."
            >
              <InvoiceComposer
                invoiceId={invoice.id}
                initialTitle={invoice.title}
                initialClient={invoice.client_name}
                initialItems={invoice.items}
                initialTaxPercent={invoice.tax_percent}
                initialNotes={invoice.notes}
                initialDueDate={invoice.due_date}
              />
            </SectionCard>
          </div>

          {/* ── Right: link + metadata rail ── */}
          <div className="space-y-4">
            <SectionCard
              icon={Link2}
              title="Public link"
              description="Read-only invoice the client can open and print — revocable any time."
            >
              <InvoiceLinkPanel
                invoiceId={invoice.id}
                invoiceLink={link}
                invoiceStatus={invoice.status}
              />
            </SectionCard>

            <SectionCard icon={Receipt} title="Details">
              <div className="space-y-3.5">
                <MetaRow label="Status">
                  <InvoiceStatusSelect
                    invoiceId={invoice.id}
                    status={invoice.status}
                  />
                </MetaRow>
                <MetaRow label="Number">
                  {invoiceNumberLabel(invoice.invoice_number)}
                </MetaRow>
                <MetaRow label="Client">{invoice.client_name}</MetaRow>
                <MetaRow label="Due">
                  {invoice.due_date ? formatDate(invoice.due_date) : "On receipt"}
                </MetaRow>
                {invoice.sent_at && (
                  <MetaRow label="Sent">{formatDate(invoice.sent_at)}</MetaRow>
                )}
                {invoice.paid_at && (
                  <MetaRow label="Paid">{formatDate(invoice.paid_at)}</MetaRow>
                )}
                <MetaRow label="Created">
                  {formatDate(invoice.created_at)}
                </MetaRow>
                <MetaRow label="Updated">{timeAgo(invoice.updated_at)}</MetaRow>
              </div>
            </SectionCard>

            <SectionCard icon={Clock} title="Activity">
              <ActivityTimeline events={events} />
            </SectionCard>
          </div>
        </div>
      </div>

      {/* The printable document (browser print = the v1 export story):
          only this renders when printing — see PrintInvoiceDocument. */}
      <PrintInvoiceDocument invoice={invoice} workspaceName={context.name} />
    </div>
  );
}
