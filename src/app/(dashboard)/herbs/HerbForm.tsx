"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { herbSchema, type HerbInput } from "@/features/herbs/schemas";
import type { ActionState } from "@/features/herbs/actions";
import { cn } from "@/lib/utils";

interface HerbFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Partial<HerbInput & { quy_kinh_text?: string }>;
  submitLabel: string;
}

export function HerbForm({ action, initial, submitLabel }: HerbFormProps) {
  const [serverError, setServerError] = useState<string | undefined>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HerbInput>({
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
      base_unit: "gram",
      is_valuable: false,
      ...initial,
    },
  });

  const onSubmit = async (values: HerbInput) => {
    setServerError(undefined);
    const formData = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (typeof v === "boolean") {
        if (v) formData.set(k, "on");
      } else if (v) {
        formData.set(k, String(v));
      }
    }
    const result = await action({}, formData);
    if (result.error) setServerError(result.error);
  };

  const err = (name: keyof HerbInput) =>
    errors[name] ? (
      <p className="text-xs font-medium text-red-600">{errors[name]?.message as string}</p>
    ) : null;
  const inputCls = (name: keyof HerbInput) =>
    cn(errors[name] && "border-red-500 focus-visible:ring-red-500");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="max-w-2xl">
        <CardHeader className="pb-3">
          <CardTitle>Thông tin vị thuốc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name_common">Tên thường gọi *</Label>
              <Input id="name_common" maxLength={100} placeholder="Hoàng Kỳ"
                className={inputCls("name_common")} {...register("name_common")} />
              {err("name_common")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name_han_viet">Tên Hán Việt</Label>
              <Input id="name_han_viet" maxLength={100} {...register("name_han_viet")} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name_science">Tên khoa học</Label>
              <Input id="name_science" maxLength={200} placeholder="Astragalus membranaceus"
                {...register("name_science")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="used_part">Bộ phận dùng</Label>
              <Input id="used_part" maxLength={100} placeholder="rễ"
                {...register("used_part")} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="property_tinh">Tính</Label>
              <Input id="property_tinh" maxLength={50} placeholder="ôn"
                {...register("property_tinh")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="property_vi">Vị</Label>
              <Input id="property_vi" maxLength={50} placeholder="ngọt"
                {...register("property_vi")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quy_kinh">Quy kinh</Label>
              <Input id="quy_kinh" maxLength={200} placeholder="tỳ, phế"
                {...register("quy_kinh")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cong_nang">Công năng</Label>
            <Textarea id="cong_nang" rows={3} {...register("cong_nang")} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="base_unit">Đơn vị tính</Label>
              <Input id="base_unit" maxLength={20} {...register("base_unit")} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...register("is_valuable")} />
                Thuốc quý
              </label>
            </div>
          </div>

          {serverError && (
            <p className="text-sm font-medium text-red-600">{serverError}</p>
          )}

          <Button type="submit" disabled={isSubmitting}
            className="w-full bg-emerald-800 hover:bg-emerald-900 md:w-auto">
            {isSubmitting ? "Đang lưu..." : submitLabel}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
