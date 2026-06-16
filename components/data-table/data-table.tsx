"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Suspense } from "react";

import {
  DataTableEmpty,
  type DataTableEmptyState,
} from "@/components/data-table/data-table-empty";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  emptyState?: DataTableEmptyState;
  /** @deprecated Use emptyState.description instead */
  emptyMessage?: string;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  pageCount?: number;
  showPagination?: boolean;
  layout?: "fill" | "auto";
  className?: string;
};

export function DataTable<TData>({
  columns,
  data,
  emptyState,
  emptyMessage = "No results.",
  page = 1,
  pageSize = data.length,
  totalCount = data.length,
  pageCount = 1,
  showPagination = true,
  layout = "fill",
  className,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    manualPagination: showPagination,
    getCoreRowModel: getCoreRowModel(),
  });

  const shouldShowPagination =
    showPagination && totalCount > 0 && pageCount > 0;

  const resolvedEmptyState: DataTableEmptyState = emptyState ?? {
    description: emptyMessage,
  };

  const isEmpty = table.getRowModel().rows.length === 0;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background",
        layout === "fill" && "min-h-0 flex-1",
        layout === "auto" && "max-h-96",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        {isEmpty ? (
          <DataTableEmpty {...resolvedEmptyState} />
        ) : (
          <Table disableContainer>
            <TableHeader className="sticky top-0 z-10 bg-background [&_th]:border-b [&_th]:border-border">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-0 hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="sticky top-0 bg-background"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {shouldShowPagination ? (
        <Suspense
          fallback={<div className="h-[57px] shrink-0 border-t bg-muted/20" />}
        >
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            pageCount={pageCount}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
