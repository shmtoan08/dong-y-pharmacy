"use client";

import { useActionState, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { createFormulaSchema, CATEGORY_LABEL } from "@/features/formulas/schemas";
import type { CreateFormulaInput } from "@/features/formulas/schemas";
import { createFormula, updateFormula } from "@/features/formulas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HerbNameAutocomplete } from "@/components/shared/HerbNameAutocomplete";

interface FormulaFormProps {
  mode: "create" | "edit";
  editId?: string;
  defaultValues?: Partial<CreateFormulaInput>;
}

type DosageUnit = "g" | "chỉ" | "lượng";

export function FormulaForm({ mode, editId, defaultValues }: FormulaFormProps) {
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [defaultUnit, setDefaultUnit] = useState<DosageUnit>("g");

  const form = useForm<CreateFormulaInput>({
    resolver: zodResolver(createFormulaSchema),
    defaultValues: {
      name: "",
      category: "co_phuong",
      source_book: "",
      syndrome: "",
      indications: "",
      usage_note: "",
      items: [{ herb_name: "", dosage_text: "", note: "" }],
      ...defaultValues,
    },
  });

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const action = async (_prev: { error?: string }, formData: FormData) => {
    // Validate client trước
    const values = form.getValues();
    const parsed = createFormulaSchema.safeParse(values);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Dữ liệu chưa hợp lệ";
      setSubmitError(msg);
      return { error: msg };
    }
    setSubmitError(undefined);
    // Gửi items dưới dạng JSON
    formData.set("items", JSON.stringify(parsed.data.items));
    if (mode === "create") {
      return createFormula(_prev, formData);
    }
    return updateFormula(editId!, _prev, formData);
  };

  const [state, formAction, pending] = useActionState(action, {});

  // Gõ số lượng rồi rời ô → tự điền đơn vị mặc định (12 → 12g).
  // Đã có đơn vị (12g, 12 chỉ, ...) thì giữ nguyên.
  const autoFillUnit = (i: number) => {
    const v = (form.getValues(`items.${i}.dosage_text`) ?? "").trim();
    if (/^\d+(\.\d+)?$/.test(v)) {
      form.setValue(`items.${i}.dosage_text`, `${v}${defaultUnit}`, { shouldDirty: true });
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Thông tin bài thuốc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Tên bài thuốc *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Lục Vị Địa Hoàng Hoàn"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Phân loại *</Label>
              <Select
                defaultValue={form.getValues("category")}
                onValueChange={(v) =>
                  form.setValue("category", v as CreateFormulaInput["category"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABEL).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                name="category"
                value={form.watch("category")}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source_book">Nguồn / Sách</Label>
              <Input
                id="source_book"
                {...form.register("source_book")}
                placeholder="Thương Hàn Luận"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="syndrome">Hội chứng</Label>
              <Input
                id="syndrome"
                {...form.register("syndrome")}
                placeholder="Thận âm hư"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="indications">Chỉ định</Label>
            <Textarea
              id="indications"
              {...form.register("indications")}
              rows={2}
              placeholder="Các triệu chứng, bệnh phù hợp..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="usage_note">Cách dùng</Label>
            <Textarea
              id="usage_note"
              {...form.register("usage_note")}
              rows={2}
              placeholder="Sắc uống ngày 1 thang..."
            />
          </div>

          {/* Hidden inputs cho các field text để Server Action đọc */}
          <input type="hidden" name="name" value={form.watch("name")} />
          <input type="hidden" name="source_book" value={form.watch("source_book")} />
          <input type="hidden" name="syndrome" value={form.watch("syndrome")} />
          <input type="hidden" name="indications" value={form.watch("indications")} />
          <input type="hidden" name="usage_note" value={form.watch("usage_note")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Vị thuốc ({fields.length})
            {mode === "edit" && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                — lưu sẽ tạo version mới
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Đơn vị:</Label>
            <Select
              value={defaultUnit}
              onValueChange={(v) => setDefaultUnit(v as DosageUnit)}
            >
              <SelectTrigger className="w-[84px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="chỉ">chỉ</SelectItem>
                <SelectItem value="lượng">lượng</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => prepend({ herb_name: "", dosage_text: "", note: "" })}
            >
              <Plus className="mr-1 h-4 w-4" /> Thêm vị
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, i) => (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_100px_1fr_auto] items-start gap-2"
            >
              <div className="space-y-1">
                <HerbNameAutocomplete
                  value={form.watch(`items.${i}.herb_name`) ?? ""}
                  onChange={(v) =>
                    form.setValue(`items.${i}.herb_name`, v, { shouldDirty: true })
                  }
                  placeholder={`Vị ${i + 1}: Hoàng Kỳ`}
                />
                {form.formState.errors.items?.[i]?.herb_name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.items[i]?.herb_name?.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Input
                  {...form.register(`items.${i}.dosage_text`)}
                  placeholder={`12${defaultUnit}`}
                  onBlur={() => autoFillUnit(i)}
                />
                {form.formState.errors.items?.[i]?.dosage_text && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.items[i]?.dosage_text?.message}
                  </p>
                )}
              </div>
              <Input
                {...form.register(`items.${i}.note`)}
                placeholder="Ghi chú (sao, tẩm...)"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={fields.length <= 1}
                onClick={() => remove(i)}
                title="Xóa vị"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {form.formState.errors.items?.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.items.root.message}
            </p>
          )}
        </CardContent>
      </Card>

      {(state.error || submitError) && (
        <p className="text-sm text-destructive" role="alert">
          {state.error ?? submitError}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Đang lưu…"
            : mode === "create"
              ? "Tạo bài thuốc"
              : "Lưu version mới"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/formulas">Hủy</Link>
        </Button>
      </div>
    </form>
  );
}
