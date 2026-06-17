"use client";

export type SkuExcelBlobUpload = {
  blobUrl: string;
  fileName: string;
};

const SKU_IMPORT_STAGE_URL = "/api/sku-import/stage";

export async function uploadSkuExcelFileToBlob(
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
