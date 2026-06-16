import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  customerOrderLines,
  customerOrders,
  customerPoLines,
  customerPos,
} from "@/lib/db/schema";
import {
  explodeBomForCustomerOrder,
  type PartRequirement,
} from "@/lib/services/bom-explosion";
import { adjustInventory } from "@/lib/services/inventory";

export type InsufficientPart = {
  partId: number;
  partName: string;
  requiredQuantity: number;
  quantityOnHand: number;
  shortfall: number;
};

export type CustomerPoCreationPreview = {
  canCreate: boolean;
  canCreateWithOverride: boolean;
  blockingErrors: string[];
  insufficientParts: InsufficientPart[];
  partRequirements: PartRequirement[];
  hasExistingCustomerPo: boolean;
  orderStatus: string | null;
};

export type CreateCustomerPoResult = {
  success: boolean;
  error?: string;
  customerPoId?: number;
  overrideUsed?: boolean;
};

function buildInsufficientParts(
  partRequirements: PartRequirement[],
): InsufficientPart[] {
  return partRequirements
    .filter((part) => part.quantityOnHand < part.requiredQuantity)
    .map((part) => ({
      partId: part.partId,
      partName: part.partName,
      requiredQuantity: part.requiredQuantity,
      quantityOnHand: part.quantityOnHand,
      shortfall: part.requiredQuantity - part.quantityOnHand,
    }));
}

export async function previewCustomerPoCreation(
  orderId: number,
): Promise<CustomerPoCreationPreview> {
  const [order, explosion] = await Promise.all([
    db.query.customerOrders.findFirst({
      where: eq(customerOrders.id, orderId),
      with: { customerPo: true },
    }),
    explodeBomForCustomerOrder(orderId),
  ]);

  if (!order) {
    return {
      canCreate: false,
      canCreateWithOverride: false,
      blockingErrors: ["Order not found"],
      insufficientParts: [],
      partRequirements: [],
      hasExistingCustomerPo: false,
      orderStatus: null,
    };
  }

  const hardBlockingErrors: string[] = [];

  if (order.customerPo) {
    hardBlockingErrors.push("A customer PO already exists for this order");
  }

  if (order.status !== "ready") {
    hardBlockingErrors.push(
      "Order must be ready before creating a customer PO — deliver all vendor POs first",
    );
  }

  if (explosion.productsWithoutBom.length > 0) {
    hardBlockingErrors.push(
      `${explosion.productsWithoutBom.length} product(s) have no BOM`,
    );
  }

  const insufficientParts = buildInsufficientParts(explosion.partRequirements);
  const blockingErrors = [...hardBlockingErrors];

  if (insufficientParts.length > 0) {
    blockingErrors.push(
      `${insufficientParts.length} part(s) have insufficient stock`,
    );
  }

  const canCreateWithOverride =
    hardBlockingErrors.length === 0 && insufficientParts.length > 0;

  return {
    canCreate: blockingErrors.length === 0,
    canCreateWithOverride,
    blockingErrors,
    insufficientParts,
    partRequirements: explosion.partRequirements,
    hasExistingCustomerPo: Boolean(order.customerPo),
    orderStatus: order.status,
  };
}

export async function createCustomerPoForOrder(
  orderId: number,
  options: { override?: boolean; overrideReason?: string } = {},
): Promise<CreateCustomerPoResult> {
  const preview = await previewCustomerPoCreation(orderId);

  if (preview.hasExistingCustomerPo) {
    return {
      success: false,
      error: "A customer PO already exists for this order",
    };
  }

  if (!preview.canCreate && !preview.canCreateWithOverride) {
    return {
      success: false,
      error: preview.blockingErrors[0] ?? "Cannot create customer PO",
    };
  }

  if (preview.canCreateWithOverride && !options.override) {
    return {
      success: false,
      error: `${preview.insufficientParts.length} part(s) have insufficient stock — override required`,
    };
  }

  if (options.override) {
    const reason = options.overrideReason?.trim();
    if (!reason) {
      return {
        success: false,
        error: "An override reason is required when stock is insufficient",
      };
    }
  }

  const orderLines = await db
    .select()
    .from(customerOrderLines)
    .where(eq(customerOrderLines.customerOrderId, orderId));

  if (orderLines.length === 0) {
    return { success: false, error: "Order has no product lines" };
  }

  try {
    const customerPoId = await db.transaction(async (tx) => {
      const [customerPo] = await tx
        .insert(customerPos)
        .values({
          customerOrderId: orderId,
          overrideUsed: Boolean(
            options.override && preview.canCreateWithOverride,
          ),
          overrideReason:
            options.override && preview.canCreateWithOverride
              ? options.overrideReason?.trim()
              : null,
        })
        .returning();

      await tx.insert(customerPoLines).values(
        orderLines.map((line) => ({
          customerPoId: customerPo.id,
          productId: line.productId,
          quantity: line.quantity,
        })),
      );

      for (const part of preview.partRequirements) {
        await adjustInventory(part.partId, -part.requiredQuantity, tx);
      }

      await tx
        .update(customerOrders)
        .set({ status: "fulfilled", updatedAt: new Date() })
        .where(eq(customerOrders.id, orderId));

      return customerPo.id;
    });

    return {
      success: true,
      customerPoId,
      overrideUsed: Boolean(options.override && preview.canCreateWithOverride),
    };
  } catch {
    return { success: false, error: "Failed to create customer PO" };
  }
}
