import { DataTablePage } from "@/components/data-table/data-table-page";
import { PageHeader } from "@/components/page-header";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductsDataTable } from "@/components/products/products-data-table";
import { ImportAllSkusButton } from "@/components/products/sku-import-buttons";
import { createProduct } from "@/lib/actions/products";
import { importAllSkusAction } from "@/lib/actions/sku-import";
import { getProductsPaginated } from "@/lib/data-table/list-queries";
import { parsePaginationSearchParams } from "@/lib/data-table/pagination";

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const pagination = parsePaginationSearchParams(await searchParams);
  const result = await getProductsPaginated(pagination);

  return (
    <DataTablePage
      header={
        <PageHeader
          className="mb-0"
          title="Products"
          description="Manage products and view bill-of-materials imported from SKU files."
        >
          <div className="flex flex-wrap items-center gap-2">
            <ImportAllSkusButton action={importAllSkusAction} />
            <ProductFormDialog action={createProduct} />
          </div>
        </PageHeader>
      }
    >
      <ProductsDataTable result={result} />
    </DataTablePage>
  );
}
