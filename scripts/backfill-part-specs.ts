import "dotenv/config";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { parts } from "@/lib/db/schema";
import { parseDescriptionToSpecs } from "@/lib/services/part-specs";

async function main() {
  const rows = await db
    .select()
    .from(parts)
    .where(
      sql`(${parts.description} IS NOT NULL AND ${parts.description} <> '') AND (${parts.specs} = '{}'::jsonb OR ${parts.specs} IS NULL)`,
    );

  let updated = 0;

  for (const part of rows) {
    if (!part.description) continue;
    const specs = parseDescriptionToSpecs(part.description);
    if (Object.keys(specs).length === 0) continue;

    await db
      .update(parts)
      .set({
        specs,
        updatedAt: new Date(),
      })
      .where(eq(parts.id, part.id));
    updated++;
  }

  console.log(`Backfilled specs for ${updated} of ${rows.length} parts.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
