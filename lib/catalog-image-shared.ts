export type CatalogImageEntityType = "parts" | "products";

export type CatalogImageBlobUploadMode = "presigned" | "server" | "direct";

export const CATALOG_IMAGE_BLOB_PREFIX = "catalog-images/";

function sanitizeFileName(fileName: string): string {
  const base = fileName
    .replace(/^.*[/\\]/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base || "image.png";
}

export function buildCatalogImagePathname(
  entityType: CatalogImageEntityType,
  fileName: string,
): string {
  const safeName = sanitizeFileName(fileName);
  return `${CATALOG_IMAGE_BLOB_PREFIX}${entityType}/pending/${Date.now()}-${safeName}`;
}

export function validateCatalogImageUploadPathname(pathname: string): void {
  if (!pathname.startsWith(CATALOG_IMAGE_BLOB_PREFIX)) {
    throw new Error("Invalid upload path");
  }

  const remainder = pathname.slice(CATALOG_IMAGE_BLOB_PREFIX.length);
  if (!remainder.startsWith("parts/") && !remainder.startsWith("products/")) {
    throw new Error("Invalid upload path");
  }
}

export function isValidCatalogImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("/api/catalog-images/")) {
    const storagePath = trimmed.slice("/api/catalog-images/".length);
    return (
      storagePath.length > 0 &&
      !storagePath.includes("..") &&
      (storagePath.startsWith("parts/") || storagePath.startsWith("products/"))
    );
  }

  try {
    const pathname = decodeURIComponent(new URL(trimmed).pathname).replace(
      /^\//,
      "",
    );
    return pathname.startsWith(CATALOG_IMAGE_BLOB_PREFIX);
  } catch {
    return false;
  }
}
