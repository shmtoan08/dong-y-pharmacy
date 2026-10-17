"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Leaf, Pencil, Plus } from "lucide-react";

/** Anh vi thuoc o trang chi tiet: anh lon 320px, bam mo lightbox. Chua co anh -> placeholder + nut Them anh. */
export function HerbImageView({
  imageUrl,
  herbName,
  herbId,
  canEdit,
}: {
  imageUrl: string | null;
  herbName: string;
  herbId: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!imageUrl) {
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

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Xem ảnh lớn"
        className="block cursor-zoom-in"
      >
        <img
          src={imageUrl}
          alt={herbName}
          className="h-64 w-64 rounded-lg border border-stone-200 object-cover md:h-80 md:w-80"
        />
      </button>
      {canEdit && (
        <Link href={`/herbs/${herbId}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="mr-1 h-4 w-4" /> Đổi ảnh
          </Button>
        </Link>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">{herbName}</DialogTitle>
          <img
            src={imageUrl}
            alt={herbName}
            className="max-h-[85vh] w-full rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
