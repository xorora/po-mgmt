"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ListTreeIcon } from "lucide-react";
import Link from "next/link";
import { BomImages } from "@/components/bom/bom-images";
import { DataTable } from "@/components/data-table/data-table";
import { PartSpecsDisplay } from "@/components/parts/part-specs-display";

export type ProductBomLine = {
  id: number;
  itemNo: string | null;
  quantity: number;
  remarks: string | null;
  imageSideUrl: string | null;
  imageFrontUrl: string | null;
  imageBottomUrl: string | null;
  part: {
    id: number;
    name: string;
    specs: Record<string, string>;
    description: string | null;
  };
};

type ProductBomDataTableProps = {
  lines: ProductBomLine[];
  vendorNamesByPartId?: Map<number, string[]>;
  extraColumns?: ColumnDef<ProductBomLine>[];
};

export function ProductBomDataTable({
  lines,
  vendorNamesByPartId,
  extraColumns = [],
}: ProductBomDataTableProps) {
  const columns: ColumnDef<ProductBomLine>[] = [
    {
      accessorKey: "itemNo",
      header: "Item",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.itemNo ?? "—"}
        </span>
      ),
    },
    {
      id: "part",
      header: "Part",
      cell: ({ row }) => (
        <Link
          href={`/parts/${row.original.part.id}`}
          className="font-medium hover:underline"
        >
          {row.original.part.name}
        </Link>
      ),
    },
    ...(vendorNamesByPartId
      ? [
          {
            id: "vendors",
            header: "Vendor(s)",
            cell: ({ row }: { row: { original: ProductBomLine } }) => {
              const vendorNames =
                vendorNamesByPartId.get(row.original.part.id) ?? [];
              return (
                <span className="block max-w-xs text-muted-foreground">
                  {vendorNames.length > 0
                    ? vendorNames.join(", ")
                    : "No vendor assigned"}
                </span>
              );
            },
          } satisfies ColumnDef<ProductBomLine>,
        ]
      : []),
    {
      id: "specs",
      header: "Specifications",
      cell: ({ row }) => (
        <span className="block max-w-md truncate">
          <PartSpecsDisplay
            specs={row.original.part.specs}
            description={row.original.part.description}
            maxLength={120}
          />
        </span>
      ),
    },
    {
      id: "images",
      header: "Images",
      cell: ({ row }) => (
        <BomImages
          images={{
            imageSideUrl: row.original.imageSideUrl,
            imageFrontUrl: row.original.imageFrontUrl,
            imageBottomUrl: row.original.imageBottomUrl,
          }}
          partName={row.original.part.name}
        />
      ),
    },
    {
      accessorKey: "quantity",
      header: () => <span className="block text-right">Qty</span>,
      cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {row.original.quantity}
        </span>
      ),
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => (
        <span className="block max-w-xs truncate text-muted-foreground">
          {row.original.remarks ?? "—"}
        </span>
      ),
    },
    ...extraColumns,
  ];

  return (
    <DataTable
      columns={columns}
      data={lines}
      showPagination={false}
      layout="auto"
      className="max-h-[28rem]"
      emptyState={{
        title: "No BOM lines",
        description:
          "Add BOM lines to define which parts make up this product.",
        icon: ListTreeIcon,
      }}
    />
  );
}
