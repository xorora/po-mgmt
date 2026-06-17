import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import type { PartSpecs } from "@/lib/db/schema";
import { parts } from "@/lib/db/schema";
import {
  buildPartInputFromImport,
  mergeSpecs,
  normalizePartName,
  type PartCategory,
  type SpecMergeStrategy,
} from "@/lib/services/part-specs";

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
