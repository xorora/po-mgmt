import { asc, count, desc, eq } from "drizzle-orm";
import type { getVendorPos } from "@/lib/actions/vendor-pos";
import {
  buildPaginatedResult,
  getPaginationOffset,
  type PaginatedResult,
  type PaginationParams,
} from "@/lib/data-table/pagination";
import { db } from "@/lib/db";
import {
  parts,
  productParts,
  products,
  vendorParts,
  vendorPos,
  vendors,
} from "@/lib/db/schema";

export async function getPartsPaginated(pagination: PaginationParams) {
  const offset = getPaginationOffset(pagination);

  const [totalResult, rows] = await Promise.all([
    db.select({ total: count() }).from(parts),
    db
      .select({
        id: parts.id,
        name: parts.name,
        normalizedName: parts.normalizedName,
        category: parts.category,
        specs: parts.specs,
        description: parts.description,
        createdAt: parts.createdAt,
        updatedAt: parts.updatedAt,
        vendorCount: count(vendorParts.id),
        productCount: count(productParts.id),
      })
      .from(parts)
      .leftJoin(vendorParts, eq(vendorParts.partId, parts.id))
      .leftJoin(productParts, eq(productParts.partId, parts.id))
      .groupBy(parts.id)
      .orderBy(asc(parts.name))
      .limit(pagination.pageSize)
      .offset(offset),
  ]);

  return buildPaginatedResult(rows, totalResult[0]?.total ?? 0, pagination);
}

export type PartListRow = Awaited<
  ReturnType<typeof getPartsPaginated>
>["rows"][number];

export async function getProductsPaginated(pagination: PaginationParams) {
  const offset = getPaginationOffset(pagination);

  const [totalResult, rows] = await Promise.all([
    db.select({ total: count() }).from(products),
    db
      .select({
        id: products.id,
        modelCode: products.modelCode,
        displayName: products.displayName,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        bomLineCount: count(productParts.id),
      })
      .from(products)
      .leftJoin(productParts, eq(productParts.productId, products.id))
      .groupBy(products.id)
      .orderBy(asc(products.displayName))
      .limit(pagination.pageSize)
      .offset(offset),
  ]);

  return buildPaginatedResult(rows, totalResult[0]?.total ?? 0, pagination);
}

export type ProductListRow = Awaited<
  ReturnType<typeof getProductsPaginated>
>["rows"][number];

export async function getVendorsPaginated(pagination: PaginationParams) {
  const offset = getPaginationOffset(pagination);

  const [totalResult, rows] = await Promise.all([
    db.select({ total: count() }).from(vendors),
    db
      .select({
        id: vendors.id,
        name: vendors.name,
        contactName: vendors.contactName,
        email: vendors.email,
        phone: vendors.phone,
        address: vendors.address,
        createdAt: vendors.createdAt,
        updatedAt: vendors.updatedAt,
        partCount: count(vendorParts.id),
      })
      .from(vendors)
      .leftJoin(vendorParts, eq(vendorParts.vendorId, vendors.id))
      .groupBy(vendors.id)
      .orderBy(asc(vendors.name))
      .limit(pagination.pageSize)
      .offset(offset),
  ]);

  return buildPaginatedResult(rows, totalResult[0]?.total ?? 0, pagination);
}

export type VendorListRow = Awaited<
  ReturnType<typeof getVendorsPaginated>
>["rows"][number];

export async function getVendorPosPaginated(
  pagination: PaginationParams,
): Promise<PaginatedResult<Awaited<ReturnType<typeof getVendorPos>>[number]>> {
  const offset = getPaginationOffset(pagination);

  const [totalResult, rows] = await Promise.all([
    db.select({ total: count() }).from(vendorPos),
    db.query.vendorPos.findMany({
      orderBy: [desc(vendorPos.createdAt)],
      limit: pagination.pageSize,
      offset,
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

  return buildPaginatedResult(rows, totalResult[0]?.total ?? 0, pagination);
}

export type VendorPoListRow = Awaited<
  ReturnType<typeof getVendorPosPaginated>
>["rows"][number];
