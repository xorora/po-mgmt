import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { sanitizeSkuExcelFileName } from "@/lib/sku-excel-path";
import { SKU_UPLOAD_MAX_FILE_SIZE_BYTES } from "@/lib/sku-upload-limits";
import {
  isSkuExcelBlobUploadEnabled,
  SKU_EXCEL_BLOB_PREFIX,
  SKU_EXCEL_CONTENT_TYPES,
} from "@/lib/storage/sku-excel-blob";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSkuExcelBlobUploadEnabled()) {
    return NextResponse.json(
      { error: "Blob storage is not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
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

        return {
          allowedContentTypes: [...SKU_EXCEL_CONTENT_TYPES],
          maximumSizeInBytes: SKU_UPLOAD_MAX_FILE_SIZE_BYTES,
          addRandomSuffix: true,
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
