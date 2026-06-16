import type { VendorPoStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const statusLabels: Record<VendorPoStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  delivered: "Delivered",
};

const statusStyles: Record<VendorPoStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  delivered:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
};

type VendorPoStatusBadgeProps = {
  status: VendorPoStatus;
  className?: string;
};

export function VendorPoStatusBadge({
  status,
  className,
}: VendorPoStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        statusStyles[status],
        className,
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
