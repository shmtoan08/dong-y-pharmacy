"use client";

import { useState } from "react";
import Link from "next/link";
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
}

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

export function HerbForm({ action, initial, submitLabel, allowStay }: HerbFormProps) {
  const [serverError, setServerError] = useState<string | undefined>();
  const [savedMsg, setSavedMsg] = useState<string | undefined>();
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

  const doSubmit = async (values: z.input<typeof herbSchema>, stay: boolean) => {
    setServerError(undefined);
    setSavedMsg(undefined);
    const formData = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (typeof v === "boolean") {
        if (v) formData.set(k, "on");
      } else if (v) {
        formData.set(k, String(v));
      }
    }
    if (stay) formData.set("_stay", "1");
    const result = await action({}, formData);
    if (result.error) {
      setServerError(result.error);
    } else if (result.ok && stay) {
      setSavedMsg(`Đã lưu ${result.code} — ${result.name}. Nhập tiếp vị thuốc mới.`);
      reset({
        name_common: "", name_han_viet: "", name_science: "", used_part: "",
        property_tinh: "", property_vi: "", quy_kinh: "", cong_nang: "",
        kieng_ky: "", vi_tri_hoc_tu: "",
        base_unit: "gram", price_per_unit: undefined,
        min_stock_quantity: 0, is_valuable: false,
      });
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
