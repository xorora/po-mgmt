import { del, get, put } from "@vercel/blob";

import {
  SKU_EXCEL_BLOB_PREFIX,
  sanitizeSkuExcelFileName,
} from "@/lib/sku-excel-path";
import { SKU_UPLOAD_MAX_FILE_SIZE_BYTES } from "@/lib/sku-upload-limits";
import {
  getBlobAuthOptions,
  isBlobStorageConfigured,
  pathnameFromBlobUrl,
} from "@/lib/storage/blob-config";

export { SKU_EXCEL_BLOB_PREFIX } from "@/lib/sku-excel-path";

export const SKU_EXCEL_CONTENT_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
] as const;

export type SkuExcelBlobUploadMode = "presigned" | "server" | "direct";

export function getSkuExcelBlobUploadMode(): SkuExcelBlobUploadMode {
  if (!isBlobStorageConfigured()) {
    return "direct";
  }

  // Browser uploads go directly to Blob via presigned URLs (supports 15MB+ files).
  if (process.env.VERCEL === "1") {
    return "presigned";
  }

  // Local dev: prefer presigned; small files can fall back to /api/sku-import/stage.
  return "presigned";
}

function sanitizeFileName(fileName: string): string {
  return sanitizeSkuExcelFileName(fileName);
}

export async function stageSkuExcelToBlob(
  buffer: Buffer,
  fileName: string,
): Promise<{ blobUrl: string; fileName: string }> {
  const auth = getBlobAuthOptions();
  if (!auth) {
    throw new Error("Blob storage is not configured");
  }

  const safeName = sanitizeFileName(fileName) || "upload.xlsx";
  const pathname = `${SKU_EXCEL_BLOB_PREFIX}${Date.now()}-${safeName}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    addRandomSuffix: true,
    ...auth,
  });

  return {
    blobUrl: blob.url,
    fileName,
  };
}

/** @deprecated Use getSkuExcelBlobUploadMode() !== "direct" instead. */
export function isSkuExcelBlobUploadEnabled(): boolean {
  return getSkuExcelBlobUploadMode() !== "direct";
}

export function assertValidSkuExcelBlobUrl(url: string): void {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(url).pathname);
  } catch {
    throw new Error("Invalid blob URL");
  }

  if (!pathname.includes(`/${SKU_EXCEL_BLOB_PREFIX}`)) {
    throw new Error("Invalid staging blob URL");
  }
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      chunks.push(value);
    }
  }

  return Buffer.concat(chunks);
}

export async function downloadSkuExcelBlob(blobUrl: string): Promise<Buffer> {
  assertValidSkuExcelBlobUrl(blobUrl);

  const auth = getBlobAuthOptions();
  if (!auth) {
    throw new Error("Blob storage is not configured");
  }

  const result = await get(pathnameFromBlobUrl(blobUrl), {
    access: "public",
    ...auth,
  });

  if (result?.statusCode !== 200 || !result.stream) {
    throw new Error("Uploaded Excel file could not be found");
  }

  if (result.blob.size > SKU_UPLOAD_MAX_FILE_SIZE_BYTES) {
    throw new Error("Uploaded Excel file exceeds the allowed size limit");
  }

  return streamToBuffer(result.stream);
}

export async function deleteSkuExcelBlob(blobUrl: string): Promise<void> {
  if (!isSkuExcelBlobUploadEnabled()) {
    return;
  }

  assertValidSkuExcelBlobUrl(blobUrl);

  const auth = getBlobAuthOptions();
  if (!auth) {
    return;
  }

  await del(pathnameFromBlobUrl(blobUrl), auth);
}
