import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  customerOrderLines,
  inventory,
  parts,
  productParts,
  products,
} from "@/lib/db/schema";
import { formatPartSpecs } from "@/lib/services/part-specs";

export type OrderLineInput = {
  productId: number;
  quantity: number;
};

export type PartRequirement = {
  partId: number;
  partName: string;
  partDescription: string | null;
  requiredQuantity: number;
  quantityOnHand: number;
  netNeed: number;
};

export type ProductWithoutBom = {
  productId: number;
  displayName: string;
  modelCode: string;
};

export type BomExplosionResult = {
  partRequirements: PartRequirement[];
  productsWithoutBom: ProductWithoutBom[];
  missingProductIds: number[];
};

export async function explodeBomForOrderLines(
  lines: OrderLineInput[],
): Promise<BomExplosionResult> {
  const validLines = lines.filter(
    (line) =>
      Number.isFinite(line.productId) &&
      Number.isFinite(line.quantity) &&
      line.quantity > 0,
  );

  if (validLines.length === 0) {
    return {
      partRequirements: [],
      productsWithoutBom: [],
      missingProductIds: [],
    };
  }

  const productIds = [...new Set(validLines.map((line) => line.productId))];

  const allProducts = await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds));

  const foundProductIds = new Set(allProducts.map((product) => product.id));
  const missingProductIds = productIds.filter((id) => !foundProductIds.has(id));

  const bomRows =
    productIds.length > 0
      ? await db
          .select({
            productId: productParts.productId,
            partId: productParts.partId,
            bomQuantity: productParts.quantity,
            partName: parts.name,
            partSpecs: parts.specs,
            partDescriptionRaw: parts.description,
          })
          .from(productParts)
          .innerJoin(parts, eq(productParts.partId, parts.id))
          .where(inArray(productParts.productId, productIds))
      : [];

  const aggregated = new Map<
    number,
    {
      partName: string;
      partDescription: string | null;
      requiredQuantity: number;
    }
  >();

  for (const line of validLines) {
    const productBom = bomRows.filter(
      (row) => row.productId === line.productId,
    );

    for (const bomLine of productBom) {
      const required = bomLine.bomQuantity * line.quantity;
      const existing = aggregated.get(bomLine.partId);

      if (existing) {
        existing.requiredQuantity += required;
      } else {
        aggregated.set(bomLine.partId, {
          partName: bomLine.partName,
          partDescription: formatPartSpecs({
            specs: bomLine.partSpecs,
            description: bomLine.partDescriptionRaw,
          }),
          requiredQuantity: required,
        });
      }
    }
  }

  const partIds = [...aggregated.keys()];
  const inventoryRows =
    partIds.length > 0
      ? await db
          .select()
          .from(inventory)
          .where(inArray(inventory.partId, partIds))
      : [];

  const inventoryByPartId = new Map(
    inventoryRows.map((row) => [row.partId, row.quantityOnHand]),
  );

  const partRequirements: PartRequirement[] = [...aggregated.entries()]
    .map(([partId, data]) => {
      const quantityOnHand = inventoryByPartId.get(partId) ?? 0;
      return {
        partId,
        partName: data.partName,
        partDescription: data.partDescription,
        requiredQuantity: data.requiredQuantity,
        quantityOnHand,
        netNeed: Math.max(0, data.requiredQuantity - quantityOnHand),
      };
    })
    .sort((a, b) => a.partName.localeCompare(b.partName));

  const productsWithBom = new Set(bomRows.map((row) => row.productId));
  const orderedProductIds = new Set(validLines.map((line) => line.productId));

  const productsWithoutBom = allProducts
    .filter(
      (product) =>
        orderedProductIds.has(product.id) && !productsWithBom.has(product.id),
    )
    .map((product) => ({
      productId: product.id,
      displayName: product.displayName,
      modelCode: product.modelCode,
    }));

  return {
    partRequirements,
    productsWithoutBom,
    missingProductIds,
  };
}

export async function explodeBomForCustomerOrder(
  orderId: number,
): Promise<BomExplosionResult> {
  const lines = await db
    .select({
      productId: customerOrderLines.productId,
      quantity: customerOrderLines.quantity,
    })
    .from(customerOrderLines)
    .where(eq(customerOrderLines.customerOrderId, orderId));

  return explodeBomForOrderLines(lines);
}
