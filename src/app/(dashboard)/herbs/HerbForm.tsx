"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { herbSchema, type HerbInput } from "@/features/herbs/schemas";
import { z } from "zod";
import type { ActionState } from "@/features/herbs/actions";
import { uploadHerbImages } from "@/features/herbs/actions";
import { cn } from "@/lib/utils";

const TINH_OPTIONS = ["Hàn", "Nhiệt", "Ôn", "Lương", "Bình"];
const VI_OPTIONS = ["Ngọt", "Cay", "Đắng", "Chua", "Mặn", "Nhạt", "Chát"];
const QUY_KINH_OPTIONS = [
  "Tâm", "Can", "Tỳ", "Phế", "Thận",
  "Tâm bào", "Tiểu trường", "Đởm", "Vị", "Đại trường",
  "Bàng quang", "Tam tiêu",
];

interface HerbFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Partial<HerbInput & { quy_kinh_text?: string }>;
  submitLabel: string;
  /** true = trang thêm mới (có nút Lưu & Thêm tiếp) */
  allowStay?: boolean;
  /** true = trang thêm mới: cho chọn ảnh, tạo xong tự upload */
  enableImage?: boolean;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB

const EMPTY_VALUES = {
  name_common: "", name_han_viet: "", name_science: "", used_part: "",
  property_tinh: "", property_vi: "", quy_kinh: "", cong_nang: "",
  kieng_ky: "", vi_tri_hoc_tu: "",
  base_unit: "gram", price_per_unit: undefined,
  min_stock_quantity: 0, is_valuable: false,
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-emerald-700 bg-emerald-700 text-white"
          : "border-stone-300 bg-white text-stone-600 hover:border-emerald-500 hover:text-emerald-700",
      )}
    >
      {children}
    </button>
  );
}

