"use client";

import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type BomImageSet = {
  imageSideUrl: string | null;
  imageFrontUrl: string | null;
  imageBottomUrl: string | null;
};

type BomImageThumbnailProps = {
  url: string;
  label: string;
  alt: string;
};

function BomImageThumbnail({ url, label, alt }: BomImageThumbnailProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative block size-10 overflow-hidden rounded border bg-muted"
          title={`View ${label}`}
        >
          <Image
            src={url}
            alt={alt}
            fill
            sizes="40px"
            className="object-cover transition-opacity group-hover:opacity-80"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-square w-full overflow-hidden rounded-md border bg-muted">
          <Image
            src={url}
            alt={alt}
            fill
            sizes="(max-width: 512px) 100vw, 512px"
            className="object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

type BomImagesProps = {
  images: BomImageSet;
  partName: string;
};

export function BomImages({ images, partName }: BomImagesProps) {
  const views = [
    { key: "side" as const, label: "Side", url: images.imageSideUrl },
    { key: "front" as const, label: "Front", url: images.imageFrontUrl },
    { key: "bottom" as const, label: "Bottom", url: images.imageBottomUrl },
  ].filter(
    (
      view,
    ): view is {
      key: "side" | "front" | "bottom";
      label: string;
      url: string;
    } => Boolean(view.url),
  );

  if (views.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {views.map((view) => (
        <BomImageThumbnail
          key={view.key}
          url={view.url}
          label={view.label}
          alt={`${partName} — ${view.label} view`}
        />
      ))}
    </div>
  );
}

type PartImageGalleryProps = {
  images: BomImageSet[];
  partName: string;
};

export function PartImageGallery({ images, partName }: PartImageGalleryProps) {
  const merged: BomImageSet = {
    imageSideUrl: null,
    imageFrontUrl: null,
    imageBottomUrl: null,
  };

  for (const set of images) {
    if (!merged.imageSideUrl && set.imageSideUrl) {
      merged.imageSideUrl = set.imageSideUrl;
    }
    if (!merged.imageFrontUrl && set.imageFrontUrl) {
      merged.imageFrontUrl = set.imageFrontUrl;
    }
    if (!merged.imageBottomUrl && set.imageBottomUrl) {
      merged.imageBottomUrl = set.imageBottomUrl;
    }
  }

  const views = [
    { key: "side" as const, label: "Side", url: merged.imageSideUrl },
    { key: "front" as const, label: "Front", url: merged.imageFrontUrl },
    { key: "bottom" as const, label: "Bottom", url: merged.imageBottomUrl },
  ].filter(
    (
      view,
    ): view is {
      key: "side" | "front" | "bottom";
      label: string;
      url: string;
    } => Boolean(view.url),
  );

  if (views.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No part images from BOM imports yet.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {views.map((view) => (
        <Dialog key={view.key}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="group overflow-hidden rounded-lg border bg-muted text-left"
            >
              <div className="relative aspect-square w-full">
                <Image
                  src={view.url}
                  alt={`${partName} — ${view.label} view`}
                  fill
                  sizes="(max-width: 640px) 100vw, 200px"
                  className="object-cover transition-opacity group-hover:opacity-90"
                />
              </div>
              <div className="border-t px-2 py-1.5 text-xs font-medium">
                {view.label}
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {partName} — {view.label}
              </DialogTitle>
            </DialogHeader>
            <div className="relative aspect-square w-full overflow-hidden rounded-md border bg-muted">
              <Image
                src={view.url}
                alt={`${partName} — ${view.label} view`}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
