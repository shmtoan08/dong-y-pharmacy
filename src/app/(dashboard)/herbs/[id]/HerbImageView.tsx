"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Leaf, Pencil, Plus } from "lucide-react";
import type { HerbImage } from "@/features/herbs/actions";

/** Gallery anh vi thuoc o trang chi tiet: anh dai dien lon + strip thumbnail + lightbox xem ca 5 tam. */
export function HerbImageView({
  images,
  herbName,
  herbId,
  canEdit,
}: {
  images: HerbImage[];
  herbName: string;
  herbId: string;
  canEdit: boolean;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex h-64 w-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 text-stone-400 md:h-80 md:w-80">
        <Leaf className="h-10 w-10" />
        <p className="text-xs">Chưa có ảnh</p>
        {canEdit && (
          <Link href={`/herbs/${herbId}/edit`}>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Thêm ảnh
            </Button>
          </Link>
        )}
      </div>
    );
  }

  const primary = images.find((img) => img.is_primary) ?? images[0];

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setLightbox(images.indexOf(primary))}
        aria-label="Xem ảnh lớn"
        className="block cursor-zoom-in"
      >
        <img
          src={primary.image_url}
          alt={herbName}
          className="h-64 w-64 rounded-lg border border-stone-200 object-cover md:h-80 md:w-80"
        />
      </button>
      {images.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setLightbox(i)}
              aria-label={`Xem ảnh ${i + 1}`}
              className={`rounded-md border-2 ${
                img.id === primary.id
                  ? "border-emerald-600"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={img.image_url}
                alt={`${herbName} ${i + 1}`}
                className="h-14 w-14 rounded-[4px] object-cover"
              />
            </button>
          ))}
        </div>
      )}
      {canEdit && (
        <Link href={`/herbs/${herbId}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="mr-1 h-4 w-4" /> Đổi ảnh
          </Button>
        </Link>
      )}
      <Dialog open={lightbox !== null} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2 sm:max-w-3xl">
          <DialogTitle className="sr-only">
            {herbName} — ảnh {(lightbox ?? 0) + 1}/{images.length}
          </DialogTitle>
          {lightbox !== null && (
            <div className="relative">
              <img
                src={images[lightbox].image_url}
                alt={herbName}
                className="max-h-[85vh] w-full rounded-md object-contain"
              />
              {images.length > 1 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={() => setLightbox((lightbox - 1 + images.length) % images.length)}
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setLightbox((lightbox + 1) % images.length)}
                    aria-label="Ảnh sau"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                    {lightbox + 1}/{images.length}
                  </span>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
