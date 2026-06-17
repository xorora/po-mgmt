// Vercel route handlers accept up to 4.5 MB request bodies.
export const SKU_UPLOAD_MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
export const SKU_UPLOAD_MAX_FILE_SIZE_LABEL = "4 MB";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateSkuUploadFileSize(file: File): string | null {
  if (file.size <= SKU_UPLOAD_MAX_FILE_SIZE_BYTES) {
    return null;
  }

  return `${file.name} is too large (${formatFileSize(file.size)}). Each Excel file must be ${SKU_UPLOAD_MAX_FILE_SIZE_LABEL} or smaller.`;
}

export function isBodySizeLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /body exceeded.*limit/i.test(message);
}

export function skuUploadBodySizeLimitMessage(): string {
  return `Upload failed because the file exceeds the ${SKU_UPLOAD_MAX_FILE_SIZE_LABEL} size limit. Use a smaller Excel file or remove embedded images before uploading.`;
}

export function validateSkuUploadFileName(fileName: string): string | null {
  if (!fileName.toLowerCase().endsWith(".xlsx")) {
    return `${fileName}: must be an .xlsx file`;
  }

  return null;
}
