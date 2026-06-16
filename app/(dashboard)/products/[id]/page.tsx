import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductBomDataTable } from "@/components/products/product-bom-data-table";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ReimportProductSkuButton } from "@/components/products/sku-import-buttons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProductById, updateProduct } from "@/lib/actions/products";
import {
  getSkuFileAvailability,
  importProductSkuAction,
} from "@/lib/actions/sku-import";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const product = await getProductById(id);
  if (!product) notFound();

  const { hasSkuFile } = await getSkuFileAvailability(product.modelCode);

  const bomLines = [...product.productParts].sort((a, b) => {
    const aNo = a.itemNo ?? "";
    const bNo = b.itemNo ?? "";
    return aNo.localeCompare(bNo, undefined, { numeric: true });
  });

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/products">← Back to products</Link>
        </Button>
      </div>

      <PageHeader title={product.displayName} description={product.modelCode}>
        <div className="flex flex-wrap items-center gap-2">
          <ReimportProductSkuButton
            modelCode={product.modelCode}
            hasSkuFile={hasSkuFile}
            action={importProductSkuAction}
          />
          <ProductFormDialog
            product={product}
            action={updateProduct}
            triggerLabel="Edit product"
          />
        </div>
      </PageHeader>

      <Card className="mb-8 max-w-sm">
        <CardHeader className="pb-2">
          <CardDescription>BOM lines</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {bomLines.length}
          </CardTitle>
        </CardHeader>
      </Card>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Bill of materials</h2>
        <p className="text-sm text-muted-foreground">
          BOM lines are managed via SKU import. View part details to assign
          vendors.
        </p>
        <ProductBomDataTable lines={bomLines} />
      </section>
    </>
  );
}
