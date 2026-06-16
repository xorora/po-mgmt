import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  customerOrders,
  parts,
  vendorParts,
  vendorPos,
  vendorPoVersionLines,
  vendorPoVersions,
  vendors,
} from "@/lib/db/schema";
import { generateVendorPoPdfForVersion } from "@/lib/pdf/generate-vendor-po-pdf";
import {
  explodeBomForCustomerOrder,
  type ProductWithoutBom,
} from "@/lib/services/bom-explosion";
import { adjustInventory } from "@/lib/services/inventory";

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

export type UnassignedPart = {
  partId: number;
  partName: string;
  netNeed: number;
};

export type MultiVendorPart = {
  partId: number;
  partName: string;
  netNeed: number;
  vendors: { vendorId: number; vendorName: string }[];
};

export type VendorPoDraftLine = {
  partId: number;
  partName: string;
  partDescription: string | null;
  quantity: number;
};

export type VendorPoDraft = {
  vendorId: number;
  vendorName: string;
  lines: VendorPoDraftLine[];
};

export type VendorPoGenerationPreview = {
  canGenerate: boolean;
  blockingErrors: string[];
  unassignedParts: UnassignedPart[];
  multiVendorParts: MultiVendorPart[];
  productsWithoutBom: ProductWithoutBom[];
  vendorDrafts: VendorPoDraft[];
  totalNetNeed: number;
  existingVendorPoCount: number;
};

export type GenerateVendorPosResult = {
  success: boolean;
  error?: string;
  vendorPoIds?: number[];
  vendorPoCount?: number;
  orderStatus?: "procuring" | "ready";
};

export type CreateRestockVendorPoResult = {
  success: boolean;
  error?: string;
  vendorPoId?: number;
};

export type MarkVendorPoDeliveredResult = {
  success: boolean;
  error?: string;
  orderId?: number | null;
  orderStatus?: "procuring" | "ready";
  partsReceived?: number;
};

export type MarkVendorPoSentResult = {
  success: boolean;
  error?: string;
};

type VendorAssignment = {
  vendorId: number;
  vendorName: string;
};

async function loadVendorAssignmentsByPartId(
  partIds: number[],
): Promise<Map<number, VendorAssignment[]>> {
  if (partIds.length === 0) return new Map();

  const rows = await db
    .select({
      partId: vendorParts.partId,
      vendorId: vendorParts.vendorId,
      vendorName: vendors.name,
    })
    .from(vendorParts)
    .innerJoin(vendors, eq(vendorParts.vendorId, vendors.id))
    .where(inArray(vendorParts.partId, partIds));

  const byPartId = new Map<number, VendorAssignment[]>();

  for (const row of rows) {
    const existing = byPartId.get(row.partId) ?? [];
    existing.push({ vendorId: row.vendorId, vendorName: row.vendorName });
    byPartId.set(row.partId, existing);
  }

  return byPartId;
}

function buildVendorDrafts(
  partsNeedingProcurement: {
    partId: number;
    partName: string;
    partDescription: string | null;
    netNeed: number;
  }[],
  vendorAssignmentsByPartId: Map<number, VendorAssignment[]>,
): {
  vendorDrafts: VendorPoDraft[];
  unassignedParts: UnassignedPart[];
  multiVendorParts: MultiVendorPart[];
} {
  const unassignedParts: UnassignedPart[] = [];
  const multiVendorParts: MultiVendorPart[] = [];
  const vendorGroups = new Map<
    number,
    { vendorName: string; lines: VendorPoDraftLine[] }
  >();

  for (const part of partsNeedingProcurement) {
    const assignments = vendorAssignmentsByPartId.get(part.partId) ?? [];

    if (assignments.length === 0) {
      unassignedParts.push({
        partId: part.partId,
        partName: part.partName,
        netNeed: part.netNeed,
      });
      continue;
    }

    if (assignments.length > 1) {
      multiVendorParts.push({
        partId: part.partId,
        partName: part.partName,
        netNeed: part.netNeed,
        vendors: assignments.map((assignment) => ({
          vendorId: assignment.vendorId,
          vendorName: assignment.vendorName,
        })),
      });
      continue;
    }

    const assignment = assignments[0];
    const group = vendorGroups.get(assignment.vendorId) ?? {
      vendorName: assignment.vendorName,
      lines: [],
    };

    group.lines.push({
      partId: part.partId,
      partName: part.partName,
      partDescription: part.partDescription,
      quantity: part.netNeed,
    });

    vendorGroups.set(assignment.vendorId, group);
  }

  const vendorDrafts = [...vendorGroups.entries()]
    .map(([vendorId, group]) => ({
      vendorId,
      vendorName: group.vendorName,
      lines: group.lines.sort((a, b) => a.partName.localeCompare(b.partName)),
    }))
    .sort((a, b) => a.vendorName.localeCompare(b.vendorName));

  return { vendorDrafts, unassignedParts, multiVendorParts };
}

