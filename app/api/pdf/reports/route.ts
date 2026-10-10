/** GET /api/pdf/reports — download the current workspace rollup as PDF. */

import { getBriefs } from "@/lib/data/briefs";
import { getContracts } from "@/lib/data/contracts";
import { getInvoices } from "@/lib/data/invoices";
import { getTimeEntries } from "@/lib/data/time";
import { getWorkspaceBranding } from "@/lib/data/workspace-branding";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { computeReport } from "@/lib/reports";
import { buildReportsPdf } from "@/lib/pdf/documents";
import { pdfResponse, requestedPageSize } from "@/lib/pdf/response";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return notFound();
  const context = await getWorkspaceContext();
  // Reports contain invoice and time totals; preserve the viewer's money-hide
  // rule even if the route is called directly rather than from the UI.
  if (!context?.canSeeMoney) return notFound();

  const [invoices, entries, contracts, briefs, branding] = await Promise.all([
    getInvoices(context.id),
    getTimeEntries(context.id),
    getContracts(context.id),
    getBriefs(context.id),
    getWorkspaceBranding(context.id),
  ]);
  if (!branding) return notFound();

  const result = buildReportsPdf({
    workspaceName: branding.name,
    logoDataUrl: branding.logoDataUrl,
    generatedAt: new Date(),
    pageSize: requestedPageSize(request),
    report: computeReport({ invoices, entries, contracts, briefs }),
  });

  return pdfResponse(result);
}
