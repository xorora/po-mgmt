"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions/types";
import type { ImportSummary } from "@/lib/services/sku-import";

type ImportAllSkusButtonProps = {
  action: () => Promise<
    ActionResult & { summary?: ImportSummary; summaryText?: string }
  >;
};

export function ImportAllSkusButton({ action }: ImportAllSkusButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleImport() {
    startTransition(async () => {
      const result = await action();

      if (result.summaryText) {
        setSummaryText(result.summaryText);
      }

      if (result.success) {
        toast.success("SKU import completed");
        router.refresh();
        setOpen(false);
      } else {
        toast.error(result.error ?? "SKU import failed");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          Import all SKUs
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Import all SKU files?</AlertDialogTitle>
          <AlertDialogDescription>
            Reads every Excel file in the skus/ directory, upserts products and
            parts, and uploads BOM images to imgbb when configured.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {summaryText ? (
          <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
            {summaryText}
          </pre>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleImport} disabled={pending}>
            {pending ? "Importing…" : "Import all"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type ReimportProductSkuButtonProps = {
  modelCode: string;
  hasSkuFile: boolean;
  action: (formData: FormData) => Promise<ActionResult>;
};

export function ReimportProductSkuButton({
  modelCode,
  hasSkuFile,
  action,
}: ReimportProductSkuButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!hasSkuFile) {
    return null;
  }

  function handleReimport() {
    const formData = new FormData();
    formData.set("modelCode", modelCode);

    startTransition(async () => {
      const result = await action(formData);

      if (result.success) {
        toast.success(`Re-imported BOM for ${modelCode}`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Re-import failed");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          Re-import SKU
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Re-import SKU file?</AlertDialogTitle>
          <AlertDialogDescription>
            Re-reads the Excel file for model code {modelCode}, replaces BOM
            lines, and refreshes part images.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleReimport} disabled={pending}>
            {pending ? "Importing…" : "Re-import"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
