"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { uploadHerbImage } from "@/features/herbs/actions";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** Upload ảnh vị thuốc lên R2 (trang Sửa vị thuốc). */
export function HerbImageUpload({
  herbId,
  initialImageUrl,
}: {
  herbId: string;
  initialImageUrl: string | null;
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFileChange = (file: File | undefined) => {
    setError(undefined);
    if (!file) {
      setPreview(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
      setPreview(null);
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Ảnh tối đa 5MB.");
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  const onUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(undefined);
    try {
      const formData = new FormData();
      formData.set("image", file);
      const result = await uploadHerbImage(herbId, formData);
      if (result.error) {
        setError(result.error);
      } else if (result.data?.image_url) {
        setImageUrl(result.data.image_url);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ảnh vị thuốc</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(preview ?? imageUrl) && (
          <div className="relative h-40 w-40 overflow-hidden rounded-md border">
            <Image
              src={preview ?? imageUrl!}
              alt="Ảnh vị thuốc"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="max-w-xs"
            onChange={(e) => onFileChange(e.target.files?.[0])}
          />
          <Button
            type="button"
            disabled={!preview || uploading}
            onClick={onUpload}
            className="bg-emerald-800 hover:bg-emerald-900"
          >
            {uploading ? "Đang tải lên..." : "Tải ảnh lên"}
          </Button>
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <p className="text-xs text-stone-500">
          JPG / PNG / WebP, tối đa 5MB. Upload lại sẽ ghi đè ảnh cũ.
        </p>
      </CardContent>
    </Card>
  );
}
