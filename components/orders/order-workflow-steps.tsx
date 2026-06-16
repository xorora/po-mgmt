import type { CustomerOrderStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const steps = [
  {
    status: "pending" as const,
    label: "Pending",
    description: "Create order and generate vendor POs",
  },
  {
    status: "procuring" as const,
    label: "Procuring",
    description: "Receive vendor PO deliveries into inventory",
  },
  {
    status: "ready" as const,
    label: "Ready",
    description: "Create customer PO and deduct stock",
  },
  {
    status: "fulfilled" as const,
    label: "Fulfilled",
    description: "Order complete",
  },
];

const statusOrder: CustomerOrderStatus[] = [
  "pending",
  "procuring",
  "ready",
  "fulfilled",
];

type OrderWorkflowStepsProps = {
  status?: CustomerOrderStatus;
  variant?: "progress" | "reference";
  className?: string;
};

export function OrderWorkflowSteps({
  status = "pending",
  variant = "progress",
  className,
}: OrderWorkflowStepsProps) {
  const currentIndex = statusOrder.indexOf(status);
  const isReference = variant === "reference";

  return (
    <ol className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {steps.map((step, index) => {
        const isComplete = !isReference && index < currentIndex;
        const isCurrent = !isReference && index === currentIndex;

        return (
          <li
            key={step.status}
            className={cn(
              "rounded-lg border p-4",
              isReference && "border-border bg-muted/20",
              isCurrent && "border-primary bg-primary/5 ring-1 ring-primary/20",
              isComplete &&
                "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
              !isComplete &&
                !isCurrent &&
                !isReference &&
                "border-border bg-muted/20",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isReference && "bg-muted text-muted-foreground",
                  isComplete && "bg-emerald-600 text-white dark:bg-emerald-500",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isComplete &&
                    !isCurrent &&
                    !isReference &&
                    "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <p
                className={cn(
                  "text-sm font-medium",
                  (isCurrent || isReference) && "text-foreground",
                  !isCurrent &&
                    !isComplete &&
                    !isReference &&
                    "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {step.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
