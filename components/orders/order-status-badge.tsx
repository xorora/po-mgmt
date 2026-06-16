import type { CustomerOrderStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const statusLabels: Record<CustomerOrderStatus, string> = {
  pending: "Pending",
  procuring: "Procuring",
  ready: "Ready",
  fulfilled: "Fulfilled",
};

const statusStyles: Record<CustomerOrderStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  procuring:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ready: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  fulfilled:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
};

type OrderStatusBadgeProps = {
  status: CustomerOrderStatus;
  className?: string;
};

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
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
