import { FileDownIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarkDeliveredButton } from "@/components/vendor-pos/mark-delivered-button";
import { MarkSentButton } from "@/components/vendor-pos/mark-sent-button";
import {
  VendorPoEditor,
  VendorPoVersionHistory,
} from "@/components/vendor-pos/vendor-po-editor";
import { VendorPoStatusBadge } from "@/components/vendor-pos/vendor-po-status-badge";
import { VendorPoWorkflowSteps } from "@/components/vendor-pos/vendor-po-workflow-steps";
import {
  getVendorPoById,
  getVendorPoParts,
  markVendorPoDeliveredAction,
  markVendorPoSentAction,
} from "@/lib/actions/vendor-pos";
import { formatPartSpecs } from "@/lib/services/part-specs";

type VendorPoDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function VendorPoDetailPage({
  params,
}: VendorPoDetailPageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const vendorPo = await getVendorPoById(id);
  if (!vendorPo) notFound();

  const vendorParts = await getVendorPoParts(vendorPo.vendorId);
  const latestVersion = vendorPo.versions[0];
  const totalQuantity =
    latestVersion?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  const canEdit = vendorPo.status !== "delivered";

  const editorLines =
    latestVersion?.lines.map((line) => ({
      partId: line.part.id,
      partName: line.part.name,
      partDescription: formatPartSpecs(line.part),
      quantity: line.quantity,
    })) ?? [];

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/vendor-pos">← Back to vendor POs</Link>
        </Button>
      </div>

      <PageHeader
        title={`Vendor PO #${vendorPo.id}`}
        description={`Created ${formatDate(vendorPo.createdAt)} · ${vendorPo.vendor.name}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {vendorPo.status === "draft" ? (
            <MarkSentButton
              vendorPoId={vendorPo.id}
              action={markVendorPoSentAction}
            />
          ) : null}
          {vendorPo.status === "sent" ? (
            <MarkDeliveredButton
              vendorPoId={vendorPo.id}
              action={markVendorPoDeliveredAction}
            />
          ) : null}
        </div>
      </PageHeader>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <VendorPoStatusBadge status={vendorPo.status} />
        <Badge variant="outline">
          {vendorPo.type === "customer_derived" ? "Customer order" : "Restock"}
        </Badge>
        {vendorPo.customerOrder ? (
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href={`/orders/${vendorPo.customerOrder.id}`}>
              Linked to order #{vendorPo.customerOrder.id}
            </Link>
          </Button>
        ) : null}
        {latestVersion?.pdfUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a
              href={latestVersion.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileDownIcon data-icon="inline-start" />
              Download latest PDF
            </a>
          </Button>
        ) : null}
      </div>

      <section className="mb-8 space-y-3">
        <h2 className="font-heading text-lg font-medium">PO workflow</h2>
        <VendorPoWorkflowSteps status={vendorPo.status} />
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vendor</CardDescription>
            <CardTitle className="text-base font-medium">
              <Link
                href={`/vendors/${vendorPo.vendor.id}`}
                className="hover:underline"
              >
                {vendorPo.vendor.name}
              </Link>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current version</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              v{latestVersion?.versionNumber ?? 1}
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
        <div>
          <h2 className="font-heading text-lg font-medium">
            {canEdit
              ? "Edit lines"
              : `Version ${latestVersion?.versionNumber ?? 1} lines`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {canEdit
              ? "Add, remove, or change quantities. Saving creates a new version and PDF."
              : "This PO has been delivered and can no longer be edited."}
          </p>
        </div>
        <VendorPoEditor
          vendorPoId={vendorPo.id}
          initialLines={editorLines}
          availableParts={vendorParts}
          canEdit={canEdit}
        />
      </section>

      <VendorPoVersionHistory versions={vendorPo.versions} />
    </>
  );
}
