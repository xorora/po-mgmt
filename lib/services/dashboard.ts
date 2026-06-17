import { count, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { parts, products, vendorPos, vendors } from "@/lib/db/schema";

export type DashboardData = {
  vendorCount: number;
  partCount: number;
  productCount: number;
  vendorPoCount: number;
  recentVendorPos: Array<{
    id: number;
    vendorName: string;
    versionNumber: number;
    lineCount: number;
    createdAt: Date;
  }>;
};

export async function getDashboardData(): Promise<DashboardData> {
  const [
    vendorCountResult,
    partCountResult,
    productCountResult,
    vendorPoCountResult,
    recentVendorPos,
  ] = await Promise.all([
    db.select({ count: count() }).from(vendors),
    db.select({ count: count() }).from(parts),
    db.select({ count: count() }).from(products),
    db.select({ count: count() }).from(vendorPos),
    db.query.vendorPos.findMany({
      orderBy: [desc(vendorPos.createdAt)],
      limit: 5,
      with: {
        vendor: true,
        versions: {
          orderBy: (versions, { desc: descVersion }) => [
            descVersion(versions.versionNumber),
          ],
          limit: 1,
          with: { lines: true },
        },
      },
    }),
  ]);

  return {
    vendorCount: vendorCountResult[0]?.count ?? 0,
    partCount: partCountResult[0]?.count ?? 0,
    productCount: productCountResult[0]?.count ?? 0,
    vendorPoCount: vendorPoCountResult[0]?.count ?? 0,
    recentVendorPos: recentVendorPos.map((po) => ({
      id: po.id,
      vendorName: po.vendor.name,
      versionNumber: po.versions[0]?.versionNumber ?? 1,
      lineCount: po.versions[0]?.lines.length ?? 0,
      createdAt: po.createdAt,
    })),
  };
}
