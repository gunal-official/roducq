/**
 * /time — the hours log (Step 18, "timer + hours log" half two). Entries
 * are grouped by worked_on — the day the work happened, backdateable —
 * never by created_at. Today / this-month totals are computed in TS from
 * the fetched rows (nothing is stored that can drift).
 *
 * PHASE E: the page is a Forma financial plane (forma-time) — shared
 * PageHeader; the band, toolbar and day panels live in TimeLog. The
 * queries and the viewer gate are untouched.
 *
 * The floating timer pill (TimeTimer, mounted in the (app) layout) is the
 * other entry point; both write through app/(app)/time/actions.ts.
 *
 * HOW TO TEST (locally — ⚠ apply the time_entries migration + seed first):
 *   1. Open /time: four seeded entries in day groups (Today first):
 *      "Concept exploration — first visual directions" (3h 40m, today,
 *      Brightloop brief chip), "Kickoff — discovery call…" (2h 15m),
 *      "Portfolio refresh + client outreach" (1h, NO brief chip),
 *      "Phase-two proposal polish" (1h 30m). The band shows the today
 *      total + month total.
 *   2. "Log time" → description, minutes, date (defaults to today —
 *      backdating works), optional brief → Save lands it in the right
 *      day group and moves both totals.
 *   3. The floating pill (bottom-right on every app page): start it on
 *      /invoices, navigate — it keeps running; refresh mid-run — it
 *      survives (localStorage). Stop → the stop form opens with the
 *      elapsed minutes prefilled; Cancel returns to running, Save logs
 *      the entry.
 *   4. Edit (all fields) and delete (two-step confirm) each row.
 *   5. The brief filter shows one brief's entries; general entries only
 *      appear under "All time".
 */

import { Timer } from "lucide-react";

import { TimeLog } from "@/components/time/TimeLog";
import { DownloadPdfButton } from "@/components/ui/DownloadPdfButton";
import { PageHeader } from "@/components/ui/page";
import { getTimeEntries } from "@/lib/data/time";
import { getBriefs } from "@/lib/data/briefs";
import { getWorkspaceContext } from "@/lib/data/workspace-context";

export default async function TimePage() {
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
  const [entries, briefs] = await Promise.all([
    context ? getTimeEntries(context.id) : Promise.resolve([]),
    context ? getBriefs(context.id) : Promise.resolve([]),
  ]);

  return (
    <div className="forma-core forma-time mx-auto max-w-3xl">
      <PageHeader
        icon={Timer}
        eyebrow={context.name}
        title="Time"
        subtitle="Your hours log — grouped by the day the work happened."
        actions={<DownloadPdfButton href="/api/pdf/time" label="Download PDF" />}
      />

      <TimeLog
        entries={entries}
        briefs={briefs.map((b) => ({ id: b.id, title: b.title }))}
      />
    </div>
  );
}
