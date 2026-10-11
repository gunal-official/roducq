/**
 * The budget + deliverables BODY of a proposal document (Queue #7
 * extraction): used by the live detail page (current content) AND the
 * read-only version snapshot view, so a historical version renders
 * exactly the way the proposal looked at capture time. Presentational —
 * no data access, safe to render from any server component.
 */

import { Check } from "lucide-react";

import type { BriefDeliverable } from "@/lib/types/brief";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
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
    <div className="space-y-6">
      <div className="space-y-1.5">
        <FieldLabel>Budget & timeline</FieldLabel>
        {budget_timeline?.trim() ? (
          <p className="text-[15px] leading-relaxed">{budget_timeline}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No budget or dates captured.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FieldLabel>Deliverables</FieldLabel>
          <span className="text-xs text-muted-foreground">
            {doneCount} of {deliverables.length} done
          </span>
        </div>
        <ul className="space-y-1 rounded-md border border-border bg-muted/40 p-2">
          {deliverables.length === 0 ? (
            <li className="px-1.5 py-1 text-sm text-muted-foreground">
              No deliverables captured.
            </li>
          ) : (
            deliverables.map((d) => (
              <li
                key={d.id}
                className="flex items-start gap-2.5 rounded-md px-1.5 py-1.5"
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                    d.checked
                      ? "border-accent bg-accent text-accent-foreground"
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
                      ? "text-sm text-muted-foreground line-through"
                      : "text-sm"
                  }
                >
                  {d.text}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
