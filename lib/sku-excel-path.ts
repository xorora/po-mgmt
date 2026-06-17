export const SKU_EXCEL_BLOB_PREFIX = "sku-imports/";

export function sanitizeSkuExcelFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildSkuExcelBlobPathname(fileName: string): string {
  const safeName = sanitizeSkuExcelFileName(fileName) || "upload.xlsx";
  return `${SKU_EXCEL_BLOB_PREFIX}${safeName}`;
}

export function isLocalDevHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  );
}

export function resolveSkuExcelBlobUploadMode(
  mode: "client" | "server",
  hostname?: string,
): "client" | "server" {
  if (hostname && isLocalDevHostname(hostname)) {
    return "server";
  }

  return mode;
}
