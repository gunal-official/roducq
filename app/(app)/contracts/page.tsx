/**
 * /contracts — per-workspace engagement agreements (Step 19, third
 * platform-phase feature). Create happens on this page; the terms,
 * lifecycle stamps, and signatory live on the detail page.
 *
 * PHASE E: the page is a Forma financial plane (forma-contracts) — shared
 * PageHeader, then the band/toolbar/card vocabulary the client list owns.
 * The queries and the brief/client suggestion derivations are untouched.
 *
 * HOW TO TEST (locally — ⚠ apply the contracts migration + seed first):
 *   1. Open /contracts: TWO seeded contracts — "Brand refresh —
 *      engagement agreement" (Signed badge, Brightloop brief chip) and
 *      "Seasonal packaging — engagement agreement" (Draft badge,
 *      "Standalone — no brief"). The Draft/Sent/Signed/Void chips (with
 *      counts) filter; search matches title or client.
 *   2. "New contract" opens the composer-shell form — client (free text
 *      with datalist suggestions from the briefs), title, optional brief,
 *      optional expiry — saving creates a DRAFT and redirects to its
 *      composer.
 *   3. Saving edits on the detail page revalidates this list (badge and
 *      "updated" time move after navigating back).
 */

import { FileSignature } from "lucide-react";

import { ContractsList } from "@/components/contracts/ContractsList";
import { PageHeader } from "@/components/ui/page";
import { getContracts } from "@/lib/data/contracts";
import { getBriefs } from "@/lib/data/briefs";
import { getWorkspaceContext } from "@/lib/data/workspace-context";

export default async function ContractsPage() {
  // Scoped to the caller's ACTIVE workspace (Step 16), like every list.
  const context = await getWorkspaceContext();
  const [contracts, briefs] = await Promise.all([
    context ? getContracts(context.id) : Promise.resolve([]),
    context ? getBriefs(context.id) : Promise.resolve([]),
  ]);

  // id → title map for the cards + create form's brief picker.
  const briefTitles: Record<string, string> = {};
  for (const brief of briefs) briefTitles[brief.id] = brief.title;

  // Datalist suggestions: distinct client names seen on this
  // workspace's briefs (suggestion only — client_name stays free text).
  const clientSuggestions = Array.from(
    new Set(briefs.map((b) => b.client_name).filter((c): c is string => !!c))
  );

  return (
    <div className="forma-core forma-contracts mx-auto max-w-6xl">
      <PageHeader
        icon={FileSignature}
        eyebrow={context?.name}
        title="Contracts"
        subtitle="Engagement agreements — draft → sent → signed, plus void as the audit-safe cancel."
      />

      <ContractsList
        contracts={contracts}
        briefTitles={briefTitles}
        clientSuggestions={clientSuggestions}
      />
    </div>
  );
}
