import type { VendorPoStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const steps = [
  {
    status: "draft" as const,
    label: "Draft",
    description: "Edit lines, save versions, and download PDF",
  },
  {
    status: "delivered" as const,
    label: "Delivered",
    description: "Parts received into inventory",
  },
];

const statusOrder: VendorPoStatus[] = ["draft", "sent", "delivered"];

type VendorPoWorkflowStepsProps = {
  status: VendorPoStatus;
  className?: string;
};

export function VendorPoWorkflowSteps({
  status,
  className,
}: VendorPoWorkflowStepsProps) {
  const currentIndex = statusOrder.indexOf(status);

  return (
    <ol className={cn("grid gap-4 sm:grid-cols-2", className)}>
      {steps.map((step, index) => {
        const stepIndex =
          step.status === "draft" ? 0 : statusOrder.indexOf("delivered");
        const isComplete = stepIndex < currentIndex;
        const isCurrent =
          (step.status === "draft" &&
            (status === "draft" || status === "sent")) ||
          (step.status === "delivered" && status === "delivered");

        return (
          <li
            key={step.status}
            className={cn(
              "rounded-lg border p-4",
              isCurrent && "border-primary bg-primary/5 ring-1 ring-primary/20",
              isComplete &&
                "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
              !isComplete && !isCurrent && "border-border bg-muted/20",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isComplete && "bg-emerald-600 text-white dark:bg-emerald-500",
                  isCurrent && "bg-primary text-primary-foreground",
                  !isComplete && !isCurrent && "bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <p
                className={cn(
                  "text-sm font-medium",
                  isCurrent && "text-foreground",
                  !isCurrent && !isComplete && "text-muted-foreground",
                )}
              >
                {step.label}
                {step.status === "draft" && status === "sent" ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (sent)
                  </span>
                ) : null}
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
