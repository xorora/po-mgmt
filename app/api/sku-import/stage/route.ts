import { NextResponse } from "next/server";
import {
  validateSkuUploadFileName,
  validateSkuUploadFileSize,
} from "@/lib/sku-upload-limits";
import {
  isSkuExcelBlobUploadEnabled,
  stageSkuExcelToBlob,
} from "@/lib/storage/sku-excel-blob";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSkuExcelBlobUploadEnabled()) {
    return NextResponse.json(
      { error: "Blob storage is not configured" },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Select an Excel file to upload" },
        { status: 400 },
      );
    }

    const nameError = validateSkuUploadFileName(file.name);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    const sizeError = validateSkuUploadFileSize(file);
    if (sizeError) {
      return NextResponse.json({ error: sizeError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const staged = await stageSkuExcelToBlob(buffer, file.name);

    return NextResponse.json(staged);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to stage Excel file",
      },
      { status: 500 },
    );
  }
}
