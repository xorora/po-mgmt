"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { PuzzleIcon } from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/data-table/data-table";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { PartFormDialog } from "@/components/parts/part-form-dialog";
import { Badge } from "@/components/ui/badge";
import { createPart, deletePart, updatePart } from "@/lib/actions/parts";
import type { PartListRow } from "@/lib/data-table/list-queries";
import type { PaginatedResult } from "@/lib/data-table/pagination";

type PartsDataTableProps = {
  result: PaginatedResult<PartListRow>;
};

export function PartsDataTable({ result }: PartsDataTableProps) {
  const columns: ColumnDef<PartListRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          href={`/parts/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="block max-w-xs truncate text-muted-foreground">
          {row.original.description ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "quantityOnHand",
      header: () => <span className="block text-right">On hand</span>,
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {row.original.quantityOnHand ?? 0}
        </span>
      ),
    },
    {
      accessorKey: "vendorCount",
      header: "Vendors",
      cell: ({ row }) => (
        <Badge variant={row.original.vendorCount > 0 ? "default" : "secondary"}>
          {row.original.vendorCount}
        </Badge>
      ),
    },
    {
      accessorKey: "productCount",
      header: "Products",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.productCount}</Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <PartFormDialog part={row.original} action={updatePart} />
          <DeleteConfirmButton
            title="Delete part?"
            description={`Remove "${row.original.name}" from the catalog.`}
            action={deletePart}
            id={row.original.id}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={result.rows}
      page={result.page}
      pageSize={result.pageSize}
      totalCount={result.totalCount}
      pageCount={result.pageCount}
      emptyState={{
        title: "No parts yet",
        description:
          "Import SKUs from Excel or add parts manually to build your catalog.",
        icon: PuzzleIcon,
        content: <PartFormDialog action={createPart} />,
      }}
    />
  );
}
