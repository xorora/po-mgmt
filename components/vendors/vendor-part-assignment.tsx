"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Link2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignPartToVendor,
  removePartFromVendor,
} from "@/lib/actions/vendors";
import type { Part } from "@/lib/db/schema";

type AssignedPart = {
  partId: number;
  part: {
    id: number;
    name: string;
    description: string | null;
    inventory: { quantityOnHand: number } | null;
  };
};

type VendorPartAssignmentProps = {
  vendorId: number;
  assignedParts: AssignedPart[];
  availableParts: Part[];
};

function RemoveVendorPartButton({
  vendorId,
  partId,
  partName,
}: {
  vendorId: number;
  partId: number;
  partName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    const formData = new FormData();
    formData.set("vendorId", String(vendorId));
    formData.set("partId", String(partId));

    startTransition(async () => {
      const result = await removePartFromVendor(formData);
      if (result.success) {
        toast.success("Part removed");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to remove part");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={pending}>
          Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove part from vendor?</AlertDialogTitle>
          <AlertDialogDescription>
            Stop sourcing &ldquo;{partName}&rdquo; from this vendor.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleRemove}>
            {pending ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function VendorPartAssignment({
  vendorId,
  assignedParts,
  availableParts,
}: VendorPartAssignmentProps) {
  const router = useRouter();
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const assignedIds = new Set(assignedParts.map((item) => item.partId));
  const unassignedParts = availableParts.filter(
    (part) => !assignedIds.has(part.id),
  );

  function handleAssign() {
    if (!selectedPartId) return;

    const formData = new FormData();
    formData.set("vendorId", String(vendorId));
    formData.set("partId", selectedPartId);

    startTransition(async () => {
      const result = await assignPartToVendor(formData);
      if (result.success) {
        toast.success("Part assigned");
        setSelectedPartId("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to assign part");
      }
    });
  }

  const columns: ColumnDef<AssignedPart>[] = [
    {
      id: "part",
      header: "Part",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.part.name}</span>
      ),
    },
    {
      id: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="block max-w-xs truncate text-muted-foreground">
          {row.original.part.description ?? "—"}
        </span>
      ),
    },
    {
      id: "onHand",
      header: () => <span className="block text-right">On hand</span>,
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {row.original.part.inventory?.quantityOnHand ?? 0}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <RemoveVendorPartButton
          vendorId={vendorId}
          partId={row.original.part.id}
          partName={row.original.part.name}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="assign-part">Assign part</Label>
          <Select
            value={selectedPartId}
            onValueChange={setSelectedPartId}
            disabled={pending || unassignedParts.length === 0}
          >
            <SelectTrigger id="assign-part" className="w-full sm:max-w-md">
              <SelectValue
                placeholder={
                  unassignedParts.length === 0
                    ? "All parts assigned"
                    : "Select a part"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {unassignedParts.map((part) => (
                <SelectItem key={part.id} value={String(part.id)}>
                  {part.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          onClick={handleAssign}
          disabled={pending || !selectedPartId}
        >
          {pending ? "Assigning…" : "Assign part"}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={assignedParts}
        showPagination={false}
        layout="auto"
        className="max-h-[24rem]"
        emptyState={{
          title: "No parts assigned",
          description:
            "Assign parts to this vendor before generating purchase orders.",
          icon: Link2Icon,
        }}
      />
    </div>
  );
}
