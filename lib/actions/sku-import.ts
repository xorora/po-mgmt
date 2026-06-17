"use server";

import { revalidatePath } from "next/cache";

import {
  type ActionResult,
  actionError,
  actionSuccess,
} from "@/lib/actions/types";
import {
  type FileImportResult,
  formatImportSummary,
  type ImportSkuOptions,
  type ImportSummary,
  importSkuBuffer,
  importSkuFromBlobUrl,
  parseSkuBuffer,
  summarizeImportResults,
} from "@/lib/services/sku-import";
import {
  validateSkuUploadFileName,
  validateSkuUploadFileSize,
} from "@/lib/sku-upload-limits";
import { isSkuExcelBlobUploadEnabled } from "@/lib/storage/sku-excel-blob";

export type SkuBlobUploadInput = {
  blobUrl: string;
  fileName: string;
};

function revalidateAfterImport() {
  revalidatePath("/products");
  revalidatePath("/parts");
  revalidatePath("/");
}

function getUploadedFiles(formData: FormData, fieldName: string): File[] {
  return formData
    .getAll(fieldName)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

function validateXlsxFile(file: File): string | null {
  const nameError = validateSkuUploadFileName(file.name);
  if (nameError) {
    return nameError;
  }

  return validateSkuUploadFileSize(file);
}

function validateBlobUploadInput(upload: SkuBlobUploadInput): string | null {
  const nameError = validateSkuUploadFileName(upload.fileName);
  if (nameError) {
    return nameError;
  }

  if (!upload.blobUrl.trim()) {
    return `${upload.fileName}: missing blob URL`;
  }

  return null;
}

async function importUploadedFile(
  file: File,
  options: ImportSkuOptions = {},
  seenModelCodes?: Map<string, string>,
): Promise<FileImportResult> {
  const validationError = validateXlsxFile(file);
  if (validationError) {
    return {
      fileName: file.name,
      modelCode: "",
      displayName: "",
      productCreated: false,
      productUpdated: false,
      partsCreated: 0,
      partsUpdated: 0,
      bomLinesImported: 0,
      imagesExtracted: 0,
      imagesUploaded: 0,
      imagesFailed: 0,
      imagesSkipped: false,
      skippedRows: [],
      error: validationError,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return importSkuBuffer(buffer, file.name, options, seenModelCodes);
}

function buildImportActionResult(summary: ImportSummary): ActionResult & {
  summary?: ImportSummary;
  summaryText?: string;
} {
  if (summary.filesFailed > 0) {
    return {
      ...actionError(
        `${summary.filesFailed} file(s) failed to import. See details below.`,
      ),
      summary,
      summaryText: formatImportSummary(summary),
    };
  }

  return {
    ...actionSuccess(),
    summary,
    summaryText: formatImportSummary(summary),
  };
}

export async function importSkuFilesFromBlobAction(
  uploads: SkuBlobUploadInput[],
): Promise<ActionResult & { summary?: ImportSummary; summaryText?: string }> {
  if (!isSkuExcelBlobUploadEnabled()) {
    return actionError("Blob storage is not configured for Excel imports");
  }

  if (uploads.length === 0) {
    return actionError("Select at least one Excel file");
  }

  try {
    const fileResults: FileImportResult[] = [];
    const seenModelCodes = new Map<string, string>();

    for (const upload of uploads) {
      const validationError = validateBlobUploadInput(upload);
      if (validationError) {
        fileResults.push({
          fileName: upload.fileName,
          modelCode: "",
          displayName: "",
          productCreated: false,
          productUpdated: false,
          partsCreated: 0,
          partsUpdated: 0,
          bomLinesImported: 0,
          imagesExtracted: 0,
          imagesUploaded: 0,
          imagesFailed: 0,
          imagesSkipped: false,
          skippedRows: [],
          error: validationError,
        });
        continue;
      }

      fileResults.push(
        await importSkuFromBlobUrl(
          upload.blobUrl,
          upload.fileName,
          {},
          seenModelCodes,
        ),
      );
    }

    const summary = summarizeImportResults(fileResults);
    revalidateAfterImport();
    return buildImportActionResult(summary);
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "Excel import failed",
    );
  }
}

export async function importProductBomFromBlobAction(
  productId: number,
  expectedModelCode: string,
  upload: SkuBlobUploadInput,
): Promise<ActionResult & { result?: FileImportResult }> {
  if (!Number.isFinite(productId)) {
    return actionError("Invalid product id");
  }
  if (!expectedModelCode.trim()) {
    return actionError("Model code is required");
  }
  if (!isSkuExcelBlobUploadEnabled()) {
    return actionError("Blob storage is not configured for Excel imports");
  }

  const validationError = validateBlobUploadInput(upload);
  if (validationError) {
    return actionError(validationError);
  }

  try {
    const result = await importSkuFromBlobUrl(upload.blobUrl, upload.fileName, {
      allowExistingProduct: true,
      expectedModelCode: expectedModelCode.trim(),
    });
    revalidateAfterImport();
    revalidatePath(`/products/${productId}`);

    if (result.error) {
      return { ...actionError(result.error), result };
    }

    return { ...actionSuccess(), result };
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "BOM upload failed",
    );
  }
}

/** Legacy direct upload when Blob is not configured (local dev). */
export async function uploadSkuFilesAction(
  formData: FormData,
): Promise<ActionResult & { summary?: ImportSummary; summaryText?: string }> {
  const files = getUploadedFiles(formData, "files");
  if (files.length === 0) {
    return actionError("Select at least one Excel file");
  }

  try {
    const fileResults: FileImportResult[] = [];
    const seenModelCodes = new Map<string, string>();
    for (const file of files) {
      fileResults.push(await importUploadedFile(file, {}, seenModelCodes));
    }

    const summary = summarizeImportResults(fileResults);
    revalidateAfterImport();
    return buildImportActionResult(summary);
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "Excel import failed",
    );
  }
}

/** Legacy direct upload when Blob is not configured (local dev). */
export async function uploadProductBomAction(
  formData: FormData,
): Promise<ActionResult & { result?: FileImportResult }> {
  const productId = Number(formData.get("productId"));
  const expectedModelCode = formData.get("modelCode");
  const file = formData.get("file");

  if (!Number.isFinite(productId)) {
    return actionError("Invalid product id");
  }
  if (typeof expectedModelCode !== "string" || !expectedModelCode.trim()) {
    return actionError("Model code is required");
  }
  if (!(file instanceof File) || file.size === 0) {
    return actionError("Select an Excel file to upload");
  }

  const validationError = validateXlsxFile(file);
  if (validationError) {
    return actionError(validationError);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseSkuBuffer(buffer, file.name);

    if (
      parsed.modelCode.trim().toLowerCase() !==
      expectedModelCode.trim().toLowerCase()
    ) {
      return actionError(
        `Excel model code "${parsed.modelCode}" does not match product model code "${expectedModelCode.trim()}"`,
      );
    }

    const result = await importSkuBuffer(buffer, file.name, {
      allowExistingProduct: true,
    });
    revalidateAfterImport();
    revalidatePath(`/products/${productId}`);

    if (result.error) {
      return { ...actionError(result.error), result };
    }

    return { ...actionSuccess(), result };
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "BOM upload failed",
    );
  }
}
