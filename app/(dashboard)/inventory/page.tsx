import { eq } from "drizzle-orm";

import { DataTablePage } from "@/components/data-table/data-table-page";
import { InventoryDataTable } from "@/components/inventory/inventory-data-table";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants/inventory";
import { getInventoryPaginated } from "@/lib/data-table/list-queries";
import { parsePaginationSearchParams } from "@/lib/data-table/pagination";
import { db } from "@/lib/db";
import { inventory, parts } from "@/lib/db/schema";

type InventoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InventoryPage({
  searchParams,
}: InventoryPageProps) {
  const pagination = parsePaginationSearchParams(await searchParams);
  const result = await getInventoryPaginated(pagination);

  const allRows = await db
    .select({
      quantityOnHand: inventory.quantityOnHand,
    })
    .from(parts)
    .leftJoin(inventory, eq(inventory.partId, parts.id));

  const lowStockCount = allRows.filter(
    (row) => (row.quantityOnHand ?? 0) < LOW_STOCK_THRESHOLD,
  ).length;

  return (
    <DataTablePage
      header={
        <PageHeader
          className="mb-0"
          title="Inventory"
          description="View stock levels and adjust quantities on hand."
        >
          {lowStockCount > 0 ? (
            <Badge variant="destructive">{lowStockCount} low stock</Badge>
          ) : (
            <Badge variant="secondary">All parts above threshold</Badge>
          )}
        </PageHeader>
      }
    >
      <InventoryDataTable result={result} />
    </DataTablePage>
  );
}
