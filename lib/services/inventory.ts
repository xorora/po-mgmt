import { eq, sql } from "drizzle-orm";

import { type Database, db } from "@/lib/db";
import { inventory } from "@/lib/db/schema";

type DbOrTx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export async function ensureInventoryRow(partId: number, client: DbOrTx = db) {
  const [existing] = await client
    .select()
    .from(inventory)
    .where(eq(inventory.partId, partId))
    .limit(1);

  if (existing) return existing;

  const [created] = await client
    .insert(inventory)
    .values({ partId, quantityOnHand: 0 })
    .returning();

  return created;
}

export async function adjustInventory(
  partId: number,
  delta: number,
  client: DbOrTx = db,
) {
  await ensureInventoryRow(partId, client);

  const [result] = await client
    .update(inventory)
    .set({
      quantityOnHand: sql`${inventory.quantityOnHand} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(inventory.partId, partId))
    .returning();

  return result;
}

export async function setInventoryQuantity(partId: number, quantity: number) {
  await ensureInventoryRow(partId);

  const [result] = await db
    .update(inventory)
    .set({
      quantityOnHand: quantity,
      updatedAt: new Date(),
    })
    .where(eq(inventory.partId, partId))
    .returning();

  return result;
}
