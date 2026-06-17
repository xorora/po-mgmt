import { DataTablePage } from "@/components/data-table/data-table-page";
import { PageHeader } from "@/components/page-header";
import { CreateVendorPoDialog } from "@/components/vendor-pos/create-vendor-po-dialog";
import { VendorPosDataTable } from "@/components/vendor-pos/vendor-pos-data-table";
import { getVendors } from "@/lib/actions/vendors";
import { getVendorPosPaginated } from "@/lib/data-table/list-queries";
import { parsePaginationSearchParams } from "@/lib/data-table/pagination";

type VendorPosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VendorPosPage({
  searchParams,
}: VendorPosPageProps) {
  const pagination = parsePaginationSearchParams(await searchParams);
  const [result, vendors] = await Promise.all([
    getVendorPosPaginated(pagination),
    getVendors(),
  ]);

  return (
    <DataTablePage
      header={
        <PageHeader
          className="mb-0"
          title="Vendor POs"
          description="Purchase orders for parts from vendors. Each save creates a new version and PDF."
        >
          <CreateVendorPoDialog vendors={vendors} />
        </PageHeader>
      }
    >
      <VendorPosDataTable result={result} />
    </DataTablePage>
  );
}
