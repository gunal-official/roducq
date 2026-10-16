/**
 * /invoices — standalone, per-workspace, sequentially numbered invoices
 * (Step 17, first platform-phase feature). Create happens on this page;
 * line items, tax, status, and the public link live on the detail page.
 *
 * PHASE E: the page is a Forma financial plane (forma-invoices) — shared
 * PageHeader, then the band/toolbar/card vocabulary the client list owns.
 * The viewer gate and both queries are untouched.
 *
 * HOW TO TEST (locally — ⚠ apply the invoices migration + seed first):
 *   1. Open /invoices: TWO seeded invoices render — INV-0001 (Draft
 *      badge, "Brand refresh — phase one") and INV-0002 (Sent badge,
 *      tax-included total). Draft/Sent/Paid/Void chips (with counts)
 *      filter; search matches title, client, or number.
 *   2. "New invoice" opens the composer-shell form — client name gets
 *      datalist suggestions from the Brightloop brief, title + optional
 *      due date — saving creates a draft with the next number and
 *      redirects to its composer.
 *   3. Saving edits on the detail page revalidates this list (total
 *      and badge update after navigating back).
 */

import { Receipt } from "lucide-react";

import { InvoicesList } from "@/components/invoices/InvoicesList";
import { PageHeader } from "@/components/ui/page";
import { getInvoices } from "@/lib/data/invoices";
import { getBriefs } from "@/lib/data/briefs";
import { getWorkspaceContext } from "@/lib/data/workspace-context";

export default async function InvoicesPage() {
  // Scoped to the caller's ACTIVE workspace (Step 16), like every list.
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
  const [invoices, briefs] = await Promise.all([
    context ? getInvoices(context.id) : Promise.resolve([]),
    context ? getBriefs(context.id) : Promise.resolve([]),
  ]);

  // Datalist suggestions: distinct client names seen on this workspace's
  // briefs (suggestion only — client_name stays free text).
  const clientSuggestions = Array.from(
    new Set(briefs.map((b) => b.client_name).filter((c): c is string => !!c))
  );

  return (
    <div className="forma-core forma-invoices mx-auto max-w-6xl">
      <PageHeader
        icon={Receipt}
        eyebrow={context.name}
        title="Invoices"
        subtitle="Numbered per workspace — INV-0001 is your first."
      />

      <InvoicesList invoices={invoices} clientSuggestions={clientSuggestions} />
    </div>
  );
}
