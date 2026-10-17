"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  uploadHerbImages,
  deleteHerbImage,
  setHerbPrimaryImage,
  type HerbImage,
} from "@/features/herbs/actions";
import { AlertTriangle, Star } from "lucide-react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_COUNT = 5;

/** Gallery ảnh vị thuốc ở trang Sửa: tối đa 5 ảnh, 1 ảnh đại diện. */
export function HerbImageUpload({
  herbId,
  initialImages,
}: {
  herbId: string;
  initialImages: HerbImage[];
}) {
  const [images, setImages] = useState(initialImages);
  const [selected, setSelected] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_COUNT - images.length;

  const clearSelected = () => {
    setSelected([]);
    setPreviews([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFilesChange = (files: FileList | null) => {
    setError(undefined);
    if (!files) return;
    const picked = Array.from(files);
    for (const f of picked) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setError(`File "${f.name}" không phải JPG/PNG/WebP.`);
        return;
      }
      if (f.size > MAX_SIZE) {
        setError(`File "${f.name}" vượt quá 5MB.`);
        return;
      }
    }
    if (selected.length + picked.length > remaining) {
      setError(`Tối đa ${MAX_COUNT} ảnh / vị thuốc (còn trống ${remaining}).`);
      return;
    }
    setSelected((prev) => [...prev, ...picked]);
    setPreviews((prev) => [
      ...prev,
      ...picked.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const onUpload = async () => {
    if (selected.length === 0) return;
    setUploading(true);
    setError(undefined);
    try {
      const formData = new FormData();
      for (const f of selected) formData.append("images", f);
      const result = await uploadHerbImages(herbId, formData);
      if (result.error) {
        setError(result.error);
      } else if (result.data?.images) {
        setImages(result.data.images);
        clearSelected();
      }
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (imageId: string) => {
    setBusyId(imageId);
    setError(undefined);
    try {
      const result = await deleteHerbImage(herbId, imageId);
      if (result.error) {
        setError(result.error);
      } else if (result.data?.images) {
        setImages(result.data.images);
      }
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  };

  const onSetPrimary = async (imageId: string) => {
    setBusyId(imageId);
    setError(undefined);
    try {
      const result = await setHerbPrimaryImage(herbId, imageId);
      if (result.error) {
        setError(result.error);
      } else if (result.data?.images) {
        setImages(result.data.images);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Ảnh vị thuốc ({images.length}/{MAX_COUNT})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="space-y-1.5 rounded-md border p-2"
              >
                <div className="relative overflow-hidden rounded-md">
                  <img
                    src={img.image_url}
                    alt="Ảnh vị thuốc"
                    className="h-32 w-full object-cover"
                  />
                  {img.is_primary && (
                    <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      <Star className="h-3 w-3" /> Đại diện
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {!img.is_primary && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={busyId === img.id}
                      onClick={() => onSetPrimary(img.id)}
                    >
                      Đặt làm đại diện
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 border-red-300 px-2 text-xs text-red-700 hover:bg-red-50"
                    disabled={busyId === img.id}
                    onClick={() => setConfirmDeleteId(img.id)}
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {previews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <img
                key={i}
                src={src}
                alt="Xem trước ảnh mới"
                className="h-20 w-20 rounded-md border border-dashed object-cover"
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="max-w-xs"
            disabled={remaining <= 0 || uploading}
            onChange={(e) => onFilesChange(e.target.files)}
          />
          <Button
            type="button"
            disabled={selected.length === 0 || uploading || remaining <= 0}
            onClick={onUpload}
            className="bg-emerald-800 hover:bg-emerald-900"
          >
            {uploading ? "Đang tải lên..." : `Tải lên (${selected.length})`}
          </Button>
          {selected.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelected}
            >
              Hủy chọn
            </Button>
          )}
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <p className="text-xs text-stone-500">
          JPG / PNG / WebP, mỗi ảnh tối đa 5MB, tối đa {MAX_COUNT} ảnh / vị thuốc.
          {remaining <= 0
            ? " Đã đủ 5 ảnh — xóa bớt để tải thêm."
            : ""}
        </p>
      </CardContent>

      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" /> Xóa ảnh vị thuốc
            </DialogTitle>
            <DialogDescription>
              Ảnh sẽ bị xóa khỏi hệ thống. Nếu đây là ảnh đại diện, ảnh còn lại
              đầu tiên sẽ lên làm đại diện. Bạn có chắc muốn xóa không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busyId !== null}
              onClick={() => setConfirmDeleteId(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busyId !== null}
              onClick={() => confirmDeleteId && onDelete(confirmDeleteId)}
            >
              {busyId !== null ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
