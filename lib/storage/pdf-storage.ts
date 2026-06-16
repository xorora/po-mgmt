import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".pdf-storage");

export async function storeVendorPoPdf(
  versionId: number,
  buffer: Buffer,
): Promise<string> {
  const filename = `vendor-po-v${versionId}.pdf`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`vendor-pos/${filename}`, buffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }

  await mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  const filePath = path.join(LOCAL_STORAGE_DIR, filename);
  await writeFile(filePath, buffer);
  return `/api/pdf/${versionId}`;
}

export function getLocalPdfPath(versionId: number): string {
  return path.join(LOCAL_STORAGE_DIR, `vendor-po-v${versionId}.pdf`);
}