export function HerbForm({ action, initial, submitLabel, allowStay, enableImage }: HerbFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | undefined>();
  const [savedMsg, setSavedMsg] = useState<string | undefined>();
  // Anh vi thuoc (chi trang Them moi): chon truoc (toi da 5), tao xong tu upload.
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | undefined>();
  const [createdHerbId, setCreatedHerbId] = useState<string | null>(null);
  const [createdHerbStay, setCreatedHerbStay] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof herbSchema>>({
    resolver: zodResolver(herbSchema),
    mode: "onTouched",
    defaultValues: {
      name_common: "",
      name_han_viet: "",
      name_science: "",
      used_part: "",
      property_tinh: "",
      property_vi: "",
      quy_kinh: "",
      cong_nang: "",
      kieng_ky: "",
      vi_tri_hoc_tu: "",
      base_unit: "gram",
      price_per_unit: undefined,
      min_stock_quantity: 0,
      is_valuable: false,
      ...initial,
    },
  });

  const tinhVal = watch("property_tinh") ?? "";
  const viVals = (watch("property_vi") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const qkVals = (watch("quy_kinh") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const toggleMulti = (field: "property_vi" | "quy_kinh", value: string) => {
    const cur = field === "property_vi" ? viVals : qkVals;
    const next = cur.includes(value)
      ? cur.filter((v) => v !== value)
      : [...cur, value];
    setValue(field, next.join(", "), { shouldValidate: true });
  };

  const clearImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setImageError(undefined);
    setCreatedHerbId(null);
    if (imageFileRef.current) imageFileRef.current.value = "";
  };

  const onImagesChange = (files: FileList | null) => {
    setImageError(undefined);
    setCreatedHerbId(null);
    if (!files) return;
    const picked = Array.from(files);
    for (const f of picked) {
      if (!IMAGE_TYPES.includes(f.type)) {
        setImageError(`File "${f.name}" không phải JPG/PNG/WebP.`);
        return;
      }
      if (f.size > IMAGE_MAX_SIZE) {
        setImageError(`File "${f.name}" vượt quá 5MB.`);
        return;
      }
    }
    if (imageFiles.length + picked.length > 5) {
      setImageError(`Tối đa 5 ảnh / vị thuốc (đã chọn ${imageFiles.length}).`);
      return;
    }
    setImageFiles((prev) => [...prev, ...picked]);
    setImagePreviews((prev) => [
      ...prev,
      ...picked.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removeImageAt = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  /** Upload tat ca anh da chon cho vi thuoc vua tao. Tra ve true neu thanh cong. */
  const uploadImagesFor = async (herbId: string, files: File[]): Promise<boolean> => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append("images", f);
      const res = await uploadHerbImages(herbId, fd);
      if (res.error) {
        setImageError(res.error);
        return false;
      }
      return true;
    } finally {
      setUploadingImage(false);
    }
  };

  const retryUpload = async () => {
    if (!createdHerbId || imageFiles.length === 0) return;
    const ok = await uploadImagesFor(createdHerbId, imageFiles);
    if (ok) {
      if (createdHerbStay) {
        setSavedMsg("Đã lưu vị thuốc kèm ảnh. Nhập tiếp vị thuốc mới.");
        clearImages();
        reset(EMPTY_VALUES);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push(`/herbs/${createdHerbId}`);
      }
    }
  };

  const doSubmit = async (values: z.input<typeof herbSchema>, stay: boolean) => {
    setServerError(undefined);
    setSavedMsg(undefined);
    setImageError(undefined);
    setCreatedHerbId(null);
    const formData = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (typeof v === "boolean") {
        if (v) formData.set(k, "on");
      } else if (v) {
        formData.set(k, String(v));
      }
    }
    // Co anh da chon: dung luong stay de lay id vi moi tao, roi tu upload anh.
    const withImage = Boolean(enableImage && imageFiles.length > 0);
    if (stay || withImage) formData.set("_stay", "1");
    const result = await action({}, formData);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    if (withImage) {
      const herbId = (result.data as { id?: string } | undefined)?.id;
      if (!herbId) {
        setServerError("Đã lưu vị thuốc nhưng không lấy được mã để tải ảnh.");
        return;
      }
      setCreatedHerbId(herbId);
      setCreatedHerbStay(stay);
      const ok = await uploadImagesFor(herbId, imageFiles);
      if (ok) {
        if (stay) {
          setSavedMsg(`Đã lưu ${result.code} — ${result.name} kèm ảnh. Nhập tiếp vị thuốc mới.`);
          clearImages();
          reset(EMPTY_VALUES);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          router.push(`/herbs/${herbId}`);
        }
      }
      // Upload loi: giu nguyen form + hien box Thu lai (vi thuoc da duoc luu).
      return;
    }
    if (result.ok && stay) {
      setSavedMsg(`Đã lưu ${result.code} — ${result.name}. Nhập tiếp vị thuốc mới.`);
      reset(EMPTY_VALUES);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // redirect (không stay) do server action thực hiện
  };

  const err = (name: keyof HerbInput) =>
    errors[name] ? (
      <p className="text-xs font-medium text-red-600">{errors[name]?.message as string}</p>
    ) : null;
  const inputCls = (name: keyof HerbInput) =>
    cn(errors[name] && "border-red-500 focus-visible:ring-red-500");

  return (
    <form onSubmit={handleSubmit((v) => doSubmit(v, false))}>
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cột trái: thông tin Đông y */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Định danh dược liệu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name_common">Tên thường gọi *</Label>
                  <Input id="name_common" maxLength={100} placeholder="Hoàng Kỳ"
                    className={inputCls("name_common")} {...register("name_common")} />
                  {err("name_common")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name_han_viet">Tên Hán Việt</Label>
                  <Input id="name_han_viet" maxLength={100} placeholder="黃耆"
                    {...register("name_han_viet")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name_science">Tên khoa học</Label>
                  <Input id="name_science" maxLength={200} placeholder="Astragalus membranaceus"
                    {...register("name_science")} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="used_part">Bộ phận dùng</Label>
                  <Input id="used_part" maxLength={100} placeholder="rễ"
                    {...register("used_part")} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-emerald-700" {...register("is_valuable")} />
                    Thuốc quý
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thuộc tính Đông y</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
              <div className="space-y-2">
                <Label>Tính khí (chọn 1)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TINH_OPTIONS.map((t) => (
                    <Chip
                      key={t}
                      active={tinhVal === t}
                      onClick={() =>
                        setValue("property_tinh", tinhVal === t ? "" : t, { shouldValidate: true })
                      }
                    >
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ngũ vị (chọn nhiều)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {VI_OPTIONS.map((v) => (
                    <Chip
                      key={v}
                      active={viVals.includes(v)}
                      onClick={() => toggleMulti("property_vi", v)}
                    >
                      {v}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quy kinh (chọn nhiều)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {QUY_KINH_OPTIONS.map((k) => (
                    <Chip
                      key={k}
                      active={qkVals.includes(k)}
                      onClick={() => toggleMulti("quy_kinh", k)}
                    >
                      {k}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cong_nang">Công năng & Chủ trị</Label>
                <Textarea id="cong_nang" rows={3}
                  placeholder="Bổ khí cố biểu, thác độc bài nùng..."
                  {...register("cong_nang")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kieng_ky">Kiêng kỵ & Chống chỉ định</Label>
                <Textarea id="kieng_ky" rows={3}
                  placeholder="VD: Thực chứng, nhiệt chứng, âm hư hỏa vượng không nên dùng; kỵ thai..."
                  {...register("kieng_ky")} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: kho & đơn giá */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kho dược liệu & Đơn giá</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 md:p-6 md:pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="base_unit">ĐVT *</Label>
                  <Input id="base_unit" maxLength={20} placeholder="gram"
                    {...register("base_unit")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="price_per_unit">Đơn giá (đ/ĐVT)</Label>
                  <Input id="price_per_unit" type="number" min={0} step={1}
                    placeholder="1525" {...register("price_per_unit")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min_stock_quantity">Ngưỡng sắp hết</Label>
                  <Input id="min_stock_quantity" type="number" min={0} step={0.01}
                    placeholder="500" {...register("min_stock_quantity")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vi_tri_hoc_tu">Vị trí hộc tủ thuốc</Label>
                <Input id="vi_tri_hoc_tu" maxLength={100} placeholder="Tủ A - Ngăn 12"
                  {...register("vi_tri_hoc_tu")} />
              </div>
            </CardContent>
          </Card>

          {enableImage && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ảnh vị thuốc</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0 md:p-6 md:pt-0">
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative">
                        <img
                          src={src}
                          alt="Xem trước ảnh vị thuốc"
                          className="h-20 w-20 rounded-md border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImageAt(i)}
                          aria-label="Bỏ ảnh này"
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white"
                        >
                          ×
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 rounded bg-amber-500 px-1 py-0.5 text-[10px] font-semibold text-white">
                            Đại diện
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Input
                  ref={imageFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => onImagesChange(e.target.files)}
                />
                {imageError && !createdHerbId && (
                  <p className="text-xs font-medium text-red-600">{imageError}</p>
                )}
                <p className="text-xs text-stone-500">
                  Không bắt buộc. JPG / PNG / WebP, mỗi ảnh tối đa 5MB, tối đa 5
                  ảnh / vị thuốc. Ảnh đầu tiên làm ảnh đại diện. Ảnh được tải
                  lên sau khi lưu vị thuốc.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {serverError && (
        <p className="mt-4 text-sm font-medium text-red-600">{serverError}</p>
      )}
      {savedMsg && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          {savedMsg}
        </p>
      )}
      {createdHerbId && imageError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-700">
            Vị thuốc đã được lưu nhưng tải ảnh lên thất bại: {imageError}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={retryUpload}
              disabled={uploadingImage || imageFiles.length === 0}
              className="bg-emerald-800 hover:bg-emerald-900"
            >
              {uploadingImage ? "Đang thử lại..." : "Thử lại"}
            </Button>
            <Link href={`/herbs/${createdHerbId}`}>
              <Button type="button" variant="outline" size="sm">
                Xem vị thuốc
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Link href="/herbs">
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Hủy
          </Button>
        </Link>
        {allowStay && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleSubmit((v) => doSubmit(v, true))}
            className="border-emerald-700 text-emerald-700 hover:bg-emerald-50"
          >
            {isSubmitting ? "Đang lưu..." : "Lưu & Thêm tiếp"}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-emerald-800 hover:bg-emerald-900"
        >
          {isSubmitting ? "Đang lưu..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
