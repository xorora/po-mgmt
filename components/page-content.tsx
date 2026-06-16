import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageContentProps = {
  children: ReactNode;
  className?: string;
};

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
