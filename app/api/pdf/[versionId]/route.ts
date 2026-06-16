import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { vendorPoVersions } from "@/lib/db/schema";
import { getLocalPdfPath } from "@/lib/storage/pdf-storage";

type RouteContext = {
  params: Promise<{ versionId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { versionId: versionIdParam } = await context.params;
  const versionId = Number(versionIdParam);
  if (!Number.isFinite(versionId)) notFound();

  const version = await db.query.vendorPoVersions.findFirst({
    where: eq(vendorPoVersions.id, versionId),
    with: { vendorPo: true },
  });

  if (!version) notFound();

  try {
    const buffer = await readFile(getLocalPdfPath(versionId));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="vendor-po-${version.vendorPo.id}-v${version.versionNumber}.pdf"`,
      },
    });
  } catch {
    notFound();
  }
}
