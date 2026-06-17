// Large Excel files must bypass Vercel's 4.5 MB function body limit via direct Blob upload.
export const SKU_UPLOAD_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const SKU_UPLOAD_MAX_FILE_SIZE_LABEL = "100 MB";

/** Files above this use Blob multipart client upload. */
export const SKU_UPLOAD_MULTIPART_THRESHOLD_BYTES = 10 * 1024 * 1024;

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
  return /body exceeded.*limit|FUNCTION_PAYLOAD_TOO_LARGE|413/i.test(message);
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
