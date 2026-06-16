import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { CreateCustomerPoButton } from "@/components/orders/create-customer-po-button";
import { GenerateVendorPosButton } from "@/components/orders/generate-vendor-pos-button";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderWorkflowSteps } from "@/components/orders/order-workflow-steps";
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
import { VendorPoStatusBadge } from "@/components/vendor-pos/vendor-po-status-badge";
import {
  createCustomerPoAction,
  previewCustomerPoCreation,
} from "@/lib/actions/customer-pos";
import {
  deleteCustomerOrder,
  getCustomerOrderById,
  getProductsForOrderForm,
  updateCustomerOrder,
} from "@/lib/actions/orders";
import {
  generateVendorPosForOrder,
  previewVendorPoGeneration,
} from "@/lib/actions/vendor-pos";
import { explodeBomForCustomerOrder } from "@/lib/services/bom-explosion";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const [order, products, explosion, poPreview, customerPoPreview] =
    await Promise.all([
      getCustomerOrderById(id),
      getProductsForOrderForm(),
      explodeBomForCustomerOrder(id),
      previewVendorPoGeneration(id),
      previewCustomerPoCreation(id),
    ]);

  if (!order) notFound();

  const totalNetNeed = explosion.partRequirements.reduce(
    (sum, part) => sum + part.netNeed,
    0,
  );
  const partsFullyStocked = explosion.partRequirements.filter(
    (part) => part.netNeed === 0,
  ).length;

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders">← Back to orders</Link>
        </Button>
      </div>

      <PageHeader
        title={`Order #${order.id}`}
        description={`Created ${formatDate(order.createdAt)}`}
      >
        {order.status === "pending" ? (
          <div className="flex items-center gap-2">
            {order.vendorPos.length === 0 ? (
              <GenerateVendorPosButton
                orderId={order.id}
                preview={poPreview}
                action={generateVendorPosForOrder}
              />
            ) : null}
            <OrderFormDialog
              order={order}
              products={products}
              action={updateCustomerOrder}
              triggerLabel="Edit order"
            />
            <DeleteConfirmButton
              title="Delete order?"
              description={`Remove order #${order.id} and all its lines.`}
              action={deleteCustomerOrder}
              id={order.id}
            />
          </div>
        ) : null}
        {order.status === "ready" && !order.customerPo ? (
          <CreateCustomerPoButton
            orderId={order.id}
            preview={customerPoPreview}
            action={createCustomerPoAction}
          />
        ) : null}
      </PageHeader>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        {order.customerPo ? (
          <Badge variant="secondary" asChild>
            <Link href={`/customer-pos/${order.customerPo.id}`}>
              Customer PO #{order.customerPo.id}
              {order.customerPo.overrideUsed ? " (override)" : ""}
            </Link>
          </Badge>
        ) : null}
      </div>

      <section className="mb-8 space-y-3">
        <h2 className="font-heading text-lg font-medium">Order workflow</h2>
        <OrderWorkflowSteps status={order.status} />
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Product lines</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {order.lines.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Parts required</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {explosion.partRequirements.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net parts to procure</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {totalNetNeed}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="mb-10 space-y-3">
        <h2 className="font-heading text-lg font-medium">Order lines</h2>
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
              {order.lines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No lines on this order.
                  </TableCell>
                </TableRow>
              ) : (
                order.lines.map((line) => (
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

      {explosion.productsWithoutBom.length > 0 ? (
        <section className="mb-10 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Products without BOM</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {explosion.productsWithoutBom.map((product) => (
              <li key={product.productId}>
                <Link
                  href={`/products/${product.productId}`}
                  className="underline"
                >
                  {product.displayName}
                </Link>
                <span className="text-amber-800 dark:text-amber-200">
                  {" "}
                  ({product.modelCode})
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {order.status === "pending" &&
      order.vendorPos.length === 0 &&
      poPreview.unassignedParts.length > 0 ? (
        <section className="mb-10 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">
            Parts need vendors before generating POs
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
            {poPreview.unassignedParts.map((part) => (
              <li key={part.partId}>
                <Link href={`/parts/${part.partId}`} className="underline">
                  {part.partName}
                </Link>
                <span> — net need {part.netNeed}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-medium">
              BOM explosion — part requirements
            </h2>
            <p className="text-sm text-muted-foreground">
              Aggregated parts from all order lines. Net need subtracts current
              inventory on hand.
            </p>
          </div>
          {explosion.partRequirements.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {partsFullyStocked} of {explosion.partRequirements.length} parts
              fully stocked
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Required</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Net need</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {explosion.partRequirements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No part requirements. Add order lines or import product
                    BOMs.
                  </TableCell>
                </TableRow>
              ) : (
                explosion.partRequirements.map((part) => (
                  <TableRow key={part.partId}>
                    <TableCell>
                      <Link
                        href={`/parts/${part.partId}`}
                        className="font-medium hover:underline"
                      >
                        {part.partName}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {part.partDescription ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {part.requiredQuantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {part.quantityOnHand}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {part.netNeed > 0 ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          {part.netNeed}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {order.vendorPos.length > 0 ? (
        <section className="mt-10 space-y-3">
          <h2 className="font-heading text-lg font-medium">
            Linked vendor POs
          </h2>
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
                {order.vendorPos.map((vendorPo) => (
                  <TableRow key={vendorPo.id}>
                    <TableCell>
                      <Link
                        href={`/vendor-pos/${vendorPo.id}`}
                        className="font-medium hover:underline"
                      >
                        PO #{vendorPo.id}
                      </Link>
                    </TableCell>
                    <TableCell>{vendorPo.vendor.name}</TableCell>
                    <TableCell>
                      <VendorPoStatusBadge status={vendorPo.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      {order.status === "fulfilled" && order.customerPo ? (
        <section className="mt-10 space-y-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="font-heading text-lg font-medium">Customer PO</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/customer-pos/${order.customerPo.id}`}>
                View details
              </Link>
            </Button>
          </div>
          <div className="rounded-lg border p-4 text-sm">
            <p>
              Customer PO #{order.customerPo.id} created{" "}
              {formatDate(order.customerPo.createdAt)}.
            </p>
            {order.customerPo.overrideUsed &&
            order.customerPo.overrideReason ? (
              <p className="mt-2 text-muted-foreground">
                Override reason: {order.customerPo.overrideReason}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
