import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export type DataTableEmptyState = {
  title?: string;
  description: string;
  icon?: LucideIcon;
  content?: ReactNode;
};

type DataTableEmptyProps = DataTableEmptyState & {
  className?: string;
};

export function DataTableEmpty({
  title,
  description,
  icon: Icon,
  content,
  className,
}: DataTableEmptyProps) {
  return (
    <Empty className={cn("h-full min-h-48 border-0 bg-muted/20", className)}>
      <EmptyHeader>
        {Icon ? (
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
        ) : null}
        {title ? <EmptyTitle>{title}</EmptyTitle> : null}
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {content ? <EmptyContent>{content}</EmptyContent> : null}
    </Empty>
  );
}
