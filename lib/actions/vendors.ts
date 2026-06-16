"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  type ActionResult,
  actionError,
  actionSuccess,
} from "@/lib/actions/types";
import { db } from "@/lib/db";
import { vendorParts, vendors } from "@/lib/db/schema";

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function createVendor(formData: FormData): Promise<ActionResult> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return actionError("Vendor name is required");
  }

  try {
    await db.insert(vendors).values({
      name: name.trim(),
      contactName: parseOptionalString(formData.get("contactName")),
      email: parseOptionalString(formData.get("email")),
      phone: parseOptionalString(formData.get("phone")),
      address: parseOptionalString(formData.get("address")),
    });
    revalidatePath("/vendors");
    return actionSuccess();
  } catch {
    return actionError("Failed to create vendor");
  }
}

export async function updateVendor(formData: FormData): Promise<ActionResult> {
  const idRaw = formData.get("id");
  const name = formData.get("name");
  const id = Number(idRaw);

  if (!Number.isFinite(id)) return actionError("Invalid vendor id");
  if (typeof name !== "string" || !name.trim()) {
    return actionError("Vendor name is required");
  }

  try {
    await db
      .update(vendors)
      .set({
        name: name.trim(),
        contactName: parseOptionalString(formData.get("contactName")),
        email: parseOptionalString(formData.get("email")),
        phone: parseOptionalString(formData.get("phone")),
        address: parseOptionalString(formData.get("address")),
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id));
    revalidatePath("/vendors");
    revalidatePath(`/vendors/${id}`);
    return actionSuccess();
  } catch {
    return actionError("Failed to update vendor");
  }
}

export async function deleteVendor(formData: FormData): Promise<ActionResult> {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return actionError("Invalid vendor id");

  try {
    await db.delete(vendors).where(eq(vendors.id, id));
    revalidatePath("/vendors");
    return actionSuccess();
  } catch {
    return actionError(
      "Failed to delete vendor. It may be linked to purchase orders.",
    );
  }
}

export async function assignPartToVendor(
  formData: FormData,
): Promise<ActionResult> {
  const vendorId = Number(formData.get("vendorId"));
  const partId = Number(formData.get("partId"));

  if (!Number.isFinite(vendorId) || !Number.isFinite(partId)) {
    return actionError("Invalid vendor or part");
  }

  try {
    await db
      .insert(vendorParts)
      .values({ vendorId, partId })
      .onConflictDoNothing();
    revalidatePath("/vendors");
    revalidatePath(`/vendors/${vendorId}`);
    revalidatePath("/parts");
    return actionSuccess();
  } catch {
    return actionError("Failed to assign part to vendor");
  }
}

export async function removePartFromVendor(
  formData: FormData,
): Promise<ActionResult> {
  const vendorId = Number(formData.get("vendorId"));
  const partId = Number(formData.get("partId"));

  if (!Number.isFinite(vendorId) || !Number.isFinite(partId)) {
    return actionError("Invalid vendor or part");
  }

  try {
    await db
      .delete(vendorParts)
      .where(
        and(eq(vendorParts.vendorId, vendorId), eq(vendorParts.partId, partId)),
      );
    revalidatePath("/vendors");
    revalidatePath(`/vendors/${vendorId}`);
    revalidatePath("/parts");
    return actionSuccess();
  } catch {
    return actionError("Failed to remove part from vendor");
  }
}

export async function getVendors() {
  return db.select().from(vendors).orderBy(asc(vendors.name));
}

export async function getVendorById(id: number) {
  return db.query.vendors.findFirst({
    where: eq(vendors.id, id),
    with: {
      vendorParts: {
        with: { part: { with: { inventory: true } } },
      },
    },
  });
}
