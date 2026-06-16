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

type MarkSentButtonProps = {
  vendorPoId: number;
  action: (formData: FormData) => Promise<ActionResult>;
};

export function MarkSentButton({ vendorPoId, action }: MarkSentButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleMarkSent() {
    const formData = new FormData();
    formData.set("vendorPoId", String(vendorPoId));

    startTransition(async () => {
      const result = await action(formData);

      if (result.success) {
        toast.success("Vendor PO marked as sent");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to mark as sent");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={pending}>
          Mark as sent
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark vendor PO as sent?</AlertDialogTitle>
          <AlertDialogDescription>
            Confirms this PO has been sent to the vendor. You can record
            delivery once parts arrive.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleMarkSent} disabled={pending}>
            {pending ? "Updating…" : "Mark as sent"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