export async function previewVendorPoGeneration(
  orderId: number,
): Promise<VendorPoGenerationPreview> {
  const [order, explosion, existingVendorPos] = await Promise.all([
    db.query.customerOrders.findFirst({
      where: eq(customerOrders.id, orderId),
    }),
    explodeBomForCustomerOrder(orderId),
    db.query.vendorPos.findMany({
      where: eq(vendorPos.customerOrderId, orderId),
    }),
  ]);

  const blockingErrors: string[] = [];

  if (!order) {
    return {
      canGenerate: false,
      blockingErrors: ["Order not found"],
      unassignedParts: [],
      multiVendorParts: [],
      productsWithoutBom: [],
      vendorDrafts: [],
      totalNetNeed: 0,
      existingVendorPoCount: 0,
    };
  }

  if (order.status !== "pending") {
    blockingErrors.push("Only pending orders can generate vendor POs");
  }

  if (existingVendorPos.length > 0) {
    blockingErrors.push(
      "Vendor POs have already been generated for this order",
    );
  }

  if (explosion.productsWithoutBom.length > 0) {
    blockingErrors.push(
      `${explosion.productsWithoutBom.length} product(s) have no BOM — import or define BOMs first`,
    );
  }

  const partsNeedingProcurement = explosion.partRequirements.filter(
    (part) => part.netNeed > 0,
  );

  const totalNetNeed = partsNeedingProcurement.reduce(
    (sum, part) => sum + part.netNeed,
    0,
  );

  const vendorAssignmentsByPartId = await loadVendorAssignmentsByPartId(
    partsNeedingProcurement.map((part) => part.partId),
  );

  const { vendorDrafts, unassignedParts, multiVendorParts } = buildVendorDrafts(
    partsNeedingProcurement,
    vendorAssignmentsByPartId,
  );

  if (unassignedParts.length > 0) {
    blockingErrors.push(
      `${unassignedParts.length} part(s) need procurement but have no vendor assigned`,
    );
  }

  if (multiVendorParts.length > 0) {
    blockingErrors.push(
      `${multiVendorParts.length} part(s) are assigned to multiple vendors — resolve assignments first`,
    );
  }

  return {
    canGenerate: blockingErrors.length === 0,
    blockingErrors,
    unassignedParts,
    multiVendorParts,
    productsWithoutBom: explosion.productsWithoutBom,
    vendorDrafts,
    totalNetNeed,
    existingVendorPoCount: existingVendorPos.length,
  };
}

export async function generateVendorPosForCustomerOrder(
  orderId: number,
): Promise<GenerateVendorPosResult> {
  const preview = await previewVendorPoGeneration(orderId);

  if (!preview.canGenerate) {
    return {
      success: false,
      error: preview.blockingErrors[0] ?? "Cannot generate vendor POs",
    };
  }

  if (preview.vendorDrafts.length === 0) {
    try {
      await db
        .update(customerOrders)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(customerOrders.id, orderId));

      return {
        success: true,
        vendorPoIds: [],
        vendorPoCount: 0,
        orderStatus: "ready",
      };
    } catch {
      return { success: false, error: "Failed to update order status" };
    }
  }

  try {
    const result = await db.transaction(async (tx) => {
      const createdPoIds: number[] = [];
      const createdVersionIds: number[] = [];

      for (const draft of preview.vendorDrafts) {
        const [po] = await tx
          .insert(vendorPos)
          .values({
            customerOrderId: orderId,
            vendorId: draft.vendorId,
            type: "customer_derived",
            status: "draft",
          })
          .returning();

        const [version] = await tx
          .insert(vendorPoVersions)
          .values({
            vendorPoId: po.id,
            versionNumber: 1,
          })
          .returning();

        await tx.insert(vendorPoVersionLines).values(
          draft.lines.map((line) => ({
            vendorPoVersionId: version.id,
            partId: line.partId,
            quantity: line.quantity,
          })),
        );

        createdPoIds.push(po.id);
        createdVersionIds.push(version.id);
      }

      await tx
        .update(customerOrders)
        .set({ status: "procuring", updatedAt: new Date() })
        .where(eq(customerOrders.id, orderId));

      return { poIds: createdPoIds, versionIds: createdVersionIds };
    });

    for (const versionId of result.versionIds) {
      await generateVendorPoPdfForVersion(versionId);
    }

    return {
      success: true,
      vendorPoIds: result.poIds,
      vendorPoCount: result.poIds.length,
      orderStatus: "procuring",
    };
  } catch {
    return { success: false, error: "Failed to generate vendor POs" };
  }
}

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

