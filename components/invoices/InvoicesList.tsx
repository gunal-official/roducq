"use client";

// Overdue cutoff, stamped at import (React render must stay pure).
const TODAY_I = new Date().toISOString().slice(0, 10);

/**
 * Client side of /invoices — status filter chips + search over the list
 * the server page fetched, plus create-on-list (the settings/templates
 * precedent for creation living on the list page).
 *
 * PHASE E LAYOUT CONTRACT (the Phase D list contract, applied to money):
 *   every width   lavender showcase band (honest orientation copy, the real
 *                 counts, the invoice-flow drawing), stat tiles carrying the
 *                 real money totals, then the tinted toolbar: FilterChips +
 *                 search (stacked under 600px, one row from tab).
 *   tablet+       cards in two columns, three from the desk band.
 *   Cards are Forma work cards: lavender icon plate, 44px title link,
 *   status badge, and a FIGURE row — the document's number beside its
 *   computed total — with due-date/overdue copy in the footer. Overdue is
 *   stated in words, never left to a colour.
 *
 * The create form's client_name input is backed by a <datalist> of
 * client names seen on this workspace's briefs — a suggestion, never a
 * constraint (D1: standalone invoice, free-text client, no clients
 * table yet).
 */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, Plus, Search, X, Receipt, Wallet, CircleDollarSign, Clock } from "lucide-react";

