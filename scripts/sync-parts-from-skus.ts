import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { syncExistingPartsFromSkuDirectory } = await import(
    "../lib/services/parts-catalog"
  );

  const skusDir = join(process.cwd(), "skus");
  const summary = await syncExistingPartsFromSkuDirectory(skusDir);

  console.log("SKU Part Specs Sync");
  console.log("===================");
  console.log(`Excel files processed: ${summary.filesProcessed}`);
  console.log(`Unique parts in SKUs: ${summary.partsInSkus}`);
  console.log(`Parts updated: ${summary.partsUpdated}`);
  console.log(`Parts already up to date: ${summary.partsSkipped}`);
  console.log(
    `Parts in SKUs but missing from DB: ${summary.partsMissingFromDb}`,
  );
}

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
