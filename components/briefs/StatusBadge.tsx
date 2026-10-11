import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BriefStatus } from "@/lib/types/brief";

/**
 * Shared status badge for briefs — used on /briefs/:id and the /briefs list.
 *
 * Phase 4A semantics (matches the invoice/contract badges):
 *   draft     = quiet muted fill — nothing has happened yet.
 *   in_review = soft terracotta outline — waiting on someone (the existing
 *               "in progress" tint; amber stays on its allowlisted surfaces).
 *   approved  = solid success green — the terminal, good-news state.
 */
const STATUS_STYLES: Record<
  BriefStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "border-transparent bg-muted text-text",
  },
  in_review: {
    label: "In review",
    className: "border-accent bg-accent-soft text-accent",
  },
  approved: {
    label: "Approved",
    className: "border-transparent bg-success text-success-foreground",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: BriefStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <Badge className={cn("font-medium", style.className, className)}>
      {style.label}
    </Badge>
  );
}
