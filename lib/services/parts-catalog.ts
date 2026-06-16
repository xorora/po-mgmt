import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import type { PartSpecs } from "@/lib/db/schema";
import { inventory, parts } from "@/lib/db/schema";
import {
  buildPartInputFromImport,
  mergeSpecs,
  type PartCategory,
  type SpecMergeStrategy,
} from "@/lib/services/part-specs";
import { normalizePartName } from "@/lib/services/sku-import";

export type PartUpsertInput = {
  name: string;
  category?: PartCategory | string | null;
  specs?: PartSpecs;
  description?: string | null;
  mergeStrategy: SpecMergeStrategy;
};

export type PartUpsertResult = {
  partId: number;
  created: boolean;
  updated: boolean;
};

function pickDescription(
  existing: string | null,
  incoming: string | null | undefined,
  mergeStrategy: SpecMergeStrategy,
): string | null {
  const next = incoming?.trim() || null;
  const current = existing?.trim() || null;

  if (mergeStrategy === "manual" || mergeStrategy === "replace") return next;
  if (!next) return current;
  if (!current) return next;
  return next.length > current.length ? next : current;
}

function pickCategory(
  existing: string | null,
  incoming: string | null | undefined,
  mergeStrategy: SpecMergeStrategy,
): string | null {
  const next = incoming?.trim() || null;
  if (mergeStrategy === "manual" || mergeStrategy === "replace") return next;
  if (!existing || existing === "generic") return next ?? existing;
  return existing;
}

export async function upsertPartRecord(
  input: PartUpsertInput,
): Promise<PartUpsertResult> {
  const normalizedName = normalizePartName(input.name);
  const [existing] = await db
    .select()
    .from(parts)
    .where(eq(parts.normalizedName, normalizedName))
    .limit(1);

  const nextSpecs = mergeSpecs(
    existing?.specs,
    input.specs ?? {},
    input.mergeStrategy,
  );
  const nextDescription = pickDescription(
    existing?.description ?? null,
    input.description,
    input.mergeStrategy,
  );
  const nextCategory = pickCategory(
    existing?.category ?? null,
    input.category,
    input.mergeStrategy,
  );

  if (existing) {
    const specsChanged =
      JSON.stringify(existing.specs ?? {}) !== JSON.stringify(nextSpecs);
    const hasChanges =
      existing.name !== input.name.trim() ||
      existing.description !== nextDescription ||
      existing.category !== nextCategory ||
      specsChanged;

    if (hasChanges) {
      await db
        .update(parts)
        .set({
          name: input.name.trim(),
          category: nextCategory,
          specs: nextSpecs,
          description: nextDescription,
          updatedAt: new Date(),
        })
        .where(eq(parts.id, existing.id));
    }

    return { partId: existing.id, created: false, updated: hasChanges };
  }

  const [inserted] = await db
    .insert(parts)
    .values({
      name: input.name.trim(),
      normalizedName,
      category: input.category?.trim() || null,
      specs: input.specs ?? {},
      description: input.description?.trim() || null,
    })
    .returning({ id: parts.id });

  await db.insert(inventory).values({
    partId: inserted.id,
    quantityOnHand: 0,
  });

  return { partId: inserted.id, created: true, updated: false };
}

export async function upsertPartFromImportLine(
  partName: string,
  rawDescription: string | null,
): Promise<PartUpsertResult> {
  const { category, specs, description } = buildPartInputFromImport(
    partName,
    rawDescription,
  );

  return upsertPartRecord({
    name: partName,
    category,
    specs,
    description,
    mergeStrategy: "import",
  });
}

export type SkuPartSyncSummary = {
  filesProcessed: number;
  partsInSkus: number;
  partsUpdated: number;
  partsSkipped: number;
  partsMissingFromDb: number;
};

export async function syncExistingPartsFromSkuDirectory(
  directoryPath: string,
): Promise<SkuPartSyncSummary> {
  const { readdir } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { parseSkuFile, normalizePartName } = await import(
    "@/lib/services/sku-import"
  );

  const entries = await readdir(directoryPath);
  const files = entries
    .filter((name) => name.toLowerCase().endsWith(".xlsx"))
    .sort();

  const canonicalByPart = new Map<
    string,
    {
      partName: string;
      category: PartCategory | string | null;
      specs: PartSpecs;
      description: string | null;
    }
  >();

  for (const file of files) {
    const parsed = parseSkuFile(join(directoryPath, file));
    for (const line of parsed.bomLines) {
      const normalizedName = normalizePartName(line.partName);
      const incoming = buildPartInputFromImport(
        line.partName,
        line.description,
      );
      const existing = canonicalByPart.get(normalizedName);
      const incomingDescriptionLength = line.description?.length ?? 0;
      const existingDescriptionLength = existing?.description?.length ?? 0;

      if (!existing || incomingDescriptionLength > existingDescriptionLength) {
        canonicalByPart.set(normalizedName, {
          partName: line.partName,
          category: incoming.category,
          specs: incoming.specs,
          description: incoming.description,
        });
      }
    }
  }

  let partsUpdated = 0;
  let partsSkipped = 0;
  let partsMissingFromDb = 0;

  for (const [, source] of canonicalByPart) {
    const normalizedName = normalizePartName(source.partName);
    const [existing] = await db
      .select({ id: parts.id })
      .from(parts)
      .where(eq(parts.normalizedName, normalizedName))
      .limit(1);

    if (!existing) {
      partsMissingFromDb++;
      continue;
    }

    const result = await upsertPartRecord({
      name: source.partName,
      category: source.category,
      specs: source.specs,
      description: source.description,
      mergeStrategy: "replace",
    });

    if (result.updated) partsUpdated++;
    else partsSkipped++;
  }

  return {
    filesProcessed: files.length,
    partsInSkus: canonicalByPart.size,
    partsUpdated,
    partsSkipped,
    partsMissingFromDb,
  };
}
