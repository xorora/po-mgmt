import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";

import { LOW_STOCK_THRESHOLD } from "@/lib/constants/inventory";
import { db } from "@/lib/db";
import {
  type CustomerOrderStatus,
  customerOrders,
  customerPos,
  inventory,
  parts,
  type VendorPoStatus,
  vendorPos,
  vendors,
} from "@/lib/db/schema";

export type DashboardData = {
  orderCounts: Record<CustomerOrderStatus, number>;
  openOrdersCount: number;
  lowStockCount: number;
  pendingVendorPosCount: number;
  readyForFulfillmentCount: number;
  lowStockParts: Array<{
    partId: number;
    partName: string;
    quantityOnHand: number;
  }>;
  pendingVendorPos: Array<{
    id: number;
    vendorName: string;
    status: VendorPoStatus;
    customerOrderId: number | null;
    createdAt: Date;
  }>;
  readyOrders: Array<{ id: number; createdAt: Date }>;
  recentOpenOrders: Array<{
    id: number;
    status: CustomerOrderStatus;
    createdAt: Date;
    lineCount: number;
  }>;
};

const OPEN_ORDER_STATUSES: CustomerOrderStatus[] = [
  "pending",
  "procuring",
  "ready",
];

const PENDING_PO_STATUSES: VendorPoStatus[] = ["draft", "sent"];

export async function getDashboardData(): Promise<DashboardData> {
  const lowStockCondition = or(
    isNull(inventory.quantityOnHand),
    lt(inventory.quantityOnHand, LOW_STOCK_THRESHOLD),
  );

  const [
    orderCountRows,
    openOrdersCountResult,
    lowStockCountResult,
    pendingVendorPosCountResult,
    readyForFulfillmentCountResult,
    lowStockParts,
    pendingVendorPos,
    readyOrders,
    recentOpenOrders,
  ] = await Promise.all([
    db
      .select({ status: customerOrders.status, count: count() })
      .from(customerOrders)
      .groupBy(customerOrders.status),
    db
      .select({ count: count() })
      .from(customerOrders)
      .where(inArray(customerOrders.status, OPEN_ORDER_STATUSES)),
    db
      .select({ count: count() })
      .from(parts)
      .leftJoin(inventory, eq(inventory.partId, parts.id))
      .where(lowStockCondition),
    db
      .select({ count: count() })
      .from(vendorPos)
      .where(inArray(vendorPos.status, PENDING_PO_STATUSES)),
    db
      .select({ count: count() })
      .from(customerOrders)
      .leftJoin(customerPos, eq(customerPos.customerOrderId, customerOrders.id))
      .where(and(eq(customerOrders.status, "ready"), isNull(customerPos.id))),
    db
      .select({
        partId: parts.id,
        partName: parts.name,
        quantityOnHand: sql<number>`coalesce(${inventory.quantityOnHand}, 0)`,
      })
      .from(parts)
      .leftJoin(inventory, eq(inventory.partId, parts.id))
      .where(lowStockCondition)
      .orderBy(asc(sql`coalesce(${inventory.quantityOnHand}, 0)`))
      .limit(5),
    db
      .select({
        id: vendorPos.id,
        vendorName: vendors.name,
        status: vendorPos.status,
        customerOrderId: vendorPos.customerOrderId,
        createdAt: vendorPos.createdAt,
      })
      .from(vendorPos)
      .innerJoin(vendors, eq(vendors.id, vendorPos.vendorId))
      .where(inArray(vendorPos.status, PENDING_PO_STATUSES))
      .orderBy(desc(vendorPos.createdAt))
      .limit(5),
    db
      .select({
        id: customerOrders.id,
        createdAt: customerOrders.createdAt,
      })
      .from(customerOrders)
      .leftJoin(customerPos, eq(customerPos.customerOrderId, customerOrders.id))
      .where(and(eq(customerOrders.status, "ready"), isNull(customerPos.id)))
      .orderBy(desc(customerOrders.createdAt))
      .limit(5),
    db.query.customerOrders.findMany({
      where: inArray(customerOrders.status, OPEN_ORDER_STATUSES),
      orderBy: [desc(customerOrders.createdAt)],
      limit: 5,
      with: { lines: true },
    }),
  ]);

  const orderCounts: Record<CustomerOrderStatus, number> = {
    pending: 0,
    procuring: 0,
    ready: 0,
    fulfilled: 0,
  };

  for (const row of orderCountRows) {
    orderCounts[row.status] = row.count;
  }

  return {
    orderCounts,
    openOrdersCount: openOrdersCountResult[0]?.count ?? 0,
    lowStockCount: lowStockCountResult[0]?.count ?? 0,
    pendingVendorPosCount: pendingVendorPosCountResult[0]?.count ?? 0,
    readyForFulfillmentCount: readyForFulfillmentCountResult[0]?.count ?? 0,
    lowStockParts,
    pendingVendorPos,
    readyOrders,
    recentOpenOrders: recentOpenOrders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      lineCount: order.lines.length,
    })),
  };
}
