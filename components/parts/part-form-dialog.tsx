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
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/types";
import type { Part } from "@/lib/db/schema";

type PartFormDialogProps = {
  part?: Part;
  action: (formData: FormData) => Promise<ActionResult>;
  triggerLabel?: string;
};

export function PartFormDialog({
  part,
  action,
  triggerLabel,
}: PartFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(part);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await action(formData);
      if (result.success) {
        toast.success(isEdit ? "Part updated" : "Part created");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isEdit ? "outline" : "default"}
          size={isEdit ? "sm" : "default"}
        >
          {triggerLabel ?? (isEdit ? "Edit" : "Add part")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit part" : "Add part"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update part name and description."
              : "Create a new part. Inventory starts at zero."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4">
          {part ? <input type="hidden" name="id" value={part.id} /> : null}
          <div className="grid gap-2">
            <Label htmlFor={`part-name-${part?.id ?? "new"}`}>Name</Label>
            <Input
              id={`part-name-${part?.id ?? "new"}`}
              name="name"
              defaultValue={part?.name ?? ""}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`part-description-${part?.id ?? "new"}`}>
              Description
            </Label>
            <Textarea
              id={`part-description-${part?.id ?? "new"}`}
              name="description"
              rows={3}
              defaultValue={part?.description ?? ""}
            />
          </div>
          <DialogFooter className="px-0 pb-0">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create part"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
