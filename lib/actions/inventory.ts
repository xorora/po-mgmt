"use server";

import { revalidatePath } from "next/cache";

import {
  type ActionResult,
  actionError,
  actionSuccess,
} from "@/lib/actions/types";
import {
  adjustInventory,
  setInventoryQuantity,
} from "@/lib/services/inventory";

export async function adjustInventoryAction(
  formData: FormData,
): Promise<ActionResult> {
  const partId = Number(formData.get("partId"));
  const delta = Number(formData.get("delta"));

  if (!Number.isFinite(partId)) return actionError("Invalid part");
  if (!Number.isFinite(delta) || delta === 0) {
    return actionError("Adjustment must be a non-zero number");
  }

  try {
    const result = await adjustInventory(partId, delta);
    if (result && result.quantityOnHand < 0) {
      await setInventoryQuantity(partId, 0);
    }
    revalidatePath("/inventory");
    revalidatePath("/parts");
    return actionSuccess();
  } catch {
    return actionError("Failed to adjust inventory");
  }
}

export async function setInventoryAction(
  formData: FormData,
): Promise<ActionResult> {
  const partId = Number(formData.get("partId"));
  const quantity = Number(formData.get("quantity"));

  if (!Number.isFinite(partId)) return actionError("Invalid part");
  if (!Number.isFinite(quantity) || quantity < 0) {
    return actionError("Quantity must be zero or greater");
  }

  try {
    await setInventoryQuantity(partId, Math.round(quantity));
    revalidatePath("/inventory");
    revalidatePath("/parts");
    return actionSuccess();
  } catch {
    return actionError("Failed to update inventory");
  }
}
