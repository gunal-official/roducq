import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UpdateStatus } from "@/lib/types/update";

/**
 * Status badge for updates — fourth member of the badge family, with
 * updates' 2-status vocabulary. Draft is muted; the stored "sent" value is
 * presented as "Marked sent" because changing status does not deliver it.
 */
const STATUS_STYLES: Record<
  UpdateStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "border-transparent bg-muted text-text",
  },
  sent: {
    label: "Marked sent",
    className: "border-accent bg-accent-soft text-accent",
  },
};

export function UpdateStatusBadge({
  status,
  className,
}: {
  status: UpdateStatus;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <Badge className={cn("font-medium", style.className, className)}>
      {style.label}
    </Badge>
  );
}
