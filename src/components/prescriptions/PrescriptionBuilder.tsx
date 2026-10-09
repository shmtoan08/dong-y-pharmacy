"use client";

import { useActionState, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HerbAutocomplete } from "./HerbAutocomplete";
import {
  createPrescriptionDraft,
  getTemplateItemsForPrescription,
  type ActionState,
} from "@/features/prescriptions/actions";

interface TemplateOption {
  id: string;
  code: string;
  version: number;
  name: string;
}

interface HerbRow {
  herb_id: string | null;
  herb_name: string;
  weight_per_pack: number;
  note: string;
}

export function PrescriptionBuilder({
  visitId,
  templates,
  initialTemplateId,
  initialItems,
  defaultDecoction,
}: {
  visitId: string;
  templates: TemplateOption[];
  initialTemplateId?: string;
  initialItems?: { herb_name: string; dosage_text: string }[];
  defaultDecoction?: string;
}) {
  const [state, formAction] = useActionState(createPrescriptionDraft, {} as ActionState);
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");

  const { register, control, watch, setValue } = useForm<{ items: HerbRow[] }>({
    defaultValues: {
      items: initialItems?.map((it) => ({
        herb_id: null,
        herb_name: it.herb_name,
        weight_per_pack: 12,
        note: "",
      })) ?? [{ herb_id: null, herb_name: "", weight_per_pack: 12, note: "" }],
    },
  });
  const { fields, prepend, remove, replace } = useFieldArray({ control, name: "items" });

  const [numPacks, setNumPacks] = useState(1);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const items = watch("items") as HerbRow[];

  /** Chọn bài mẫu → nạp các vị thuốc của bài mẫu để gia giảm */
  const handleTemplateChange = async (tid: string) => {
    setTemplateId(tid);
    if (!tid) return;
    setLoadingTemplate(true);
    try {
      const tplItems = await getTemplateItemsForPrescription(tid);
      replace(
        tplItems.map((it) => ({
          herb_id: null,
          herb_name: it.herb_name,
          weight_per_pack: 12,
          note: "",
        })),
      );
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleSubmit = (formData: FormData) => {
    const payload = (items ?? []).map((it) => ({
      herb_id: it.herb_id || undefined,
      herb_name: it.herb_name,
      weight_per_pack: Number(it.weight_per_pack) || 0,
      note: it.note || undefined,
    }));
    formData.set("items", JSON.stringify(payload));
    formData.set("visit_id", visitId);
    formData.set("template_id", templateId || "");
    const tpl = templates.find((t) => t.id === templateId);
    formData.set("template_version", tpl ? String(tpl.version) : "");
    formData.set("num_of_packs", String(numPacks));
    formAction(formData);
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kê đơn thuốc</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Bài thuốc mẫu (không bắt buộc)</Label>
              <Select value={templateId} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Kê tay / chọn bài mẫu..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.code} v{t.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingTemplate && (
                <p className="text-xs text-stone-500">Đang nạp vị thuốc...</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="num_of_packs">Số thang *</Label>
              <Input
                id="num_of_packs"
                type="number"
                min={1}
                max={100}
                value={numPacks}
                onChange={(e) => setNumPacks(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="usage_instruction">Cách sắc / cách dùng</Label>
              {defaultDecoction && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const el = document.getElementById("usage_instruction") as HTMLTextAreaElement;
                    if (el) {
                      el.value = defaultDecoction;
                      el.dispatchEvent(new Event("input", { bubbles: true }));
                    }
                  }}
                >
                  📋 Thêm hướng dẫn sắc thuốc chuẩn
                </Button>
              )}
            </div>
            <Textarea
              id="usage_instruction"
              name="usage_instruction"
              rows={2}
              placeholder="VD: Sắc 3 chén còn 1 chén, uống ấm sau ăn..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Các vị thuốc</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => prepend({ herb_id: null, herb_name: "", weight_per_pack: 12, note: "" })}
          >
            <Plus className="mr-1 h-4 w-4" /> Thêm vị
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header bảng — ẩn trên mobile */}
          <div className="hidden grid-cols-[1fr_120px_1fr_40px] gap-2 text-xs font-medium text-stone-500 md:grid">
            <span>Tên vị thuốc *</span>
            <span>Liều (gam/thang) *</span>
            <span>Ghi chú</span>
            <span />
          </div>
          {fields.map((field, i) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-2 rounded-lg border border-stone-200 p-3 md:grid-cols-[1fr_120px_1fr_40px] md:border-0 md:p-0"
            >
              <HerbAutocomplete
                name={`items.${i}.herb_name`}
                defaultValue={field.herb_name}
                placeholder="Tên vị thuốc"
                onHerbChange={(herbId, herbName) => {
                  setValue(`items.${i}.herb_id`, herbId, { shouldDirty: true });
                  setValue(`items.${i}.herb_name`, herbName, { shouldDirty: true });
                }}
              />
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="gam/thang"
                {...register(`items.${i}.weight_per_pack`, { valueAsNumber: true })}
              />
              <Input
                placeholder="Ghi chú"
                {...register(`items.${i}.note`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700"
                onClick={() => remove(i)}
                disabled={fields.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-stone-500">
            Tổng liều ước tính:{" "}
            {((items ?? []).reduce((s, it) => s + (Number(it.weight_per_pack) || 0), 0) * numPacks).toFixed(1)}{" "}
            gam cho {numPacks} thang
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-4">
          <Label htmlFor="doctor_notes">Ghi chú của thầy thuốc</Label>
          <Textarea id="doctor_notes" name="doctor_notes" rows={2} />
        </CardContent>
      </Card>

      {state.error && (
        <p className="text-sm font-medium text-red-600">{state.error}</p>
      )}

      <Button type="submit" className="bg-emerald-800 hover:bg-emerald-900">
        Tạo đơn nháp
      </Button>
    </form>
  );
}
