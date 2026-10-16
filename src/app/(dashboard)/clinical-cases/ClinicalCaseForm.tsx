"use client";

import { useActionState, useState } from "react";
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
import type { ActionState, SymptomOption } from "@/features/clinical-cases/actions";
import { SymptomPicker } from "./SymptomPicker";

export interface ClinicalCaseFormData {
  pattern: string | null;
  treatment_principle: string | null;
  symptoms: string | null;
  template_id: string | null;
  usage_instruction: string | null;
  outcome: string | null;
  discussion: string | null;
  source: string | null;
}

/** Form sửa 1 biện chứng (bệnh danh không sửa ở đây) */
export function ClinicalCaseForm({
  action,
  initial,
  templates,
  symptoms,
  initialSymptomIds,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: ClinicalCaseFormData;
  templates: { id: string; name: string; code: string }[];
  symptoms: SymptomOption[];
  initialSymptomIds?: string[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [templateId, setTemplateId] = useState(initial?.template_id ?? "");
  const [symptomIds, setSymptomIds] = useState<string[]>(initialSymptomIds ?? []);

  return (
    <form
      action={(fd) => {
        fd.set("symptom_ids", JSON.stringify(symptomIds));
        formAction(fd);
      }}
      className="space-y-6"
    >
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pattern">Biện chứng *</Label>
          <Input
            id="pattern"
            name="pattern"
            defaultValue={initial?.pattern ?? ""}
            placeholder="VD: Thấp nhiệt đọng lại ở khớp"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="treatment_principle">Pháp trị</Label>
          <Input
            id="treatment_principle"
            name="treatment_principle"
            defaultValue={initial?.treatment_principle ?? ""}
            placeholder="VD: Thanh nhiệt giải độc, khử thấp hoạt lạc"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="symptoms">Triệu chứng</Label>
        <Textarea
          id="symptoms"
          name="symptoms"
          defaultValue={initial?.symptoms ?? ""}
          placeholder="Mô tả triệu chứng lâm sàng..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Tag triệu chứng (để chẩn đoán tìm thấy)</Label>
        <SymptomPicker symptoms={symptoms} selected={symptomIds} onChange={setSymptomIds} />
      </div>

      <div className="space-y-2">
        <Label>Bài thuốc</Label>
        <input type="hidden" name="template_id" value={templateId} />
        <Select value={templateId || "none"} onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Chọn bài thuốc (không bắt buộc)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Không chọn bài thuốc —</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} ({t.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="usage_instruction">Cách dùng</Label>
        <Input
          id="usage_instruction"
          name="usage_instruction"
          defaultValue={initial?.usage_instruction ?? ""}
          placeholder="VD: Sắc uống, mỗi ngày 1 thang"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outcome">Hiệu quả</Label>
        <Textarea
          id="outcome"
          name="outcome"
          defaultValue={initial?.outcome ?? ""}
          placeholder="Kết quả điều trị..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="discussion">Bàn luận</Label>
        <Textarea
          id="discussion"
          name="discussion"
          defaultValue={initial?.discussion ?? ""}
          placeholder="Phân tích, bàn luận về ca bệnh và bài thuốc..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="source">Nguồn</Label>
        <Input
          id="source"
          name="source"
          defaultValue={initial?.source ?? ""}
          placeholder="VD: Sách... / Kinh nghiệm..."
        />
      </div>

      <Button type="submit" disabled={pending} className="bg-emerald-800 hover:bg-emerald-900">
        {pending ? "Đang lưu..." : submitLabel}
      </Button>
    </form>
  );
}
