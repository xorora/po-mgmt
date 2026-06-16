"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  type ActionResult,
  actionError,
  actionSuccess,
} from "@/lib/actions/types";
import { db } from "@/lib/db";
import { customerPos } from "@/lib/db/schema";
import {
  createCustomerPoForOrder,
  previewCustomerPoCreation,
} from "@/lib/services/customer-po";

export { previewCustomerPoCreation };

export async function getCustomerPoById(id: number) {
  return db.query.customerPos.findFirst({
    where: eq(customerPos.id, id),
    with: {
      customerOrder: true,
      lines: {
        with: { product: true },
      },
    },
  });
}

export async function createCustomerPoAction(
  formData: FormData,
): Promise<ActionResult & { customerPoId?: number; overrideUsed?: boolean }> {
  const orderId = Number(formData.get("orderId"));
  if (!Number.isFinite(orderId)) {
    return actionError("Invalid order id");
  }

  const override = formData.get("override") === "true";
  const overrideReasonRaw = formData.get("overrideReason");
  const overrideReason =
    typeof overrideReasonRaw === "string" ? overrideReasonRaw : undefined;

  const result = await createCustomerPoForOrder(orderId, {
    override,
    overrideReason: overrideReason ?? undefined,
  });

  if (!result.success) {
    return actionError(result.error ?? "Failed to create customer PO");
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/inventory");
  revalidatePath("/");
  if (result.customerPoId) {
    revalidatePath(`/customer-pos/${result.customerPoId}`);
  }

  return {
    ...actionSuccess(),
    customerPoId: result.customerPoId,
    overrideUsed: result.overrideUsed,
  };
}
