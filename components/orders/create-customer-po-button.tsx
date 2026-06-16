"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/types";
import type { CustomerPoCreationPreview } from "@/lib/services/customer-po";

type CreateCustomerPoButtonProps = {
  orderId: number;
  preview: CustomerPoCreationPreview;
  action: (
    formData: FormData,
  ) => Promise<
    ActionResult & { customerPoId?: number; overrideUsed?: boolean }
  >;
};

export function CreateCustomerPoButton({
  orderId,
  preview,
  action,
}: CreateCustomerPoButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [overrideReason, setOverrideReason] = useState("");
  const [open, setOpen] = useState(false);

  const showOverride = preview.canCreateWithOverride && !preview.canCreate;
  const canSubmit =
    preview.canCreate ||
    (preview.canCreateWithOverride && overrideReason.trim().length > 0);

  function handleCreate() {
    const formData = new FormData();
    formData.set("orderId", String(orderId));
    if (showOverride) {
      formData.set("override", "true");
      formData.set("overrideReason", overrideReason.trim());
    }

    startTransition(async () => {
      const result = await action(formData);

      if (result.success) {
        if (result.overrideUsed) {
          toast.success("Customer PO created with stock override");
        } else {
          toast.success("Customer PO created — order fulfilled");
        }
        setOpen(false);
        setOverrideReason("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to create customer PO");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={pending}>
          Create customer PO
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Create customer PO</AlertDialogTitle>
          <AlertDialogDescription>
            Validates part stock against the order BOM, creates the customer PO,
            deducts inventory, and marks the order fulfilled.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {preview.canCreate ? (
          <p className="text-sm text-muted-foreground">
            All {preview.partRequirements.length} required parts are in stock.
            Creating the PO will deduct parts from inventory.
          </p>
        ) : showOverride ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">Insufficient stock</p>
              <p className="mt-1 text-amber-800 dark:text-amber-200">
                {preview.insufficientParts.length} part(s) are short. Provide a
                reason to override and proceed anyway.
              </p>
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Short</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.insufficientParts.map((part) => (
                    <TableRow key={part.partId}>
                      <TableCell>
                        <Link
                          href={`/parts/${part.partId}`}
                          className="underline"
                        >
                          {part.partName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {part.requiredQuantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {part.quantityOnHand}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-destructive">
                        {part.shortfall}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-reason">Override reason</Label>
              <Textarea
                id="override-reason"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                placeholder="Why is it acceptable to proceed without sufficient stock?"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="font-medium text-destructive">Cannot create yet</p>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {preview.blockingErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCreate}
            disabled={pending || !canSubmit}
          >
            {pending
              ? "Creating…"
              : showOverride
                ? "Create with override"
                : "Create customer PO"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
