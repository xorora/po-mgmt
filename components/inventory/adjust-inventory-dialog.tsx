"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adjustInventoryAction,
  setInventoryAction,
} from "@/lib/actions/inventory";

type AdjustInventoryDialogProps = {
  partId: number;
  partName: string;
  currentQuantity: number;
};

export function AdjustInventoryDialog({
  partId,
  partName,
  currentQuantity,
}: AdjustInventoryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"adjust" | "set">("adjust");
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("partId", String(partId));

    startTransition(async () => {
      const action =
        mode === "adjust" ? adjustInventoryAction : setInventoryAction;
      const result = await action(formData);

      if (result.success) {
        toast.success("Inventory updated");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update inventory");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Adjust
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust inventory</DialogTitle>
          <DialogDescription>
            {partName} — currently {currentQuantity} on hand
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "adjust" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("adjust")}
            >
              Add / subtract
            </Button>
            <Button
              type="button"
              variant={mode === "set" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("set")}
            >
              Set quantity
            </Button>
          </div>
          {mode === "adjust" ? (
            <div className="grid gap-2">
              <Label htmlFor={`delta-${partId}`}>Adjustment (+/-)</Label>
              <Input
                id={`delta-${partId}`}
                name="delta"
                type="number"
                placeholder="e.g. 10 or -5"
                required
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor={`quantity-${partId}`}>New quantity</Label>
              <Input
                id={`quantity-${partId}`}
                name="quantity"
                type="number"
                min={0}
                defaultValue={currentQuantity}
                required
              />
            </div>
          )}
          <DialogFooter className="px-0 pb-0">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
