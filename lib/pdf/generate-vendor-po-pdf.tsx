import { renderToBuffer } from "@react-pdf/renderer";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { productParts, vendorPoVersions } from "@/lib/db/schema";
import {
  VendorPoDocument,
  type VendorPoPdfData,
} from "@/lib/pdf/vendor-po-document";
import { storeVendorPoPdf } from "@/lib/storage/pdf-storage";

const COMPANY_NAME = "Creative Lighting PVT LTD";

function pickThumbnailUrl(
  rows: {
    partId: number;
    imageFrontUrl: string | null;
    imageSideUrl: string | null;
    imageBottomUrl: string | null;
  }[],
  partId: number,
): string | null {
  const matches = rows.filter((row) => row.partId === partId);
  for (const row of matches) {
    if (row.imageFrontUrl) return row.imageFrontUrl;
  }
  for (const row of matches) {
    if (row.imageSideUrl) return row.imageSideUrl;
  }
  for (const row of matches) {
    if (row.imageBottomUrl) return row.imageBottomUrl;
  }
  return null;
}

export async function generateVendorPoPdfForVersion(
  versionId: number,
): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  const version = await db.query.vendorPoVersions.findFirst({
    where: eq(vendorPoVersions.id, versionId),
    with: {
      lines: {
        with: { part: true },
      },
      vendorPo: {
        with: { vendor: true },
      },
    },
  });

  if (!version) {
    return { success: false, error: "Version not found" };
  }

  const partIds = version.lines.map((line) => line.partId);
  const partImageRows =
    partIds.length > 0
      ? await db
          .select({
            partId: productParts.partId,
            imageFrontUrl: productParts.imageFrontUrl,
            imageSideUrl: productParts.imageSideUrl,
            imageBottomUrl: productParts.imageBottomUrl,
          })
          .from(productParts)
          .where(inArray(productParts.partId, partIds))
      : [];

  const pdfData: VendorPoPdfData = {
    companyName: COMPANY_NAME,
    vendorPoId: version.vendorPo.id,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt,
    vendor: {
      name: version.vendorPo.vendor.name,
      contactName: version.vendorPo.vendor.contactName,
      email: version.vendorPo.vendor.email,
      phone: version.vendorPo.vendor.phone,
      address: version.vendorPo.vendor.address,
    },
    lines: version.lines
      .map((line) => ({
        partName: line.part.name,
        description: line.part.description,
        quantity: line.quantity,
        thumbnailUrl: pickThumbnailUrl(partImageRows, line.partId),
      }))
      .sort((a, b) => a.partName.localeCompare(b.partName)),
  };

  try {
    const buffer = await renderToBuffer(<VendorPoDocument data={pdfData} />);
    const pdfUrl = await storeVendorPoPdf(versionId, Buffer.from(buffer));

    await db
      .update(vendorPoVersions)
      .set({ pdfUrl })
      .where(eq(vendorPoVersions.id, versionId));

    return { success: true, pdfUrl };
  } catch {
    return { success: false, error: "Failed to generate PDF" };
  }
}
