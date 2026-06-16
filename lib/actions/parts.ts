"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  type ActionResult,
  actionError,
  actionSuccess,
} from "@/lib/actions/types";
import { db } from "@/lib/db";
import { parts } from "@/lib/db/schema";
import { ensureInventoryRow } from "@/lib/services/inventory";
import { normalizePartName } from "@/lib/services/sku-import";

export async function createPart(formData: FormData): Promise<ActionResult> {
  const name = formData.get("name");
  if (typeof name !== "string" || !name.trim()) {
    return actionError("Part name is required");
  }

  const normalizedName = normalizePartName(name);
  const description =
    typeof formData.get("description") === "string"
      ? formData.get("description")?.toString().trim() || null
      : null;

  const [existing] = await db
    .select()
    .from(parts)
    .where(eq(parts.normalizedName, normalizedName))
    .limit(1);

  if (existing) {
    return actionError("A part with this name already exists");
  }

  try {
    const [created] = await db
      .insert(parts)
      .values({ name: name.trim(), normalizedName, description })
      .returning();

    await ensureInventoryRow(created.id);
    revalidatePath("/parts");
    revalidatePath("/inventory");
    return actionSuccess();
  } catch {
    return actionError("Failed to create part");
  }
}

export async function updatePart(formData: FormData): Promise<ActionResult> {
  const id = Number(formData.get("id"));
  const name = formData.get("name");

  if (!Number.isFinite(id)) return actionError("Invalid part id");
  if (typeof name !== "string" || !name.trim()) {
    return actionError("Part name is required");
  }

  const normalizedName = normalizePartName(name);
  const description =
    typeof formData.get("description") === "string"
      ? formData.get("description")?.toString().trim() || null
      : null;

  const [duplicate] = await db
    .select()
    .from(parts)
    .where(and(eq(parts.normalizedName, normalizedName), ne(parts.id, id)))
    .limit(1);

  if (duplicate) {
    return actionError("Another part with this name already exists");
  }

  try {
    await db
      .update(parts)
      .set({
        name: name.trim(),
        normalizedName,
        description,
        updatedAt: new Date(),
      })
      .where(eq(parts.id, id));
    revalidatePath("/parts");
    revalidatePath(`/parts/${id}`);
    revalidatePath("/inventory");
    return actionSuccess();
  } catch {
    return actionError("Failed to update part");
  }
}

export async function deletePart(formData: FormData): Promise<ActionResult> {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return actionError("Invalid part id");

  try {
    await db.delete(parts).where(eq(parts.id, id));
    revalidatePath("/parts");
    revalidatePath("/inventory");
    return actionSuccess();
  } catch {
    return actionError(
      "Failed to delete part. It may be used in BOMs or purchase orders.",
    );
  }
}

export async function getPartById(id: number) {
  return db.query.parts.findFirst({
    where: eq(parts.id, id),
    with: {
      inventory: true,
      vendorParts: { with: { vendor: true } },
      productParts: { with: { product: true } },
    },
  });
}
