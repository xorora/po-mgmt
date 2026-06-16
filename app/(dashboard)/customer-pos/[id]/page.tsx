import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCustomerPoById } from "@/lib/actions/customer-pos";

type CustomerPoDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function CustomerPoDetailPage({
  params,
}: CustomerPoDetailPageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const customerPo = await getCustomerPoById(id);
  if (!customerPo) notFound();

  const totalQuantity = customerPo.lines.reduce(
    (sum, line) => sum + line.quantity,
    0,
  );

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orders/${customerPo.customerOrderId}`}>
            ← Back to order #{customerPo.customerOrderId}
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Customer PO #${customerPo.id}`}
        description={`Created ${formatDate(customerPo.createdAt)}`}
      />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Badge variant="secondary">Fulfilled</Badge>
        {customerPo.overrideUsed ? (
          <Badge variant="outline">Stock override used</Badge>
        ) : null}
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/orders/${customerPo.customerOrderId}`}>
            Order #{customerPo.customerOrderId}
          </Link>
        </Button>
        <OrderStatusBadge status={customerPo.customerOrder.status} />
      </div>

      {customerPo.overrideUsed && customerPo.overrideReason ? (
        <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Override reason</p>
          <p className="mt-1">{customerPo.overrideReason}</p>
        </section>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Product lines</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {customerPo.lines.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total quantity</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {totalQuantity}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Order lines</h2>
        <p className="text-sm text-muted-foreground">
          Products fulfilled on this customer purchase order.
        </p>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Model code</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerPo.lines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No lines on this customer PO.
                  </TableCell>
                </TableRow>
              ) : (
                customerPo.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Link
                        href={`/products/${line.product.id}`}
                        className="font-medium hover:underline"
                      >
                        {line.product.displayName}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {line.product.modelCode}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.quantity}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}
