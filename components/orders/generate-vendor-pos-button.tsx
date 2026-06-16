"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionResult } from "@/lib/actions/types";
import type { VendorPoGenerationPreview } from "@/lib/services/vendor-po";

type GenerateVendorPosButtonProps = {
  orderId: number;
  preview: VendorPoGenerationPreview;
  action: (formData: FormData) => Promise<
    ActionResult & {
      vendorPoCount?: number;
      orderStatus?: "procuring" | "ready";
    }
  >;
};

export function GenerateVendorPosButton({
  orderId,
  preview,
  action,
}: GenerateVendorPosButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    const formData = new FormData();
    formData.set("orderId", String(orderId));

    startTransition(async () => {
      const result = await action(formData);

      if (result.success) {
        if (result.vendorPoCount === 0) {
          toast.success("All parts in stock — order marked ready");
        } else {
          toast.success(
            `Created ${result.vendorPoCount} vendor PO${result.vendorPoCount === 1 ? "" : "s"}`,
          );
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to generate vendor POs");
      }
    });
  }

  const totalLines = preview.vendorDrafts.reduce(
    (sum, draft) => sum + draft.lines.length,
    0,
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={pending}>
          Generate vendor POs
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Generate vendor POs</AlertDialogTitle>
          <AlertDialogDescription>
            Inventory-aware procurement grouped by vendor. Each vendor receives
            a draft PO with version 1 snapshot lines for net part need only.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!preview.canGenerate ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium text-destructive">Cannot generate yet</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {preview.blockingErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
            {preview.unassignedParts.length > 0 ? (
              <div className="rounded-lg border p-3">
                <p className="mb-2 font-medium">Unassigned parts</p>
                <ul className="space-y-1">
                  {preview.unassignedParts.map((part) => (
                    <li key={part.partId}>
                      <Link
                        href={`/parts/${part.partId}`}
                        className="underline"
                      >
                        {part.partName}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        — net need {part.netNeed}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {preview.multiVendorParts.length > 0 ? (
              <div className="rounded-lg border p-3">
                <p className="mb-2 font-medium">Parts with multiple vendors</p>
                <ul className="space-y-1">
                  {preview.multiVendorParts.map((part) => (
                    <li key={part.partId}>
                      <Link
                        href={`/parts/${part.partId}`}
                        className="underline"
                      >
                        {part.partName}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        —{" "}
                        {part.vendors
                          .map((vendor) => vendor.vendorName)
                          .join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : preview.vendorDrafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All required parts are fully covered by inventory (
            {preview.totalNetNeed} net need). No vendor POs will be created and
            the order will move to ready.
          </p>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              {preview.vendorDrafts.length} vendor PO
              {preview.vendorDrafts.length === 1 ? "" : "s"} with {totalLines}{" "}
              line
              {totalLines === 1 ? "" : "s"} ({preview.totalNetNeed} total
              units).
            </p>
            {preview.vendorDrafts.map((draft) => (
              <div key={draft.vendorId} className="rounded-lg border">
                <div className="border-b px-3 py-2 font-medium">
                  {draft.vendorName}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draft.lines.map((line) => (
                      <TableRow key={line.partId}>
                        <TableCell>{line.partName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {line.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleGenerate}
            disabled={pending || !preview.canGenerate}
          >
            {pending
              ? "Generating…"
              : preview.vendorDrafts.length === 0
                ? "Mark ready"
                : "Generate POs"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
