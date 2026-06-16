import Link from "next/link";
import { notFound } from "next/navigation";

import { PartImageGallery } from "@/components/bom/bom-images";
import { PageHeader } from "@/components/page-header";
import { PartFormDialog } from "@/components/parts/part-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { getPartById, updatePart } from "@/lib/actions/parts";

type PartDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PartDetailPage({ params }: PartDetailPageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const part = await getPartById(id);
  if (!part) notFound();

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/parts">← Back to parts</Link>
        </Button>
      </div>

      <PageHeader
        title={part.name}
        description={part.description ?? "No description"}
      >
        <PartFormDialog
          part={part}
          action={updatePart}
          triggerLabel="Edit part"
        />
      </PageHeader>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On hand</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {part.inventory?.quantityOnHand ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory">Adjust in inventory</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vendors</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {part.vendorParts.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Used in products</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {part.productParts.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section className="mb-8 space-y-3">
        <h2 className="font-heading text-lg font-medium">Part images</h2>
        <PartImageGallery
          partName={part.name}
          images={part.productParts.map((productPart) => ({
            imageSideUrl: productPart.imageSideUrl,
            imageFrontUrl: productPart.imageFrontUrl,
            imageBottomUrl: productPart.imageBottomUrl,
          }))}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium">Vendors</h2>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {part.vendorParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      Not assigned to any vendor.{" "}
                      <Link href="/vendors" className="underline">
                        Assign via vendors
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  part.vendorParts.map(({ vendor }) => (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <Link
                          href={`/vendors/${vendor.id}`}
                          className="hover:underline"
                        >
                          {vendor.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vendor.contactName ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium">Products (BOM)</h2>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {part.productParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-muted-foreground">
                      Not used in any product BOM.
                    </TableCell>
                  </TableRow>
                ) : (
                  part.productParts.map(({ product, quantity }) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Link
                          href={`/products/${product.id}`}
                          className="hover:underline"
                        >
                          {product.displayName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {product.modelCode}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {quantity}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </>
  );
}
