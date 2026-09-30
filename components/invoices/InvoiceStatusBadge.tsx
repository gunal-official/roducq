import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/types/invoice";

/**
 * Status badge for invoices — fifth member of the badge family, with
 * invoices' 4-status vocabulary. The token palette is limited
 * (muted / accent / error), so each status reuses house conventions:
 * draft = solid muted (same as brief/proposal/update drafts), sent =
 * accent outline (same look as every other "sent"), paid = solid
 * accent (the terminal-success look of plan done / proposal
 * accepted), void = quiet outline (the "dead" look of plan
 * not_started — void is the audit-safe cancel, never a delete).
 *
 * Print fix: browsers strip background colors by default when printing,
 * which turned "Paid" (white text on a solid accent fill) into invisible
 * white-on-white ink and left "Draft" as a bare unlabeled pill. Two
 * layers of defense: the badge carries `print-exact`
 * (print-color-adjust: exact, defined in app/globals.css) so browsers
 * that honor it keep the authored fill; AND every status declares a
 * print: outline fallback (transparent fill, visible border, printable
 * text color) so the label survives even when backgrounds are stripped.
 */
const STATUS_STYLES: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className:
      "border-transparent bg-muted text-text print:border-border print:bg-transparent",
  },
  sent: {
    label: "Sent",
    className:
      "border-accent bg-accent-soft text-accent print:bg-transparent",
  },
  paid: {
    label: "Paid",
    className:
      "border-transparent bg-accent text-white print:border-accent print:bg-transparent print:text-accent",
  },
  void: {
    label: "Void",
    className:
      "border-border bg-card text-muted-foreground print:bg-transparent",
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
