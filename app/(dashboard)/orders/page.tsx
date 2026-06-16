import { DataTablePage } from "@/components/data-table/data-table-page";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { OrdersDataTable } from "@/components/orders/orders-data-table";
import { PageHeader } from "@/components/page-header";
import {
  createCustomerOrder,
  getProductsForOrderForm,
} from "@/lib/actions/orders";
import { getCustomerOrdersPaginated } from "@/lib/data-table/list-queries";
import { parsePaginationSearchParams } from "@/lib/data-table/pagination";

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const pagination = parsePaginationSearchParams(await searchParams);

  const [result, products] = await Promise.all([
    getCustomerOrdersPaginated(pagination),
    getProductsForOrderForm(),
  ]);

  return (
    <DataTablePage
      header={
        <PageHeader
          className="mb-0"
          title="Customer orders"
          description="Create and manage customer orders. BOM requirements are computed from product bill-of-materials."
        >
          <OrderFormDialog products={products} action={createCustomerOrder} />
        </PageHeader>
      }
    >
      <OrdersDataTable result={result} products={products} />
    </DataTablePage>
  );
}
