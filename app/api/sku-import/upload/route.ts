import { issueSignedToken } from "@vercel/blob";
import {
  type HandleUploadPresignedBody,
  handleUploadPresigned,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { sanitizeSkuExcelFileName } from "@/lib/sku-excel-path";
import { SKU_UPLOAD_MAX_FILE_SIZE_BYTES } from "@/lib/sku-upload-limits";
import { getBlobAuthOptions } from "@/lib/storage/blob-config";
import {
  isSkuExcelBlobUploadEnabled,
  SKU_EXCEL_BLOB_PREFIX,
  SKU_EXCEL_CONTENT_TYPES,
} from "@/lib/storage/sku-excel-blob";

const PRESIGNED_URL_TTL_MS = 15 * 60 * 1000;
const SIGNED_TOKEN_TTL_MS = 60 * 60 * 1000;

function validateUploadPathname(pathname: string): void {
  if (!pathname.startsWith(SKU_EXCEL_BLOB_PREFIX)) {
    throw new Error("Invalid upload path");
  }

  const fileName = pathname.slice(SKU_EXCEL_BLOB_PREFIX.length);
  if (!fileName.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Only .xlsx files are allowed");
  }

  if (fileName !== sanitizeSkuExcelFileName(fileName)) {
    throw new Error("Invalid characters in file name");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSkuExcelBlobUploadEnabled()) {
    return NextResponse.json(
      { error: "Blob storage is not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadPresignedBody;
  const auth = getBlobAuthOptions();

  if (!auth) {
    return NextResponse.json(
      { error: "Blob storage is not configured" },
      { status: 503 },
    );
  }

  try {
    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        validateUploadPathname(pathname);

        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: [...SKU_EXCEL_CONTENT_TYPES],
          maximumSizeInBytes: SKU_UPLOAD_MAX_FILE_SIZE_BYTES,
          validUntil: Date.now() + SIGNED_TOKEN_TTL_MS,
          ...auth,
        });

        return {
          token,
          urlOptions: {
            allowedContentTypes: [...SKU_EXCEL_CONTENT_TYPES],
            maximumSizeInBytes: SKU_UPLOAD_MAX_FILE_SIZE_BYTES,
            addRandomSuffix: true,
            allowOverwrite: false,
            validUntil: Date.now() + PRESIGNED_URL_TTL_MS,
          },
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
