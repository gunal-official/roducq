import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types/invoice";

/**
 * Status badge for invoices (Step 35 redesign). Earlier revisions reused
 * the accent orange for BOTH sent (outline) and paid (solid), which read
 * as the same color family at a glance — not great for a money surface
 * where "has this been paid yet?" is the first thing a member scans for.
 *
 * Each of the 4 statuses now gets its own read:
 *   draft = quiet gray fill — nothing has happened yet.
 *   sent  = blue outline (--info / --info-soft, new tokens) — the one
 *           color no other badge in the app uses, so "awaiting payment"
 *           never gets confused with the accent-orange brand color.
 *   paid  = solid green (--success) — the terminal, good-news state,
 *           matching the "paid" tone used on the dashboard/stat tiles.
 *   void  = quiet red-tinted outline — visibly different from draft, but
 *           an outline (not a solid fill) since void is the audit-safe
 *           cancel, never a delete.
 *
 * Print fix (kept from the public-invoice print pass): browsers strip
 * background colors by default when printing, which would turn "Paid"
 * (white text on a solid success fill) into invisible white-on-white ink.
 * Two layers of defense: the badge carries `print-exact`
 * (print-color-adjust: exact, defined in app/globals.css) so browsers
 * that honor it keep the authored fill; AND every status declares a
 * transparent-background print fallback (plus a printable border/text
 * color for the solid ones) so the label survives even when backgrounds
 * are stripped anyway.
 */
const STATUS_STYLES: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className:
      "border-transparent bg-muted text-muted-foreground print:border-border print:bg-transparent",
  },
  sent: {
    label: "Sent",
    className: "border-info bg-info-soft text-info print:bg-transparent",
  },
  paid: {
    label: "Paid",
    className:
      "border-transparent bg-success text-success-foreground print:border-success print:bg-transparent print:text-success",
  },
  void: {
    label: "Void",
    className: "border-error/30 bg-error/5 text-error print:bg-transparent",
  },
};

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <Badge className={cn("print-exact font-medium", style.className, className)}>
      {style.label}
    </Badge>
  );
}
