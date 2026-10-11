/**
 * The budget + deliverables BODY of a proposal document (Queue #7
 * extraction): used by the live detail page (current content) AND the
 * read-only version snapshot view, so a historical version renders
 * exactly the way the proposal looked at capture time. Presentational —
 * no data access, safe to render from any server component.
 *
 * Phase 4A: the body is two named sections a client can scan — the scope
 * of work (what is agreed) and the budget & timeline (what it costs and
 * when). Same copy and data as before; only the document structure changed.
 */

import { Check } from "lucide-react";

import type { BriefDeliverable } from "@/lib/types/brief";

function SectionHead({
  id,
  title,
  aside,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <h2
        id={id}
        className="font-display text-base font-bold tracking-tight"
      >
        {title}
      </h2>
      {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
    </div>
  );
}

export function ProposalContent({
  budget_timeline,
  deliverables,
}: {
  budget_timeline: string | null;
  deliverables: BriefDeliverable[];
}) {
  const doneCount = deliverables.filter((d) => d.checked).length;

  return (
    <div className="space-y-8">
      <section aria-labelledby="proposal-scope" className="space-y-3">
        <SectionHead
          id="proposal-scope"
          title="Scope of work"
          aside={`${doneCount} of ${deliverables.length} done`}
        />
        <ul className="space-y-1">
          {deliverables.length === 0 ? (
            <li className="py-1 text-sm italic text-muted-foreground">
              No deliverables captured.
            </li>
          ) : (
            deliverables.map((d) => (
              <li
                key={d.id}
                className="flex items-start gap-2.5 rounded-control px-1 py-1.5"
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                    d.checked
                      ? "border-success bg-success text-success-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {d.checked && (
                    <Check
                      className="h-3 w-3"
                      strokeWidth={3.5}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span
                  className={
                    d.checked
                      ? "break-words text-sm text-muted-foreground line-through"
                      : "break-words text-sm"
                  }
                >
                  {d.text}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section aria-labelledby="proposal-budget" className="space-y-3">
        <SectionHead id="proposal-budget" title="Budget & timeline" />
        {budget_timeline?.trim() ? (
          <p className="max-w-prose whitespace-pre-line break-words text-[15px] leading-relaxed">
            {budget_timeline}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No budget or dates captured.
          </p>
        )}
      </section>
    </div>
  );
}
