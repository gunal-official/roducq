/** GET /api/pdf/time — download every visible workspace time entry as PDF. */

import { getBriefs } from "@/lib/data/briefs";
import { getTimeEntries } from "@/lib/data/time";
import { getWorkspaceBranding } from "@/lib/data/workspace-branding";
import { getWorkspaceContext } from "@/lib/data/workspace-context";
import { buildTimePdf } from "@/lib/pdf/documents";
import { pdfResponse, requestedPageSize } from "@/lib/pdf/response";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { localToday } from "@/lib/utils";

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
  if (!context?.canSeeMoney) return notFound();

  const [entries, briefs, branding] = await Promise.all([
    getTimeEntries(context.id),
    getBriefs(context.id),
    getWorkspaceBranding(context.id),
  ]);
  if (!branding) return notFound();

  const briefTitles = new Map(briefs.map((brief) => [brief.id, brief.title]));
  const result = buildTimePdf({
    workspaceName: branding.name,
    logoDataUrl: branding.logoDataUrl,
    generatedAt: new Date(),
    pageSize: requestedPageSize(request),
    today: localToday(),
    entries: entries.map((entry) => ({
      workedOn: entry.worked_on,
      description: entry.description,
      durationMinutes: entry.duration_minutes,
      briefTitle: entry.brief_id ? briefTitles.get(entry.brief_id) ?? null : null,
    })),
  });

  return pdfResponse(result);
}
