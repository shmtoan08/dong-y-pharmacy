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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { ActionState } from "@/features/clinical-cases/actions";

interface PatternDraft {
  pattern: string;
  treatment_principle: string;
  symptoms: string;
  template_id: string;
  usage_instruction: string;
  outcome: string;
  discussion: string;
  source: string;
}

const EMPTY_PATTERN: PatternDraft = {
  pattern: "",
  treatment_principle: "",
  symptoms: "",
  template_id: "",
  usage_instruction: "",
  outcome: "",
  discussion: "",
  source: "",
};

/** Form tạo bệnh + nhiều biện chứng (mỗi biện chứng có data riêng) */
export function DiseaseWithCasesForm({
  action,
  diseases,
  templates,
  submitLabel,
  preselectedDiseaseId,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  diseases: { id: string; name: string }[];
  templates: { id: string; name: string; code: string }[];
  submitLabel: string;
  preselectedDiseaseId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const hasPreselected = !!preselectedDiseaseId && diseases.some((d) => d.id === preselectedDiseaseId);
  const [useExisting, setUseExisting] = useState(hasPreselected);
  const [existingDiseaseId, setExistingDiseaseId] = useState(preselectedDiseaseId ?? "");
  const [patterns, setPatterns] = useState<PatternDraft[]>([{ ...EMPTY_PATTERN }]);

  const updatePattern = (idx: number, field: keyof PatternDraft, value: string) => {
    setPatterns((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const addPattern = () => setPatterns((prev) => [...prev, { ...EMPTY_PATTERN }]);
  const removePattern = (idx: number) => {
    if (patterns.length <= 1) return;
    setPatterns((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <form
      action={(fd) => {
        fd.set("patterns", JSON.stringify(patterns));
        fd.set("existing_disease_id", useExisting ? existingDiseaseId : "");
        formAction(fd);
      }}
      className="space-y-6"
    >
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      {/* Bệnh danh */}
      <Card>
        <CardHeader>
          <CardTitle>Bệnh danh</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={!useExisting}
                onChange={() => setUseExisting(false)}
              />
              Bệnh mới
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={useExisting}
                onChange={() => setUseExisting(true)}
              />
              Bệnh đã có
            </label>
          </div>

          {useExisting ? (
            <div className="space-y-2">
              <Label>Chọn bệnh</Label>
              <Select value={existingDiseaseId} onValueChange={setExistingDiseaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bệnh đã có..." />
                </SelectTrigger>
                <SelectContent>
                  {diseases.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="disease_name">Tên bệnh *</Label>
                <Input
                  id="disease_name"
                  name="disease_name"
                  placeholder="VD: Viêm đa khớp dạng thấp"
                  required={!useExisting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disease_description">Mô tả bệnh</Label>
                <Textarea
                  id="disease_description"
                  name="disease_description"
                  placeholder="Mô tả tổng quan về bệnh..."
                  rows={2}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Các biện chứng */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Các biện chứng ({patterns.length})</h2>
          <Button type="button" variant="outline" size="sm" onClick={addPattern}>
            <Plus className="mr-1 h-4 w-4" /> Thêm biện chứng
          </Button>
        </div>

        {patterns.map((p, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Biện chứng {idx + 1}</CardTitle>
              {patterns.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => removePattern(idx)}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Xóa
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Biện chứng *</Label>
                  <Input
                    value={p.pattern}
                    onChange={(e) => updatePattern(idx, "pattern", e.target.value)}
                    placeholder="VD: Thấp nhiệt đọng lại ở khớp"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pháp trị</Label>
                  <Input
                    value={p.treatment_principle}
                    onChange={(e) => updatePattern(idx, "treatment_principle", e.target.value)}
                    placeholder="VD: Thanh nhiệt giải độc, khử thấp hoạt lạc"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Triệu chứng</Label>
                <Textarea
                  value={p.symptoms}
                  onChange={(e) => updatePattern(idx, "symptoms", e.target.value)}
                  placeholder="Mô tả triệu chứng lâm sàng..."
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Bài thuốc</Label>
                  <Select
                    value={p.template_id || "none"}
                    onValueChange={(v) => updatePattern(idx, "template_id", v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn bài thuốc..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Không chọn —</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cách dùng</Label>
                  <Input
                    value={p.usage_instruction}
                    onChange={(e) => updatePattern(idx, "usage_instruction", e.target.value)}
                    placeholder="VD: Sắc uống, mỗi ngày 1 thang"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hiệu quả</Label>
                <Textarea
                  value={p.outcome}
                  onChange={(e) => updatePattern(idx, "outcome", e.target.value)}
                  placeholder="Kết quả điều trị..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Bàn luận</Label>
                <Textarea
                  value={p.discussion}
                  onChange={(e) => updatePattern(idx, "discussion", e.target.value)}
                  placeholder="Phân tích, bàn luận..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Nguồn</Label>
                <Input
                  value={p.source}
                  onChange={(e) => updatePattern(idx, "source", e.target.value)}
                  placeholder="VD: Sách... / Kinh nghiệm..."
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="submit" disabled={pending} className="bg-emerald-800 hover:bg-emerald-900">
        {pending ? "Đang lưu..." : submitLabel}
      </Button>
    </form>
  );
}
