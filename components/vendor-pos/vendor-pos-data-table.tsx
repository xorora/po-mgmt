"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FileTextIcon } from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VendorPoStatusBadge } from "@/components/vendor-pos/vendor-po-status-badge";
import type { VendorPoListRow } from "@/lib/data-table/list-queries";
import type { PaginatedResult } from "@/lib/data-table/pagination";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type VendorPosDataTableProps = {
  result: PaginatedResult<VendorPoListRow>;
};

export function VendorPosDataTable({ result }: VendorPosDataTableProps) {
  const columns: ColumnDef<VendorPoListRow>[] = [
    {
      accessorKey: "id",
      header: "PO",
      cell: ({ row }) => (
        <Link
          href={`/vendor-pos/${row.original.id}`}
          className="font-medium hover:underline"
        >
          PO #{row.original.id}
        </Link>
      ),
    },
    {
      id: "vendor",
      header: "Vendor",
      cell: ({ row }) => row.original.vendor.name,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.type === "customer_derived" ? "Order" : "Restock"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <VendorPoStatusBadge status={row.original.status} />,
    },
    {
      id: "customerOrder",
      header: "Customer order",
      cell: ({ row }) =>
        row.original.customerOrder ? (
          <Link
            href={`/orders/${row.original.customerOrder.id}`}
            className="hover:underline"
          >
            Order #{row.original.customerOrder.id}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "version",
      header: "Version",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          v{row.original.versions[0]?.versionNumber ?? 1}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/vendor-pos/${row.original.id}`}>View</Link>
        </Button>
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
        title: "No vendor POs",
        description:
          "Generate POs from a customer order or create a restock PO to replenish inventory.",
        icon: FileTextIcon,
      }}
    />
  );
}
