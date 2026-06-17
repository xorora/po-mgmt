import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  parts,
  vendorParts,
  vendorPos,
  vendorPoVersionLines,
  vendorPoVersions,
  vendors,
} from "@/lib/db/schema";
import { generateVendorPoPdfForVersion } from "@/lib/pdf/generate-vendor-po-pdf";

export type VendorPoLineInput = {
  partId: number;
  quantity: number;
};

export type SaveVendorPoVersionResult = {
  success: boolean;
  error?: string;
  versionId?: number;
  versionNumber?: number;
  pdfUrl?: string;
  unchanged?: boolean;
};

export type CreateVendorPoResult = {
  success: boolean;
  error?: string;
  vendorPoId?: number;
};

function normalizeLinesForComparison(lines: VendorPoLineInput[]) {
  return [...lines]
    .map((line) => ({ partId: line.partId, quantity: line.quantity }))
    .sort((a, b) => a.partId - b.partId);
}

function linesAreEqual(
  current: VendorPoLineInput[],
  next: VendorPoLineInput[],
): boolean {
  const a = normalizeLinesForComparison(current);
  const b = normalizeLinesForComparison(next);
  if (a.length !== b.length) return false;
  return a.every(
    (line, index) =>
      line.partId === b[index].partId && line.quantity === b[index].quantity,
  );
}

function validateVendorPoLines(
  vendorId: number,
  lines: VendorPoLineInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (lines.length === 0) {
    return Promise.resolve({
      ok: false,
      error: "At least one line is required",
    });
  }

  const partIds = [...new Set(lines.map((line) => line.partId))];
  if (partIds.length !== lines.length) {
    return Promise.resolve({
      ok: false,
      error: "Each part can only appear once",
    });
  }

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      return Promise.resolve({
        ok: false,
        error: "All quantities must be positive whole numbers",
      });
    }
  }

  return db
    .select({ partId: vendorParts.partId })
    .from(vendorParts)
    .where(
      and(
        eq(vendorParts.vendorId, vendorId),
        inArray(vendorParts.partId, partIds),
      ),
    )
    .then((assignedParts) => {
      if (assignedParts.length !== partIds.length) {
        return {
          ok: false as const,
          error: "All parts must be assigned to this vendor",
        };
      }
      return { ok: true as const };
    });
}

export async function createVendorPo(
  vendorId: number,
  lines: VendorPoLineInput[],
): Promise<CreateVendorPoResult> {
  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.id, vendorId),
  });

  if (!vendor) {
    return { success: false, error: "Vendor not found" };
  }

  const validation = await validateVendorPoLines(vendorId, lines);
  if (!validation.ok) {
    return { success: false, error: validation.error };
  }

  try {
    const { vendorPoId, versionId } = await db.transaction(async (tx) => {
      const [po] = await tx.insert(vendorPos).values({ vendorId }).returning();

      const [version] = await tx
        .insert(vendorPoVersions)
        .values({
          vendorPoId: po.id,
          versionNumber: 1,
        })
        .returning();

      await tx.insert(vendorPoVersionLines).values(
        lines.map((line) => ({
          vendorPoVersionId: version.id,
          partId: line.partId,
          quantity: line.quantity,
        })),
      );

      return { vendorPoId: po.id, versionId: version.id };
    });

    const pdfResult = await generateVendorPoPdfForVersion(versionId);
    if (!pdfResult.success) {
      return {
        success: true,
        vendorPoId,
        error: pdfResult.error ?? "PO created but PDF generation failed",
      };
    }

    return { success: true, vendorPoId };
  } catch {
    return { success: false, error: "Failed to create vendor PO" };
  }
}

export async function getVendorPoParts(vendorId: number) {
  const rows = await db
    .select({
      id: parts.id,
      name: parts.name,
      specs: parts.specs,
      description: parts.description,
    })
    .from(vendorParts)
    .innerJoin(parts, eq(vendorParts.partId, parts.id))
    .where(eq(vendorParts.vendorId, vendorId))
    .orderBy(parts.name);

  return rows;
}

export async function saveVendorPoVersion(
  vendorPoId: number,
  lines: VendorPoLineInput[],
): Promise<SaveVendorPoVersionResult> {
  const vendorPo = await db.query.vendorPos.findFirst({
    where: eq(vendorPos.id, vendorPoId),
    with: {
      versions: {
        orderBy: (versions, { desc: descVersion }) => [
          descVersion(versions.versionNumber),
        ],
        limit: 1,
        with: { lines: true },
      },
    },
  });

  if (!vendorPo) {
    return { success: false, error: "Vendor PO not found" };
  }

  const validation = await validateVendorPoLines(vendorPo.vendorId, lines);
  if (!validation.ok) {
    return { success: false, error: validation.error };
  }

  const latestVersion = vendorPo.versions[0];
  const currentLines: VendorPoLineInput[] =
    latestVersion?.lines.map((line) => ({
      partId: line.partId,
      quantity: line.quantity,
    })) ?? [];

  if (linesAreEqual(currentLines, lines)) {
    return { success: true, unchanged: true };
  }

  const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  try {
    const versionId = await db.transaction(async (tx) => {
      const [version] = await tx
        .insert(vendorPoVersions)
        .values({
          vendorPoId,
          versionNumber: nextVersionNumber,
        })
        .returning();

      await tx.insert(vendorPoVersionLines).values(
        lines.map((line) => ({
          vendorPoVersionId: version.id,
          partId: line.partId,
          quantity: line.quantity,
        })),
      );

      await tx
        .update(vendorPos)
        .set({ updatedAt: new Date() })
        .where(eq(vendorPos.id, vendorPoId));

      return version.id;
    });

    const pdfResult = await generateVendorPoPdfForVersion(versionId);
    if (!pdfResult.success) {
      return {
        success: true,
        versionId,
        versionNumber: nextVersionNumber,
        error: pdfResult.error ?? "Version saved but PDF generation failed",
      };
    }

    return {
      success: true,
      versionId,
      versionNumber: nextVersionNumber,
      pdfUrl: pdfResult.pdfUrl,
    };
  } catch {
    return { success: false, error: "Failed to save vendor PO version" };
  }
}