export async function createRestockVendorPo(
  vendorId: number,
  lines: VendorPoLineInput[],
): Promise<CreateRestockVendorPoResult> {
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
      const [po] = await tx
        .insert(vendorPos)
        .values({
          customerOrderId: null,
          vendorId,
          type: "restock",
          status: "draft",
        })
        .returning();

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
    return { success: false, error: "Failed to create restock vendor PO" };
  }
}

export async function getVendorPoParts(vendorId: number) {
  const rows = await db
    .select({
      id: parts.id,
      name: parts.name,
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

  if (vendorPo.status === "delivered") {
    return { success: false, error: "Delivered POs cannot be edited" };
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

async function maybeMarkCustomerOrderReadyInTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  customerOrderId: number,
  deliveredVendorPoId: number,
) {
  const linkedPos = await tx.query.vendorPos.findMany({
    where: eq(vendorPos.customerOrderId, customerOrderId),
  });

  if (linkedPos.length === 0) return null;

  const allDelivered = linkedPos.every(
    (po) => po.id === deliveredVendorPoId || po.status === "delivered",
  );
  if (!allDelivered) return "procuring" as const;

  await tx
    .update(customerOrders)
    .set({ status: "ready", updatedAt: new Date() })
    .where(eq(customerOrders.id, customerOrderId));

  return "ready" as const;
}

export async function markVendorPoSent(
  vendorPoId: number,
): Promise<MarkVendorPoSentResult> {
  const vendorPo = await db.query.vendorPos.findFirst({
    where: eq(vendorPos.id, vendorPoId),
  });

  if (!vendorPo) {
    return { success: false, error: "Vendor PO not found" };
  }

  if (vendorPo.status === "sent") {
    return { success: false, error: "Vendor PO is already marked as sent" };
  }

  if (vendorPo.status === "delivered") {
    return { success: false, error: "Delivered POs cannot be marked as sent" };
  }

  if (vendorPo.status !== "draft") {
    return { success: false, error: "Only draft POs can be marked as sent" };
  }

  try {
    await db
      .update(vendorPos)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(vendorPos.id, vendorPoId));

    return { success: true };
  } catch {
    return { success: false, error: "Failed to mark vendor PO as sent" };
  }
}

export async function markVendorPoDelivered(
  vendorPoId: number,
): Promise<MarkVendorPoDeliveredResult> {
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

  if (vendorPo.status === "delivered") {
    return { success: false, error: "Vendor PO is already delivered" };
  }

  if (vendorPo.status !== "sent") {
    return {
      success: false,
      error: "Mark the PO as sent before recording delivery",
    };
  }

  const latestVersion = vendorPo.versions[0];
  if (!latestVersion || latestVersion.lines.length === 0) {
    return { success: false, error: "Vendor PO has no lines to receive" };
  }

  try {
    let orderStatus: "procuring" | "ready" | undefined;

    await db.transaction(async (tx) => {
      for (const line of latestVersion.lines) {
        await adjustInventory(line.partId, line.quantity, tx);
      }

      await tx
        .update(vendorPos)
        .set({ status: "delivered", updatedAt: new Date() })
        .where(eq(vendorPos.id, vendorPoId));

      if (vendorPo.customerOrderId) {
        orderStatus =
          (await maybeMarkCustomerOrderReadyInTx(
            tx,
            vendorPo.customerOrderId,
            vendorPoId,
          )) ?? undefined;
      }
    });

    return {
      success: true,
      orderId: vendorPo.customerOrderId,
      orderStatus,
      partsReceived: latestVersion.lines.length,
    };
  } catch {
    return { success: false, error: "Failed to mark vendor PO as delivered" };
  }
}
