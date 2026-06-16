"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  type ActionResult,
  actionError,
  actionSuccess,
} from "@/lib/actions/types";
import { db } from "@/lib/db";
import { vendorPos } from "@/lib/db/schema";
import {
  createRestockVendorPo,
  generateVendorPosForCustomerOrder,
  getVendorPoParts,
  markVendorPoDelivered,
  markVendorPoSent,
  previewVendorPoGeneration,
  saveVendorPoVersion,
  type VendorPoLineInput,
} from "@/lib/services/vendor-po";

function parseVendorPoLines(formData: FormData): VendorPoLineInput[] | null {
  const raw = formData.get("lines");
  if (typeof raw !== "string" || !raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;

    const lines: VendorPoLineInput[] = [];
    for (const item of parsed) {
      if (
        typeof item !== "object" ||
        item === null ||
        !("partId" in item) ||
        !("quantity" in item)
      ) {
        return null;
      }
      const partId = Number(item.partId);
      const quantity = Number(item.quantity);
      if (!Number.isFinite(partId) || !Number.isFinite(quantity)) return null;
      lines.push({ partId, quantity });
    }

    return lines;
  } catch {
    return null;
  }
}

export async function createRestockVendorPoAction(
  formData: FormData,
): Promise<ActionResult & { vendorPoId?: number }> {
  const vendorId = Number(formData.get("vendorId"));
  if (!Number.isFinite(vendorId)) {
    return actionError("Invalid vendor id");
  }

  const lines = parseVendorPoLines(formData);
  if (!lines) {
    return actionError("Invalid line items");
  }

  const result = await createRestockVendorPo(vendorId, lines);

  if (!result.success) {
    return actionError(result.error ?? "Failed to create restock PO");
  }

  revalidatePath("/vendor-pos");
  revalidatePath("/");
  if (result.vendorPoId) {
    revalidatePath(`/vendor-pos/${result.vendorPoId}`);
  }

  return {
    ...actionSuccess(),
    vendorPoId: result.vendorPoId,
  };
}

export async function generateVendorPosForOrder(
  formData: FormData,
): Promise<
  ActionResult & { vendorPoCount?: number; orderStatus?: "procuring" | "ready" }
> {
  const orderId = Number(formData.get("orderId"));
  if (!Number.isFinite(orderId)) {
    return actionError("Invalid order id");
  }

  const result = await generateVendorPosForCustomerOrder(orderId);

  if (!result.success) {
    return actionError(result.error ?? "Failed to generate vendor POs");
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/vendor-pos");
  revalidatePath("/");

  return {
    ...actionSuccess(),
    vendorPoCount: result.vendorPoCount,
    orderStatus: result.orderStatus,
  };
}

export { getVendorPoParts, previewVendorPoGeneration };

export async function saveVendorPoVersionAction(formData: FormData): Promise<
  ActionResult & {
    versionNumber?: number;
    pdfUrl?: string;
    unchanged?: boolean;
  }
> {
  const vendorPoId = Number(formData.get("vendorPoId"));
  if (!Number.isFinite(vendorPoId)) {
    return actionError("Invalid vendor PO id");
  }

  const lines = parseVendorPoLines(formData);
  if (!lines) {
    return actionError("Invalid line items");
  }

  const result = await saveVendorPoVersion(vendorPoId, lines);

  if (!result.success) {
    return actionError(result.error ?? "Failed to save vendor PO");
  }

  if (result.unchanged) {
    return { ...actionSuccess(), unchanged: true };
  }

  revalidatePath("/vendor-pos");
  revalidatePath(`/vendor-pos/${vendorPoId}`);
  revalidatePath("/");

  return {
    ...actionSuccess(),
    versionNumber: result.versionNumber,
    pdfUrl: result.pdfUrl,
  };
}

export async function markVendorPoSentAction(
  formData: FormData,
): Promise<ActionResult> {
  const vendorPoId = Number(formData.get("vendorPoId"));
  if (!Number.isFinite(vendorPoId)) {
    return actionError("Invalid vendor PO id");
  }

  const result = await markVendorPoSent(vendorPoId);

  if (!result.success) {
    return actionError(result.error ?? "Failed to mark vendor PO as sent");
  }

  revalidatePath("/vendor-pos");
  revalidatePath(`/vendor-pos/${vendorPoId}`);
  revalidatePath("/");

  return actionSuccess();
}

export async function markVendorPoDeliveredAction(formData: FormData): Promise<
  ActionResult & {
    orderId?: number | null;
    orderStatus?: "procuring" | "ready";
    partsReceived?: number;
  }
> {
  const vendorPoId = Number(formData.get("vendorPoId"));
  if (!Number.isFinite(vendorPoId)) {
    return actionError("Invalid vendor PO id");
  }

  const result = await markVendorPoDelivered(vendorPoId);

  if (!result.success) {
    return actionError(result.error ?? "Failed to mark vendor PO as delivered");
  }

  revalidatePath("/vendor-pos");
  revalidatePath(`/vendor-pos/${vendorPoId}`);
  revalidatePath("/inventory");
  revalidatePath("/");

  if (result.orderId) {
    revalidatePath("/orders");
    revalidatePath(`/orders/${result.orderId}`);
  }

  return {
    ...actionSuccess(),
    orderId: result.orderId,
    orderStatus: result.orderStatus,
    partsReceived: result.partsReceived,
  };
}

export async function getVendorPos() {
  return db.query.vendorPos.findMany({
    orderBy: [desc(vendorPos.createdAt)],
    with: {
      vendor: true,
      customerOrder: true,
      versions: {
        orderBy: (versions, { desc: descVersion }) => [
          descVersion(versions.versionNumber),
        ],
        limit: 1,
      },
    },
  });
}

export async function getVendorPoById(id: number) {
  return db.query.vendorPos.findFirst({
    where: eq(vendorPos.id, id),
    with: {
      vendor: true,
      customerOrder: true,
      versions: {
        orderBy: (versions, { desc: descVersion }) => [
          descVersion(versions.versionNumber),
        ],
        with: {
          lines: {
            with: { part: true },
          },
        },
      },
    },
  });
}
