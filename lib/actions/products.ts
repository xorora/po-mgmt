"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
  type ActionResult,
  actionError,
  actionSuccess,
} from "@/lib/actions/types";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const modelCode = formData.get("modelCode");
  const displayName = formData.get("displayName");

  if (typeof modelCode !== "string" || !modelCode.trim()) {
    return actionError("Model code is required");
  }
  if (typeof displayName !== "string" || !displayName.trim()) {
    return actionError("Display name is required");
  }

  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.modelCode, modelCode.trim()))
    .limit(1);

  if (existing) {
    return actionError("A product with this model code already exists");
  }

  try {
    await db.insert(products).values({
      modelCode: modelCode.trim(),
      displayName: displayName.trim(),
    });
    revalidatePath("/products");
    return actionSuccess();
  } catch {
    return actionError("Failed to create product");
  }
}

export async function updateProduct(formData: FormData): Promise<ActionResult> {
  const id = Number(formData.get("id"));
  const modelCode = formData.get("modelCode");
  const displayName = formData.get("displayName");

  if (!Number.isFinite(id)) return actionError("Invalid product id");
  if (typeof modelCode !== "string" || !modelCode.trim()) {
    return actionError("Model code is required");
  }
  if (typeof displayName !== "string" || !displayName.trim()) {
    return actionError("Display name is required");
  }

  const [duplicate] = await db
    .select()
    .from(products)
    .where(and(eq(products.modelCode, modelCode.trim()), ne(products.id, id)))
    .limit(1);

  if (duplicate) {
    return actionError("Another product with this model code already exists");
  }

  try {
    await db
      .update(products)
      .set({
        modelCode: modelCode.trim(),
        displayName: displayName.trim(),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));
    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return actionSuccess();
  } catch {
    return actionError("Failed to update product");
  }
}

export async function deleteProduct(formData: FormData): Promise<ActionResult> {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return actionError("Invalid product id");

  try {
    await db.delete(products).where(eq(products.id, id));
    revalidatePath("/products");
    return actionSuccess();
  } catch {
    return actionError(
      "Failed to delete product. It may be linked to orders or BOM lines.",
    );
  }
}

export async function getProductById(id: number) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      productParts: {
        with: { part: { with: { inventory: true } } },
      },
    },
  });
}
