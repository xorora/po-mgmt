export const SKU_EXCEL_BLOB_PREFIX = "sku-imports/";

export function sanitizeSkuExcelFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}
