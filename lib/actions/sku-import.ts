"use server";

import { join } from "node:path";
import { revalidatePath } from "next/cache";

import {
  type ActionResult,
  actionError,
  actionSuccess,
} from "@/lib/actions/types";
import {
  type FileImportResult,
  findSkuFilePathForModelCode,
  formatImportSummary,
  type ImportSummary,
  importSkuDirectory,
  importSkuFile,
} from "@/lib/services/sku-import";

const SKUS_DIR = join(process.cwd(), "skus");

function revalidateAfterImport() {
  revalidatePath("/products");
  revalidatePath("/parts");
  revalidatePath("/inventory");
  revalidatePath("/");
}

export async function importAllSkusAction(): Promise<
  ActionResult & { summary?: ImportSummary; summaryText?: string }
> {
  try {
    const summary = await importSkuDirectory(SKUS_DIR);
    revalidateAfterImport();

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
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "SKU import failed",
    );
  }
}

export async function importProductSkuAction(
  formData: FormData,
): Promise<ActionResult & { result?: FileImportResult }> {
  const modelCode = formData.get("modelCode");
  if (typeof modelCode !== "string" || !modelCode.trim()) {
    return actionError("Model code is required");
  }

  const filePath = await findSkuFilePathForModelCode(
    SKUS_DIR,
    modelCode.trim(),
  );
  if (!filePath) {
    return actionError(
      `No SKU Excel file found in skus/ for model code "${modelCode.trim()}"`,
    );
  }

  try {
    const result = await importSkuFile(filePath);
    revalidateAfterImport();

    if (result.error) {
      return { ...actionError(result.error), result };
    }

    revalidatePath(`/products`);
    return { ...actionSuccess(), result };
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : "SKU import failed",
    );
  }
}

export async function getSkuFileAvailability(modelCode: string) {
  const filePath = await findSkuFilePathForModelCode(SKUS_DIR, modelCode);
  return { hasSkuFile: Boolean(filePath) };
}
