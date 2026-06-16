"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardListIcon } from "lucide-react";
import Link from "next/link";

import { DataTable } from "@/components/data-table/data-table";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  createCustomerOrder,
  deleteCustomerOrder,
  type getProductsForOrderForm,
  updateCustomerOrder,
} from "@/lib/actions/orders";
import type { CustomerOrderListRow } from "@/lib/data-table/list-queries";
import type { PaginatedResult } from "@/lib/data-table/pagination";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type OrdersDataTableProps = {
  result: PaginatedResult<CustomerOrderListRow>;
  products: Awaited<ReturnType<typeof getProductsForOrderForm>>;
};

export function OrdersDataTable({ result, products }: OrdersDataTableProps) {
  const columns: ColumnDef<CustomerOrderListRow>[] = [
    {
      accessorKey: "id",
      header: "Order",
      cell: ({ row }) => (
        <Link
          href={`/orders/${row.original.id}`}
          className="font-medium hover:underline"
        >
          Order #{row.original.id}
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      id: "lines",
      header: "Lines",
      cell: ({ row }) => {
        const count = row.original.lines.length;
        return (
          <span className="text-muted-foreground">
            {count} product{count === 1 ? "" : "s"}
          </span>
        );
      },
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
      cell: ({ row }) => {
        const order = row.original;

        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/orders/${order.id}`}>View</Link>
            </Button>
            {order.status === "pending" ? (
              <>
                <OrderFormDialog
                  order={order}
                  products={products}
                  action={updateCustomerOrder}
                />
                <DeleteConfirmButton
                  title="Delete order?"
                  description={`Remove order #${order.id} and all its lines.`}
                  action={deleteCustomerOrder}
                  id={order.id}
                />
              </>
            ) : null}
          </div>
        );
      },
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
        title: "No customer orders",
        description: "Create an order to start procurement from product BOMs.",
        icon: ClipboardListIcon,
        content: (
          <OrderFormDialog products={products} action={createCustomerOrder} />
        ),
      }}
    />
  );
}
