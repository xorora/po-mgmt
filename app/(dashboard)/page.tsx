import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderWorkflowSteps } from "@/components/orders/order-workflow-steps";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { VendorPoStatusBadge } from "@/components/vendor-pos/vendor-po-status-badge";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants/inventory";
import { getDashboardData } from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MetricCard({
  title,
  value,
  description,
  href,
  variant = "default",
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  variant?: "default" | "alert";
}) {
  return (
    <Link href={href} className="group block h-full">
      <Card
        className={cn(
          "h-full",
          variant === "alert" && value > 0
            ? "ring-1 ring-destructive/30 transition-colors hover:bg-destructive/5"
            : "transition-colors hover:bg-muted/30",
        )}
      >
        <CardHeader className="pb-2">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground group-hover:text-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const hasAlerts =
    data.lowStockCount > 0 ||
    data.pendingVendorPosCount > 0 ||
    data.readyForFulfillmentCount > 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of open orders, inventory alerts, and vendor PO activity."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/orders">View orders</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/vendor-pos">View vendor POs</Link>
          </Button>
        </div>
      </PageHeader>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Open orders"
          value={data.openOrdersCount}
          description="Pending, procuring, or ready for fulfillment"
          href="/orders"
        />
        <MetricCard
          title="Low stock parts"
          value={data.lowStockCount}
          description={`Below ${LOW_STOCK_THRESHOLD} units on hand`}
          href="/inventory"
          variant="alert"
        />
        <MetricCard
          title="Pending vendor POs"
          value={data.pendingVendorPosCount}
          description="Draft or sent, awaiting delivery"
          href="/vendor-pos"
        />
        <MetricCard
          title="Ready to fulfill"
          value={data.readyForFulfillmentCount}
          description="Orders waiting for customer PO creation"
          href="/orders"
        />
      </section>

      <section className="mb-10 space-y-3">
        <div>
          <h2 className="font-heading text-lg font-medium">Order workflow</h2>
          <p className="text-sm text-muted-foreground">
            Each customer order moves through these stages from creation to
            fulfillment.
          </p>
        </div>
        <OrderWorkflowSteps variant="reference" />
        <div className="flex flex-wrap gap-3 pt-1">
          {(
            [
              ["pending", data.orderCounts.pending],
              ["procuring", data.orderCounts.procuring],
              ["ready", data.orderCounts.ready],
              ["fulfilled", data.orderCounts.fulfilled],
            ] as const
          ).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5"
            >
              <OrderStatusBadge status={status} />
              <span className="text-sm tabular-nums text-muted-foreground">
                {count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {!hasAlerts ? (
        <section className="mb-10 rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No low-stock alerts, pending vendor POs, or orders waiting for
            customer PO creation.
          </p>
        </section>
      ) : (
        <div className="mb-10 grid gap-6 lg:grid-cols-2">
          {data.readyOrders.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h2 className="font-heading text-lg font-medium">
                    Ready for customer PO
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Stock received — create customer PO to fulfill.
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/orders">View all</Link>
                </Button>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.readyOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium hover:underline"
                          >
                            Order #{order.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ) : null}

          {data.pendingVendorPos.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h2 className="font-heading text-lg font-medium">
                    Pending vendor POs
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Mark delivered when parts arrive to update inventory.
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/vendor-pos">View all</Link>
                </Button>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.pendingVendorPos.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell>
                          <Link
                            href={`/vendor-pos/${po.id}`}
                            className="font-medium hover:underline"
                          >
                            PO #{po.id}
                          </Link>
                          {po.customerOrderId ? (
                            <p className="text-xs text-muted-foreground">
                              Order #{po.customerOrderId}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>{po.vendorName}</TableCell>
                        <TableCell>
                          <VendorPoStatusBadge status={po.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ) : null}

          {data.lowStockParts.length > 0 ? (
            <section
              className={cn(
                "space-y-3",
                data.readyOrders.length > 0 &&
                  data.pendingVendorPos.length > 0 &&
                  "lg:col-span-2",
              )}
            >
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h2 className="font-heading text-lg font-medium">
                    Low stock
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Parts below {LOW_STOCK_THRESHOLD} units — consider restock
                    POs.
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/inventory">View inventory</Link>
                </Button>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead className="text-right">On hand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lowStockParts.map((part) => (
                      <TableRow key={part.partId}>
                        <TableCell>
                          <Link
                            href={`/parts/${part.partId}`}
                            className="font-medium hover:underline"
                          >
                            {part.partName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Badge variant="destructive">
                            {part.quantityOnHand}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ) : null}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-medium">
              Recent open orders
            </h2>
            <p className="text-sm text-muted-foreground">
              Latest orders that still need action.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/orders">View all</Link>
          </Button>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentOpenOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No open orders. Create a customer order to start
                    procurement.
                  </TableCell>
                </TableRow>
              ) : (
                data.recentOpenOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        Order #{order.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.lineCount} product
                      {order.lineCount === 1 ? "" : "s"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(order.createdAt)}
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
