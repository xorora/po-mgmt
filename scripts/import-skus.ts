import "dotenv/config";

import {
  formatImportSummary,
  importSkuDirectory,
  importSkuFile,
} from "@/lib/services/sku-import";

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: bun scripts/import-skus.ts <file-or-directory>");
    process.exit(1);
  }

  const { stat } = await import("node:fs/promises");

  const stats = await stat(target);
  if (stats.isDirectory()) {
    const summary = await importSkuDirectory(target);
    console.log(formatImportSummary(summary));
    process.exit(summary.filesFailed > 0 ? 1 : 0);
  }

  const result = await importSkuFile(target);
  if (result.error) {
    console.error(`Import failed: ${result.error}`);
    process.exit(1);
  }

  console.log(
    `Imported ${result.modelCode}: ${result.bomLinesImported} BOM lines, ${result.partsCreated} new parts, ${result.partsUpdated} updated parts`,
  );
  console.log(
    `Images: ${result.imagesExtracted} extracted, ${result.imagesUploaded} uploaded`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