import { createInvoice } from "@/app/(app)/invoices/actions";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { Button } from "@/components/ui/button";
import { CardFigure, WorkBand, WorkCard } from "@/components/workflow/WorkCard";
import { InvoiceFlowArt } from "@/components/workflow/FinancialArt";
import { FilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { SectionCard, EmptyState } from "@/components/ui/page";
import { formatDate, formatMoney, invoiceNumberLabel, timeAgo } from "@/lib/utils";
import { ListStats, StatTile, StackedBar } from "@/components/ui/doc-detail";
import type { InvoiceStatus, InvoiceSummary } from "@/lib/types/invoice";

type StatusFilter = "all" | InvoiceStatus;

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

export function InvoicesList({
  invoices,
  clientSuggestions,
}: {
  invoices: InvoiceSummary[];
  clientSuggestions: string[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [creatingPending, setCreatingPending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: invoices.length,
      draft: 0,
      sent: 0,
      paid: 0,
      void: 0,
    };
    for (const invoice of invoices) counts[invoice.status] += 1;
    return counts;
  }, [invoices]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (statusFilter !== "all" && invoice.status !== statusFilter)
        return false;
      if (!q) return true;
      return (
        invoice.title.toLowerCase().includes(q) ||
        invoice.client_name.toLowerCase().includes(q) ||
        invoiceNumberLabel(invoice.invoice_number).toLowerCase().includes(q)
      );
    });
  }, [invoices, statusFilter, query]);

  async function handleCreate() {
    setCreatingPending(true);
    setCreateError(null);
    const result = await createInvoice({
      client_name: newClient,
      title: newTitle,
      due_date: newDue || null,
    });
    setCreatingPending(false);
    if (result?.error) {
      setCreateError(result.error);
      return;
    }
    // Creation succeeded → compose the new invoice (add line items).
    if (result?.id) router.push(`/invoices/${result.id}`);
  }

  const outstandingCents = invoices
    .filter((i) => i.status === "sent")
    .reduce((n, i) => n + i.total_cents, 0);
  const paidCents = invoices
    .filter((i) => i.status === "paid")
    .reduce((n, i) => n + i.total_cents, 0);
  const overdueCount = invoices.filter(
    (i) => i.status === "sent" && i.due_date && i.due_date < TODAY_I
  ).length;

  return (
    <div>
      <WorkBand
        kicker="Invoices"
        title="Money your workspace has billed"
        description="Every invoice is numbered per workspace — INV-0001 is your first. Draft one here, add the line items on the document itself, and share it with the client through a revocable public link. Statuses are stamps you set; RoduCQ never marks one paid for you."
        art={<InvoiceFlowArt />}
        stats={[
          { value: invoices.length, label: "invoices" },
          { value: formatMoney(outstandingCents), label: "outstanding" },
          { value: overdueCount, label: "overdue" },
        ]}
      />

      <ListStats
        cols={3}
        bar={
          <StackedBar
            segments={[
              { label: "Paid", weight: paidCents, display: formatMoney(paidCents), className: "bg-success" },
              { label: "Outstanding", weight: outstandingCents, display: formatMoney(outstandingCents), className: "bg-accent" },
            ]}
          />
        }
      >
        <StatTile
          icon={Wallet}
          label="Outstanding"
          value={formatMoney(outstandingCents)}
          hint="Sent, awaiting payment"
          tone="accent"
        />
        <StatTile
          icon={CircleDollarSign}
          label="Paid"
          value={formatMoney(paidCents)}
          hint="Recorded in full"
          tone="success"
          delay={40}
        />
        <StatTile
          icon={Clock}
          label="Overdue"
          value={overdueCount}
          hint="Past the due date"
          tone={overdueCount > 0 ? "error" : "muted"}
          delay={80}
        />
      </ListStats>

      <div className="work-toolbar flex flex-col gap-3 tab:flex-row tab:items-center tab:justify-between">
        <FilterChips
          label="Filter invoices by status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={FILTER_OPTIONS.map((option) => ({
            ...option,
            count: statusCounts[option.value],
          }))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full tab:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, client, or #…"
              className="pl-8"
              aria-label="Search invoices"
            />
          </div>
          {!creating && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New invoice
            </Button>
          )}
        </div>
      </div>

      {creating && (
        <SectionCard
          icon={Plus}
          title="New invoice"
          description="Starts as a draft — add line items after saving. The client name is free text; suggestions come from this workspace’s briefs."
          tone="accent"
          className="mb-6"
          actions={
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setNewClient("");
                setNewTitle("");
                setNewDue("");
                setCreateError(null);
              }}
              disabled={creatingPending}
            >
              <X className="mr-2 h-4 w-4" aria-hidden="true" />
              Cancel
            </Button>
          }
        >
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="composer-field">
                <label htmlFor="new-invoice-client" className="composer-hint">
                  Client
                </label>
                <Input
                  id="new-invoice-client"
                  list="invoice-client-suggestions"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  placeholder="e.g. Brightloop Co."
                />
                <datalist id="invoice-client-suggestions">
                  {clientSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div className="composer-field">
                <label htmlFor="new-invoice-title" className="composer-hint">
                  Title
                </label>
                <Input
                  id="new-invoice-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Brand refresh — phase one"
                />
              </div>
            </div>
            <div className="composer-field">
              <label htmlFor="new-invoice-due" className="composer-hint">
                Due date (optional)
              </label>
              <Input
                id="new-invoice-due"
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="w-48"
              />
            </div>
            {createError && (
              <p className="composer-error" role="alert">
                {createError}
              </p>
            )}
            <div className="composer-actions">
              <p className="composer-hint">
                Saving creates the next numbered draft and opens it for line items.
              </p>
              <Button type="submit" disabled={creatingPending}>
                {creatingPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Create draft
              </Button>
            </div>
          </form>
        </SectionCard>
      )}

      {visible.length === 0 ? (
        invoices.length > 0 ? (
          <EmptyState
            icon={Receipt}
            title="No matching invoices"
            description="Try a different search or status filter."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setStatusFilter("all");
                  setQuery("");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Create your first invoice — it will be numbered INV-0001 for this workspace, and you can add line items right after."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                New invoice
              </Button>
            }
          />
        )
      ) : (
        <div className="work-grid grid gap-4 sm:grid-cols-2 desk:grid-cols-3">
          {visible.map((invoice) => {
            const overdue =
              invoice.status === "sent" &&
              !!invoice.due_date &&
              invoice.due_date < TODAY_I;
            return (
              <WorkCard
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                title={invoice.title}
                client={invoice.client_name}
                icon={Receipt}
                badge={<InvoiceStatusBadge status={invoice.status} />}
                figure={
                  <CardFigure
                    label={invoiceNumberLabel(invoice.invoice_number)}
                    amount={formatMoney(invoice.total_cents)}
                  />
                }
                meta={
                  <>
                    <span className="work-card-time">
                      {invoice.due_date
                        ? overdue
                          ? `Overdue — was due ${formatDate(invoice.due_date)}`
                          : `Due ${formatDate(invoice.due_date)}`
                        : "Due on receipt"}
                    </span>
                    <span className="work-card-quiet">
                      Updated {timeAgo(invoice.updated_at)}
                    </span>
                  </>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
