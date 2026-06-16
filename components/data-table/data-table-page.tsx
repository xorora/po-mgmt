import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTablePageProps = {
  header: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DataTablePage({
  header,
  children,
  className,
}: DataTablePageProps) {
  return (
    <div
      className={cn(
        "flex h-[calc(100svh-3.5rem-4rem)] flex-col overflow-hidden",
        className,
      )}
    >
      <div className="mb-4 shrink-0">{header}</div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
