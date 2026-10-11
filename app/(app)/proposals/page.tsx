/**
 * /proposals — proposals generated from briefs, with status filter chips
 * and search.
 *
 * PHASE 4A LAYOUT CONTRACT
 *   every width  PageHeader (icon, eyebrow = workspace, the "Open briefs"
 *                action — proposals originate from briefs, so there is no
 *                inline create), then the stat tiles, chips and search.
 *   tablet+      cards in two columns, three from the xl band.
 *
 * HOW TO TEST (locally — Supabase configured per README.md, seed loaded):
 *   1. Open /proposals: the seeded "Brightloop Co." proposal renders as a
 *      card — Draft badge, client name, "1/3 deliverables done" chip, and
 *      an "Updated … ago" timestamp.
 *   2. Status chips (All / Draft / Sent / Accepted / Declined with counts)
 *      and the search box filter the grid client-side; no matches →
 *      "No matching proposals" + Clear filters. With zero proposals the
 *      page shows "No proposals yet" with a CTA to /briefs (there is no
 *      "New" button — proposals only originate from briefs).
 *   3. Card title links into /proposals/[id]; changing the status there
 *      and navigating back shows the updated badge (updateProposalStatus
 *      revalidates /proposals).
 */

import Link from "next/link";
import { FileText } from "lucide-react";

import { ProposalsList } from "@/components/proposals/ProposalsList";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { getProposals } from "@/lib/data/proposals";
import { getWorkspaceContext } from "@/lib/data/workspace-context";

export default async function ProposalsPage() {
  // Scoped to the caller's ACTIVE workspace (Step 16).
  const context = await getWorkspaceContext();
  const proposals = context ? await getProposals(context.id) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={FileText}
        eyebrow={context?.name}
        title="Proposals"
        subtitle="Generated from briefs — open a brief to create one."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/briefs" className="inline-flex min-h-11 min-w-11 items-center">
              Open briefs
            </Link>
          </Button>
        }
      />

      <ProposalsList proposals={proposals} />
    </div>
  );
}
