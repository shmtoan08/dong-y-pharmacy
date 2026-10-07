"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { patientSchema, type PatientInput } from "@/features/patients/schemas";
import type { ActionState } from "@/features/patients/actions";
import { cn } from "@/lib/utils";

interface PatientFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Partial<PatientInput>;
  submitLabel: string;
}

/** Format SĐT: 0901234567 → 0901 234 567 */
function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

export function PatientForm({ action, initial, submitLabel }: PatientFormProps) {
  const [serverError, setServerError] = useState<string | undefined>();

  const form = useForm<PatientInput>({
    resolver: zodResolver(patientSchema),
    mode: "onTouched", // hiện lỗi khi rời field, không làm phiền lúc đang gõ
    defaultValues: {
      full_name: "",
      date_of_birth: "",
      sex: undefined,
      phone: "",
      address: "",
      medical_history: "",
      allergies: "",
      ...initial,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const sex = watch("sex");
  const dob = watch("date_of_birth") ?? "";
  const [dobD, dobM, dobY] = dob ? dob.split("-").reverse() : ["", "", ""];
  const [phone, setPhone] = useState(initial?.phone ? formatPhone(initial.phone) : "");

  const setDobPart = (part: "d" | "m" | "y", val: string) => {
    const num = val.replace(/\D/g, "");
    const cur = { d: dobD, m: dobM, y: dobY };
    cur[part] = num;
    if (cur.d && cur.m && cur.y.length === 4) {
      const iso = `${cur.y}-${cur.m.padStart(2, "0")}-${cur.d.padStart(2, "0")}`;
      setValue("date_of_birth", iso, { shouldValidate: true });
    } else {
      setValue("date_of_birth", "", { shouldValidate: false });
    }
  };

  const onSubmit = async (values: PatientInput) => {
    setServerError(undefined);
    const formData = new FormData();
    formData.set("full_name", values.full_name);
    if (values.date_of_birth) formData.set("date_of_birth", values.date_of_birth);
    if (values.sex) formData.set("sex", values.sex);
    if (values.phone) formData.set("phone", values.phone.replace(/\s/g, ""));
    if (values.address) formData.set("address", values.address);
    if (values.medical_history) formData.set("medical_history", values.medical_history);
    if (values.allergies) formData.set("allergies", values.allergies);
    const result = await action({}, formData);
    if (result.error) {
      // Lỗi server: giữ nguyên dữ liệu đã nhập, chỉ hiện thông báo
      setServerError(result.error);
    }
  };

  const err = (name: keyof PatientInput) =>
    errors[name] ? (
      <p className="text-xs font-medium text-red-600">{errors[name]?.message as string}</p>
    ) : null;

  // Viền đỏ khi field có lỗi
  const inputCls = (name: keyof PatientInput) =>
    cn(errors[name] && "border-red-500 focus-visible:ring-red-500");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="max-w-2xl">
        <CardHeader className="pb-3">
          <CardTitle>Thông tin bệnh nhân</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Họ tên *</Label>
              <Input
                id="full_name"
                maxLength={100}
                placeholder="Nguyễn Văn A"
                className={inputCls("full_name")}
                {...register("full_name")}
              />
              {err("full_name")}
            </div>
            {/* Ngày sinh: 3 ô số thay cho date picker (dễ chọn năm sinh xa) */}
            <div className="space-y-1.5">
              <Label>Ngày sinh</Label>
              <div className="flex gap-2">
                <Input
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="Ngày"
                  aria-label="Ngày sinh"
                  className={cn("text-center", inputCls("date_of_birth"))}
                  defaultValue={dobD}
                  onChange={(e) => setDobPart("d", e.target.value)}
                />
                <Input
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="Tháng"
                  aria-label="Tháng sinh"
                  className={cn("text-center", inputCls("date_of_birth"))}
                  defaultValue={dobM}
                  onChange={(e) => setDobPart("m", e.target.value)}
                />
                <Input
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Năm"
                  aria-label="Năm sinh"
                  className={cn("text-center", inputCls("date_of_birth"))}
                  defaultValue={dobY}
                  onChange={(e) => setDobPart("y", e.target.value)}
                />
              </div>
              {err("date_of_birth")}
            </div>
          </div>

          {/* Giới tính: radio dễ bấm trên mobile hơn dropdown */}
          <div className="space-y-1.5">
            <Label>Giới tính</Label>
            <div className="flex gap-2" role="radiogroup" aria-label="Giới tính">
              {[
                { value: "male", label: "Nam" },
                { value: "female", label: "Nữ" },
                { value: "other", label: "Khác" },
              ].map((o) => (
                <label
                  key={o.value}
                  className={cn(
                    "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                    sex === o.value
                      ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300",
                  )}
                >
                  <input
                    type="radio"
                    name="sex-radio"
                    value={o.value}
                    checked={sex === o.value}
                    onChange={() =>
                      setValue("sex", o.value as "male" | "female" | "other", {
                        shouldValidate: true,
                      })
                    }
                    className="sr-only"
                  />
                  {o.label}
                </label>
              ))}
            </div>
            {err("sex")}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                inputMode="tel"
                maxLength={13}
                placeholder="0901 234 567"
                className={inputCls("phone")}
                value={phone}
                onChange={(e) => {
                  const f = formatPhone(e.target.value);
                  setPhone(f);
                  setValue("phone", f.replace(/\s/g, ""), { shouldValidate: true });
                }}
              />
              {err("phone")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                maxLength={255}
                className={inputCls("address")}
                {...register("address")}
              />
              {err("address")}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="medical_history">Tiền sử bệnh</Label>
            <Textarea
              id="medical_history"
              rows={2}
              placeholder="Các bệnh đã/đang mắc, phẫu thuật..."
              className={inputCls("medical_history")}
              {...register("medical_history")}
            />
            {err("medical_history")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="allergies">Dị ứng</Label>
            <Textarea
              id="allergies"
              rows={2}
              placeholder="Dị ứng thuốc, thức ăn..."
              className={inputCls("allergies")}
              {...register("allergies")}
            />
            {err("allergies")}
          </div>

          {serverError && (
            <p className="text-sm font-medium text-red-600">{serverError}</p>
          )}

          {/* Nút full-width trên mobile */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-800 hover:bg-emerald-900 md:w-auto"
          >
            {isSubmitting ? "Đang lưu..." : submitLabel}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
