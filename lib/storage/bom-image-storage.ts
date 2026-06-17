import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".bom-image-storage");

function contentTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

function sanitizeStorageKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._/-]+/g, "-");
}

export function getLocalBomImagePath(storageKey: string): string {
  return path.join(LOCAL_STORAGE_DIR, storageKey);
}

export async function uploadBomImage(
  buffer: Buffer,
  storageKey: string,
): Promise<string> {
  const safeKey = sanitizeStorageKey(storageKey);
  const contentType = contentTypeFromPath(safeKey);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`bom-images/${safeKey}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }

  const filePath = getLocalBomImagePath(safeKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return `/api/bom-images/${safeKey.split("/").map(encodeURIComponent).join("/")}`;
}
