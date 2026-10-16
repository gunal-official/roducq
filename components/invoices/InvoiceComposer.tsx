"use client";

/**
 * The invoice composer (Step 17): editable title, client, line items
 * (description + quantity + unit price in integer cents under the
 * hood), tax %, due date, and notes — with an explicit Save (no
 * autosave, UpdateComposer precedent: local edits diverge from the
 * server props, an "Unsaved changes" chip appears, Save persists via
 * saveInvoiceContent, and fresh props re-sync the fields).
 *
 * Money: inputs are DOLLAR strings ("1200.50"); they are converted to
 * integer cents on save. Totals (subtotal → tax → total) render live
 * via the same pure lib/invoice-totals.ts the server uses, so what you
 * see is exactly what the client's invoice will show.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useMotionItems } from "@/components/ui/motion-rows";

import { saveInvoiceContent } from "@/app/(app)/invoices/[id]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { invoiceTotals } from "@/lib/invoice-totals";
import { formatMoney } from "@/lib/utils";
import type { InvoiceItem } from "@/lib/types/invoice";

/** Editable row: money/quantity held as raw input strings. */
interface LocalItem {
  id: string;
  description: string;
  quantity: string;
  unit_amount: string;
}

function toLocalItems(items: readonly InvoiceItem[]): LocalItem[] {
  return items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: String(item.quantity),
    unit_amount: (item.unit_amount_cents / 100).toString(),
  }));
}

