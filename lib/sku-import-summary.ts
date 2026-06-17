export type SkippedRow = {
  row: number;
  reason: string;
  partName?: string;
};

export type FileImportResult = {
  fileName: string;
  modelCode: string;
  displayName: string;
  productCreated: boolean;
  productUpdated: boolean;
  partsCreated: number;
  partsUpdated: number;
  bomLinesImported: number;
  imagesExtracted: number;
  imagesUploaded: number;
  imagesFailed: number;
  imagesSkipped: boolean;
  skippedRows: SkippedRow[];
  error?: string;
};

export type ImportSummary = {
  filesProcessed: number;
  filesFailed: number;
  productsCreated: number;
  productsUpdated: number;
  partsCreated: number;
  partsUpdated: number;
  bomLinesImported: number;
  totalSkippedRows: number;
  imagesExtracted: number;
  imagesUploaded: number;
  imagesFailed: number;
  fileResults: FileImportResult[];
};

export function summarizeImportResults(
  fileResults: FileImportResult[],
): ImportSummary {
  const successful = fileResults.filter((result) => !result.error);

  return {
    filesProcessed: fileResults.length,
    filesFailed: fileResults.filter((result) => result.error).length,
    productsCreated: successful.filter((result) => result.productCreated)
      .length,
    productsUpdated: successful.filter((result) => result.productUpdated)
      .length,
    partsCreated: successful.reduce(
      (sum, result) => sum + result.partsCreated,
      0,
    ),
    partsUpdated: successful.reduce(
      (sum, result) => sum + result.partsUpdated,
      0,
    ),
    bomLinesImported: successful.reduce(
      (sum, result) => sum + result.bomLinesImported,
      0,
    ),
    totalSkippedRows: successful.reduce(
      (sum, result) => sum + result.skippedRows.length,
      0,
    ),
    imagesExtracted: successful.reduce(
      (sum, result) => sum + result.imagesExtracted,
      0,
    ),
    imagesUploaded: successful.reduce(
      (sum, result) => sum + result.imagesUploaded,
      0,
    ),
    imagesFailed: successful.reduce(
      (sum, result) => sum + result.imagesFailed,
      0,
    ),
    fileResults,
  };
}

export function formatImportSummary(summary: ImportSummary): string {
  const lines: string[] = [
    "Excel Import Summary",
    "====================",
    `Files processed: ${summary.filesProcessed}`,
    `Files failed: ${summary.filesFailed}`,
    `Products created: ${summary.productsCreated}`,
    `Products updated: ${summary.productsUpdated}`,
    `Parts created: ${summary.partsCreated}`,
    `Parts updated: ${summary.partsUpdated}`,
    `BOM lines imported: ${summary.bomLinesImported}`,
    `Rows skipped: ${summary.totalSkippedRows}`,
    `Images extracted: ${summary.imagesExtracted}`,
    `Images uploaded: ${summary.imagesUploaded}`,
    `Image upload failures: ${summary.imagesFailed}`,
    "",
    "Per file:",
  ];

  for (const result of summary.fileResults) {
    if (result.error) {
      lines.push(`  ✗ ${result.fileName}: ${result.error}`);
      continue;
    }

    const flags = [
      result.productCreated ? "product created" : null,
      result.productUpdated ? "product updated" : null,
    ]
      .filter(Boolean)
      .join(", ");

    lines.push(
      `  ✓ ${result.fileName} (${result.modelCode})`,
      `      ${result.bomLinesImported} BOM lines, ${result.partsCreated} new parts, ${result.partsUpdated} updated parts${flags ? `, ${flags}` : ""}`,
      `      Images: ${result.imagesExtracted} extracted, ${result.imagesUploaded} uploaded${result.imagesFailed > 0 ? `, ${result.imagesFailed} failed` : ""}`,
    );

    if (result.skippedRows.length > 0) {
      lines.push(`      Skipped ${result.skippedRows.length} rows:`);
      for (const skipped of result.skippedRows.slice(0, 5)) {
        const label = skipped.partName ? ` "${skipped.partName}"` : "";
        lines.push(`        - Row ${skipped.row}${label}: ${skipped.reason}`);
      }
      if (result.skippedRows.length > 5) {
        lines.push(
          `        ... and ${result.skippedRows.length - 5} more skipped rows`,
        );
      }
    }
  }

  return lines.join("\n");
}
