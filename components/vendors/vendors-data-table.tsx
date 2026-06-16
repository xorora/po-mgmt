"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { TruckIcon } from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/data-table/data-table";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import {
  createVendor,
  deleteVendor,
  updateVendor,
} from "@/lib/actions/vendors";
import type { VendorListRow } from "@/lib/data-table/list-queries";
import type { PaginatedResult } from "@/lib/data-table/pagination";

type VendorsDataTableProps = {
  result: PaginatedResult<VendorListRow>;
};

export function VendorsDataTable({ result }: VendorsDataTableProps) {
  const columns: ColumnDef<VendorListRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          href={`/vendors/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "contactName",
      header: "Contact",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.contactName ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.email ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "partCount",
      header: "Parts",
      cell: ({ row }) => (
        <Badge variant={row.original.partCount > 0 ? "default" : "secondary"}>
          {row.original.partCount} parts
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/vendors/${row.original.id}`}>Manage parts</Link>
          </Button>
          <VendorFormDialog vendor={row.original} action={updateVendor} />
          <DeleteConfirmButton
            title="Delete vendor?"
            description={`Remove "${row.original.name}" and all part assignments.`}
            action={deleteVendor}
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
        title: "No vendors yet",
        description:
          "Add suppliers so parts can be routed to the right vendor POs.",
        icon: TruckIcon,
        content: <VendorFormDialog action={createVendor} />,
      }}
    />
  );
}
