"use client";

import { upload } from "@vercel/blob/client";
import {
  buildSkuExcelBlobPathname,
  resolveSkuExcelBlobUploadMode,
} from "@/lib/sku-excel-path";
import type { SkuExcelBlobUploadMode } from "@/lib/storage/sku-excel-blob";

const SKU_IMPORT_UPLOAD_URL = "/api/sku-import/upload";
const SKU_IMPORT_STAGE_URL = "/api/sku-import/stage";

export type SkuExcelBlobUpload = {
  blobUrl: string;
  fileName: string;
};

async function uploadSkuExcelViaServerStage(
  file: File,
): Promise<SkuExcelBlobUpload> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(SKU_IMPORT_STAGE_URL, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | (SkuExcelBlobUpload & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to upload Excel file to storage");
  }

  if (!payload?.blobUrl || !payload.fileName) {
    throw new Error("Upload succeeded but storage did not return a file URL");
  }

  return {
    blobUrl: payload.blobUrl,
    fileName: payload.fileName,
  };
}

async function uploadSkuExcelViaClientBlob(
  file: File,
): Promise<SkuExcelBlobUpload> {
  const pathname = buildSkuExcelBlobPathname(file.name);
  const blob = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: SKU_IMPORT_UPLOAD_URL,
    contentType:
      file.type ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    multipart: file.size > 20 * 1024 * 1024,
  });

  return {
    blobUrl: blob.url,
    fileName: file.name,
  };
}

export async function uploadSkuExcelFileToBlob(
  file: File,
  mode: Exclude<SkuExcelBlobUploadMode, "direct">,
): Promise<SkuExcelBlobUpload> {
  const effectiveMode = resolveSkuExcelBlobUploadMode(
    mode,
    window.location.hostname,
  );

  if (effectiveMode === "server") {
    return uploadSkuExcelViaServerStage(file);
  }

  return uploadSkuExcelViaClientBlob(file);
}