function centsFromDollars(s: string): number | null {
  const cleaned = s.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

function qtyFromInput(s: string): number | null {
  if (!/^\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return n >= 1 ? n : null;
}

function taxFromInput(s: string): number | null {
  const cleaned = s.replace(/[%\s]/g, "");
  if (cleaned === "") return 0;
  if (!/^\d{0,2}(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  return n >= 0 && n <= 100 ? n : null;
}

export function InvoiceComposer({
  invoiceId,
  initialTitle,
  initialClient,
  initialItems,
  initialTaxPercent,
  initialNotes,
  initialDueDate,
}: {
  invoiceId: string;
  initialTitle: string;
  initialClient: string;
  initialItems: InvoiceItem[];
  initialTaxPercent: number;
  initialNotes: string;
  initialDueDate: string | null;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [client, setClient] = useState(initialClient);
  const toast = useToast();
  const [items, setItems] = useState<LocalItem[]>(() =>
    toLocalItems(initialItems)
  );
  const display = useMotionItems(items);
  const [tax, setTax] = useState(
    initialTaxPercent > 0 ? String(initialTaxPercent) : ""
  );
  const [notes, setNotes] = useState(initialNotes);
  const [dueDate, setDueDate] = useState(initialDueDate ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the server re-renders with fresh data after save
  // (adjust-state-during-render — the endorsed props→state pattern).
  const seedKey = JSON.stringify([
    initialTitle,
    initialClient,
    initialItems,
    initialTaxPercent,
    initialNotes,
    initialDueDate ?? null,
  ]);
  const [prevSeed, setPrevSeed] = useState(seedKey);
  if (prevSeed !== seedKey) {
    setPrevSeed(seedKey);
    setTitle(initialTitle);
    setClient(initialClient);
    setItems(toLocalItems(initialItems));
    setTax(initialTaxPercent > 0 ? String(initialTaxPercent) : "");
    setNotes(initialNotes);
    setDueDate(initialDueDate ?? "");
  }

  const dirty =
    title !== initialTitle ||
    client !== initialClient ||
    JSON.stringify(items) !== JSON.stringify(toLocalItems(initialItems)) ||
    tax !== (initialTaxPercent > 0 ? String(initialTaxPercent) : "") ||
    notes !== initialNotes ||
    dueDate !== (initialDueDate ?? "");

  /** Best-effort parse for the live totals (invalid cells count as 0 —
   *  the full validation happens on save). */
  const liveTotals = useMemo(() => {
    const parsed: InvoiceItem[] = items
      // completely blank rows don't count yet
      .filter(
        (item) =>
          item.description.trim() !== "" ||
          item.quantity.trim() !== "" ||
          item.unit_amount.trim() !== ""
      )
      .map((item) => ({
        id: item.id,
        description: item.description,
        quantity: qtyFromInput(item.quantity) ?? 0,
        unit_amount_cents: centsFromDollars(item.unit_amount) ?? 0,
      }));
    return invoiceTotals(parsed, taxFromInput(tax) ?? 0);
  }, [items, tax]);

  function updateItem(index: number, patch: Partial<LocalItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), description: "", quantity: "1", unit_amount: "" },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError(null);

    // Validate FIRST (nothing pending yet) so a validation error never
    // leaves the spinner up.
    const parsedItems: InvoiceItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isEmpty =
        item.description.trim() === "" &&
        item.quantity.trim() === "" &&
        item.unit_amount.trim() === "";
      if (isEmpty) continue; // blank row → dropped
      if (!item.description.trim()) {
        setError(`Line ${i + 1}: description is required.`);
        return;
      }
      const quantity = qtyFromInput(item.quantity);
      if (quantity === null) {
        setError(`Line ${i + 1}: quantity must be a whole number of 1 or more.`);
        return;
      }
      const unit_amount_cents = centsFromDollars(item.unit_amount);
      if (unit_amount_cents === null) {
        setError(`Line ${i + 1}: enter a non-negative amount, e.g. 1200.50.`);
        return;
      }
      parsedItems.push({
        id: item.id,
        description: item.description.trim(),
        quantity,
        unit_amount_cents,
      });
    }
    const taxPercent = taxFromInput(tax);
    if (taxPercent === null) {
      setError("Tax must be a number between 0 and 100.");
      return;
    }

    setPending(true);
    const result = await saveInvoiceContent({
      invoiceId,
      title,
      client_name: client,
      items: parsedItems,
      tax_percent: taxPercent,
      notes,
      due_date: dueDate || null,
    });

    setPending(false);
    if (result?.error) setError(result.error);
    else toast("Invoice saved");
  }

  return (
    <div className="composer">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="composer-field">
          <label htmlFor="invoice-composer-title" className="composer-hint">
            Title
          </label>
          <Input
            id="invoice-composer-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Invoice title"
          />
        </div>
        <div className="composer-field">
          <label htmlFor="invoice-composer-client" className="composer-hint">
            Client
          </label>
          <Input
            id="invoice-composer-client"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Client name"
          />
        </div>
      </div>

      {/* ── Line items ── */}
      <div className="composer-field">
        <div className="composer-field-head">
          <span className="composer-hint">Line items</span>
          <span className="composer-hint">
            Amounts in dollars · live totals below use the same math as the
            client’s view
          </span>
        </div>
        <div className="line-items">
          <div className="line-item-head" aria-hidden="true">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Amount</span>
            <span />
          </div>
          {items.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              No line items yet — add the first one below.
            </p>
          )}
        {display.map(({ item, leaving }) => {
          // Bind inputs to the CURRENT item from state, never to the
          // motion snapshot: useMotionItems only re-syncs its entries
          // when the id SET changes (add/remove row) — a pure content
          // edit leaves `display` holding the pre-keystroke snapshot, so
          // a snapshot-bound input re-renders with the stale value and
          // swallows every keystroke. Leaving rows are already gone from
          // `items`, so they fall back to the snapshot and keep showing
          // their old content while collapsing out.
          //
          // `disabled` follows the same rule as aria-hidden: ONLY a row
          // that is genuinely animating out (its id already left
          // `items`) is disabled. On load every entry is seeded
          // `leaving: false` and a row only flips when removed, so
          // pre-existing rows render fully editable (no disabled
          // attribute, normal text cursor) — and stay that way through
          // StrictMode's double effect-run, which re-diffs the SAME id
          // set and is therefore idempotent.
          const index = items.findIndex((x) => x.id === item.id);
          const live = index !== -1 ? items[index] : item;
          return (
            <div
              key={item.id}
              aria-hidden={leaving || undefined}
              className={`line-item-row ${leaving ? "animate-row-out" : "animate-rise-in"}`}
            >
              <Input
                value={live.description}
                disabled={leaving || undefined}
                onChange={(e) => {
                  if (index !== -1) updateItem(index, { description: e.target.value });
                }}
                placeholder="What is being billed?"
                aria-label="Line description"
              />
              <Input
                value={live.quantity}
                disabled={leaving || undefined}
                onChange={(e) => {
                  if (index !== -1) updateItem(index, { quantity: e.target.value });
                }}
                inputMode="numeric"
                className="text-right"
                aria-label="Line quantity"
              />
              <Input
                value={live.unit_amount}
                disabled={leaving || undefined}
                onChange={(e) => {
                  if (index !== -1) updateItem(index, { unit_amount: e.target.value });
                }}
                inputMode="decimal"
                placeholder="0.00"
                className="text-right"
                aria-label="Line unit price"
              />
              <span className="truncate text-right text-sm text-muted-foreground">
                {centsFromDollars(live.unit_amount) !== null &&
                qtyFromInput(live.quantity) !== null
                  ? formatMoney(
                      (centsFromDollars(live.unit_amount) ?? 0) *
                        (qtyFromInput(live.quantity) ?? 0)
                    )
                  : "—"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-8 shrink-0"
                onClick={() => {
                  if (index !== -1) removeItem(index);
                }}
                aria-label={`Remove line ${item.id}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          );
        })}
        <Button type="button" variant="ghost" size="sm" onClick={addItem}>
          <Plus className="mr-1.5 h-4 w-4"  aria-hidden="true" />
          Add line item
        </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="composer-field">
          <label htmlFor="invoice-composer-tax" className="composer-hint">
            Tax %
          </label>
          <Input
            id="invoice-composer-tax"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            className="w-24"
          />
        </div>
        <div className="composer-field">
          <label htmlFor="invoice-composer-due" className="composer-hint">
            Due date
          </label>
          <Input
            id="invoice-composer-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="hidden sm:block" />
      </div>

      <div className="composer-field">
        <label htmlFor="invoice-composer-notes" className="composer-hint">
          Notes (shown to the client)
        </label>
        <Textarea
          id="invoice-composer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Net 14 — please pay within 14 days of the due date."
          rows={3}
          className="composer-body"
        />
      </div>

      {/* ── Live totals (same math as the saved/public views) ── */}
      <div className="ledger-totals border-t border-border pt-3">
        <dl>
          <div className="ledger-totals-row">
            <dt className="ledger-totals-label">Subtotal</dt>
            <dd className="ledger-totals-value">
              {formatMoney(liveTotals.subtotal_cents)}
            </dd>
          </div>
          <div className="ledger-totals-row">
            <dt className="ledger-totals-label">Tax ({taxFromInput(tax) ?? 0}%)</dt>
            <dd className="ledger-totals-value">
              {formatMoney(liveTotals.tax_cents)}
            </dd>
          </div>
          <div className="ledger-totals-row ledger-totals-final">
            <dt className="ledger-totals-label">Total</dt>
            <dd className="ledger-totals-value">
              {formatMoney(liveTotals.total_cents)}
            </dd>
          </div>
        </dl>
      </div>

      {error && (
        <p className="composer-error" role="alert">
          {error}
        </p>
      )}

      <div className="composer-actions">
        {dirty ? (
          <Badge variant="secondary">Unsaved changes</Badge>
        ) : (
          <span className="composer-hint">All changes saved</span>
        )}
        <Button
          type="button"
          onClick={handleSave}
          disabled={pending || !dirty}
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin"  aria-hidden="true" />
          ) : (
            <Save className="mr-2 h-4 w-4"  aria-hidden="true" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
