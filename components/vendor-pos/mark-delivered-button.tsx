"use client";

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
import type { ActionResult } from "@/lib/actions/types";

type MarkDeliveredButtonProps = {
  vendorPoId: number;
  action: (formData: FormData) => Promise<
    ActionResult & {
      orderId?: number | null;
      orderStatus?: "procuring" | "ready";
      partsReceived?: number;
    }
  >;
};

export function MarkDeliveredButton({
  vendorPoId,
  action,
}: MarkDeliveredButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleMarkDelivered() {
    const formData = new FormData();
    formData.set("vendorPoId", String(vendorPoId));

    startTransition(async () => {
      const result = await action(formData);

      if (result.success) {
        if (result.orderStatus === "ready") {
          toast.success(
            "Delivered — inventory updated and linked order is now ready",
          );
        } else {
          toast.success("Delivered — parts received into inventory");
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to mark as delivered");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={pending}>
          Mark delivered
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark vendor PO as delivered?</AlertDialogTitle>
          <AlertDialogDescription>
            The latest version lines will be received into inventory. If this is
            the last undelivered PO for a customer order, that order will move
            to ready.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleMarkDelivered} disabled={pending}>
            {pending ? "Receiving…" : "Mark delivered"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
