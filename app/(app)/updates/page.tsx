/**
 * /updates — client updates composed from plans, with status filter tabs
 * and search.
 *
 * HOW TO TEST (locally — Supabase configured per README.md, ⚠ apply the
 * new updates migration + seed first):
 *   1. Open /updates: TWO seeded updates render — "…Week 1" (Sent badge,
 *      older) and "…Week 2" (Draft badge, more recent, first in the grid
 *      thanks to updated_at ordering). The Draft/Sent tabs (with counts)
 *      filter between them; the search box matches title or client.
 *   2. No matches → "No matching updates" + Clear filters. With zero
 *      updates the page shows "No updates yet" with a CTA to /plans
 *      (there is no "New" button — updates only originate from plans).
 *   3. Card title links into /updates/[id]; saving edits or changing the
 *      status there and navigating back reflects here (both actions
 *      revalidate /updates).
 */

import { Megaphone } from "lucide-react";
import { UpdatesList } from "@/components/updates/UpdatesList";
import { PageHeader } from "@/components/ui/page";
import { getUpdates } from "@/lib/data/updates";
import { getWorkspaceContext } from "@/lib/data/workspace-context";

export default async function UpdatesPage() {
  // Scoped to the caller's ACTIVE workspace (Step 16).
  const context = await getWorkspaceContext();
  const updates = context ? await getUpdates(context.id) : [];

  return (
    <div className="forma-core forma-updates mx-auto max-w-6xl">
      <PageHeader
        icon={Megaphone}
        eyebrow={context?.name}
        title="Updates"
        subtitle="Composed from plans — open a plan to write one."
      />

      <UpdatesList updates={updates} />
    </div>
  );
}
