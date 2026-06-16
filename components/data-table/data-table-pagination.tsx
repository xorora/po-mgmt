"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildPaginationHref,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from "@/lib/data-table/pagination";

type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  pageCount: number;
};

export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  pageCount,
}: DataTablePaginationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  const canPrevious = page > 1;
  const canNext = page < pageCount;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {totalCount === 0
          ? "No results"
          : `Showing ${start}–${end} of ${totalCount}`}
      </p>

      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              router.push(
                buildPaginationHref(pathname, searchParams, {
                  pageSize: Number(value),
                  page: 1,
                }),
              );
            }}
          >
            <SelectTrigger size="sm" className="w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="min-w-[5.5rem] text-center text-sm tabular-nums text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!canPrevious}
            asChild={canPrevious}
          >
            {canPrevious ? (
              <Link
                href={buildPaginationHref(pathname, searchParams, { page: 1 })}
                aria-label="First page"
              >
                <ChevronsLeftIcon />
              </Link>
            ) : (
              <span aria-hidden>
                <ChevronsLeftIcon />
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!canPrevious}
            asChild={canPrevious}
          >
            {canPrevious ? (
              <Link
                href={buildPaginationHref(pathname, searchParams, {
                  page: page - 1,
                })}
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </Link>
            ) : (
              <span aria-hidden>
                <ChevronLeftIcon />
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!canNext}
            asChild={canNext}
          >
            {canNext ? (
              <Link
                href={buildPaginationHref(pathname, searchParams, {
                  page: page + 1,
                })}
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </Link>
            ) : (
              <span aria-hidden>
                <ChevronRightIcon />
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!canNext}
            asChild={canNext}
          >
            {canNext ? (
              <Link
                href={buildPaginationHref(pathname, searchParams, {
                  page: pageCount,
                })}
                aria-label="Last page"
              >
                <ChevronsRightIcon />
              </Link>
            ) : (
              <span aria-hidden>
                <ChevronsRightIcon />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_PAGE_SIZE };
