/**
 * /plans — task plans generated from proposals, with status filter tabs
 * and search.
 *
 * HOW TO TEST (locally — Supabase configured per README.md, ⚠ apply the
 * new plans migration + seed first):
 *   1. Open /plans: the seeded "Brightloop Co." plan renders as a card —
 *      Not started badge, client name, "1/3 tasks done" chip, and an
 *      "Updated … ago" timestamp.
 *   2. Status tabs (All / Not started / In progress / Done with counts)
 *      and the search box filter the grid client-side; no matches →
 *      "No matching plans" + Clear filters. With zero plans the page shows
 *      "No plans yet" with a CTA to /proposals (there is no "New" button —
 *      plans only originate from proposals).
 *   3. Card title links into /plans/[id]; toggling a task or changing the
 *      status there and navigating back shows the updated numbers/badge
 *      (both actions revalidate /plans).
 */

import { ListChecks } from "lucide-react";
import { PlansList } from "@/components/plans/PlansList";
import { PageHeader } from "@/components/ui/page";
import { getPlans } from "@/lib/data/plans";
import { getWorkspaceContext } from "@/lib/data/workspace-context";

export default async function PlansPage() {
  // Scoped to the caller's ACTIVE workspace (Step 16).
  const context = await getWorkspaceContext();
  const plans = context ? await getPlans(context.id) : [];

  return (
    <div className="forma-core forma-plans mx-auto max-w-6xl">
      <PageHeader
        icon={ListChecks}
        eyebrow={context?.name}
        title="Plans"
        subtitle="Generated from proposals — open a proposal to create one."
      />

      <PlansList plans={plans} />
    </div>
  );
}
