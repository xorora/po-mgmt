"use server";

import { asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  type ActionResult,
  actionError,
  actionSuccess,
} from "@/lib/actions/types";
import { db } from "@/lib/db";
import {
  type CustomerOrderStatus,
  customerOrderLines,
  customerOrders,
  products,
} from "@/lib/db/schema";

export type OrderLineInput = {
  productId: number;
  quantity: number;
};

function parseOrderLines(raw: unknown): OrderLineInput[] | null {
  if (!Array.isArray(raw)) return null;

  const lines: OrderLineInput[] = [];

  for (const entry of raw) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("productId" in entry) ||
      !("quantity" in entry)
    ) {
      return null;
    }

    const productId = Number(entry.productId);
    const quantity = Number(entry.quantity);

    if (!Number.isFinite(productId) || !Number.isFinite(quantity)) {
      return null;
    }

    if (quantity <= 0) continue;

    lines.push({ productId, quantity });
  }

  if (lines.length === 0) return null;

  return lines;
}

function parseLinesFromFormData(formData: FormData): OrderLineInput[] | null {
  const linesJson = formData.get("linesJson");
  if (typeof linesJson !== "string" || !linesJson.trim()) return null;

  try {
    return parseOrderLines(JSON.parse(linesJson));
  } catch {
    return null;
  }
}

async function assertOrderEditable(orderId: number) {
  const order = await db.query.customerOrders.findFirst({
    where: eq(customerOrders.id, orderId),
  });

  if (!order) return { error: "Order not found" as const };
  if (order.status !== "pending") {
    return {
      error: "Only pending orders can be edited or deleted" as const,
    };
  }

  return { order };
}

export async function createCustomerOrder(
  formData: FormData,
): Promise<ActionResult & { id?: number }> {
  const lines = parseLinesFromFormData(formData);
  if (!lines) {
    return actionError(
      "Add at least one product line with a positive quantity",
    );
  }

  try {
    const [order] = await db
      .insert(customerOrders)
      .values({ status: "pending" })
      .returning();

    await db.insert(customerOrderLines).values(
      lines.map((line) => ({
        customerOrderId: order.id,
        productId: line.productId,
        quantity: line.quantity,
      })),
    );

    revalidatePath("/orders");
    revalidatePath("/");
    return { ...actionSuccess(), id: order.id };
  } catch {
    return actionError("Failed to create customer order");
  }
}

export async function updateCustomerOrder(
  formData: FormData,
): Promise<ActionResult> {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return actionError("Invalid order id");

  const lines = parseLinesFromFormData(formData);
  if (!lines) {
    return actionError(
      "Add at least one product line with a positive quantity",
    );
  }

  const editable = await assertOrderEditable(id);
  if ("error" in editable && editable.error) {
    return actionError(editable.error);
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(customerOrderLines)
        .where(eq(customerOrderLines.customerOrderId, id));

      await tx.insert(customerOrderLines).values(
        lines.map((line) => ({
          customerOrderId: id,
          productId: line.productId,
          quantity: line.quantity,
        })),
      );

      await tx
        .update(customerOrders)
        .set({ updatedAt: new Date() })
        .where(eq(customerOrders.id, id));
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    revalidatePath("/");
    return actionSuccess();
  } catch {
    return actionError("Failed to update customer order");
  }
}

export async function deleteCustomerOrder(
  formData: FormData,
): Promise<ActionResult> {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return actionError("Invalid order id");

  const editable = await assertOrderEditable(id);
  if ("error" in editable && editable.error) {
    return actionError(editable.error);
  }

  try {
    await db.delete(customerOrders).where(eq(customerOrders.id, id));
    revalidatePath("/orders");
    revalidatePath("/");
    return actionSuccess();
  } catch {
    return actionError("Failed to delete customer order");
  }
}

export async function updateCustomerOrderStatus(
  formData: FormData,
): Promise<ActionResult> {
  const id = Number(formData.get("id"));
  const status = formData.get("status");

  if (!Number.isFinite(id)) return actionError("Invalid order id");
  if (
    typeof status !== "string" ||
    !["pending", "procuring", "ready", "fulfilled"].includes(status)
  ) {
    return actionError("Invalid order status");
  }

  const order = await db.query.customerOrders.findFirst({
    where: eq(customerOrders.id, id),
  });

  if (!order) return actionError("Order not found");

  try {
    await db
      .update(customerOrders)
      .set({
        status: status as CustomerOrderStatus,
        updatedAt: new Date(),
      })
      .where(eq(customerOrders.id, id));

    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
    revalidatePath("/");
    return actionSuccess();
  } catch {
    return actionError("Failed to update order status");
  }
}

export async function getCustomerOrders() {
  return db.query.customerOrders.findMany({
    orderBy: [desc(customerOrders.createdAt)],
    with: {
      lines: {
        with: { product: true },
      },
    },
  });
}

export async function getCustomerOrderById(id: number) {
  return db.query.customerOrders.findFirst({
    where: eq(customerOrders.id, id),
    with: {
      lines: {
        with: { product: true },
      },
      vendorPos: {
        with: { vendor: true },
      },
      customerPo: true,
    },
  });
}

export async function getProductsForOrderForm() {
  return db
    .select({
      id: products.id,
      displayName: products.displayName,
      modelCode: products.modelCode,
    })
    .from(products)
    .orderBy(asc(products.displayName));
}
