/**
 * /briefs — list view of every brief in the workspace, with status filter
 * chips and search.
 *
 * PHASE 4A LAYOUT CONTRACT
 *   every width  PageHeader (icon, eyebrow = workspace, real counts in the
 *                list head), then the status chips + search. On phones the
 *                action row takes its own line under the title.
 *   tablet+      cards in two columns, three from the xl band.
 *
 * HOW TO TEST (locally — Supabase configured per README.md, seed loaded):
 *   1. Log in and open /briefs: the seeded "Brightloop Co." brief renders as
 *      a card — Draft badge, client name, "1 open question" badge, and an
 *      "Updated … ago" timestamp.
 *   2. Status chips (All / Draft / In review / Approved with counts) and the
 *      search box both filter the grid client-side; with no matches you get
 *      the "No matching briefs" empty state + Clear filters.
 *   3. Title links into /briefs/[id]; changing the status there and
 *      navigating back shows the updated badge (updateBriefStatus already
 *      revalidates /briefs).
 *   4. "New brief" links to /intake. With zero briefs the page shows the
 *      "No briefs yet" empty state with a create CTA.
 */

import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { BriefsList } from "@/components/briefs/BriefsList";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { getBriefs } from "@/lib/data/briefs";
import { getWorkspaceContext } from "@/lib/data/workspace-context";

export default async function BriefsPage() {
  // Scoped to the caller's ACTIVE workspace (Step 16); the (app) layout
  // guarantees a membership exists, so an empty context here is only a
  // theoretical race — render the empty state rather than crash.
  const context = await getWorkspaceContext();
  const briefs = context ? await getBriefs(context.id) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={ClipboardList}
        eyebrow={context?.name}
        title="Briefs"
        subtitle="Every client brief in your workspace."
        actions={
          <Button asChild>
            <Link href="/intake" className="inline-flex min-h-11 min-w-11 items-center">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New brief
            </Link>
          </Button>
        }
      />

      <BriefsList briefs={briefs} />
    </div>
  );
}
