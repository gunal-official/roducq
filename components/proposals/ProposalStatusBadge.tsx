import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProposalStatus } from "@/lib/types/proposal";

/**
 * Status badge for proposals. Phase 4A aligns it with the invoice badges so
 * "where is this in the money/sales cycle" reads the same across the app:
 *   draft    = quiet muted fill (not sent yet)
 *   sent     = info blue outline (awaiting the client — the same "awaiting"
 *              read as an invoice that has been sent)
 *   accepted = solid success green (won)
 *   declined = error tint (lost)
 */
const STATUS_STYLES: Record<
  ProposalStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "border-transparent bg-muted text-text",
  },
  sent: {
    label: "Sent",
    className: "border-info bg-info-soft text-info",
  },
  accepted: {
    label: "Accepted",
    className: "border-transparent bg-success text-success-foreground",
  },
  declined: {
    label: "Declined",
    className: "border-transparent bg-error/10 text-error",
  },
};

export function ProposalStatusBadge({
  status,
  className,
}: {
  status: ProposalStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <Badge className={cn("font-medium", style.className, className)}>
      {style.label}
    </Badge>
  );
}
