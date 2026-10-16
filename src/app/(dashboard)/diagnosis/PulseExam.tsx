"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SymptomOption } from "@/features/clinical-cases/actions";

/** 6 vị trí bắt mạch (thốn/quan/xích × trái/phải) + tạng phủ tương ứng */
export const PULSE_POSITIONS = [
  { key: "thon-trai", label: "Thốn trái", organ: "Tâm" },
  { key: "quan-trai", label: "Quan trái", organ: "Can" },
  { key: "xich-trai", label: "Xích trái", organ: "Thận âm" },
  { key: "thon-phai", label: "Thốn phải", organ: "Phế" },
  { key: "quan-phai", label: "Quan phải", organ: "Tỳ / Vị" },
  { key: "xich-phai", label: "Xích phải", organ: "Thận dương / Mệnh môn" },
] as const;

export type PulseSelection = Record<string, string>;

/** Bắt mạch: chọn 1 mạch tượng cho mỗi vị trí. Trả về map vị trí -> symptom_id */
export function PulseExam({
  pulseSymptoms,
  selected,
  onChange,
}: {
  pulseSymptoms: SymptomOption[];
  selected: PulseSelection;
  onChange: (next: PulseSelection) => void;
}) {
  const set = (key: string, symptomId: string) => {
    const next = { ...selected };
    if (symptomId === "none") delete next[key];
    else next[key] = symptomId;
    onChange(next);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PULSE_POSITIONS.map((p) => (
        <div key={p.key} className="space-y-1.5">
          <Label className="text-xs text-stone-500">
            {p.label} <span className="text-stone-400">— {p.organ}</span>
          </Label>
          <Select value={selected[p.key] ?? "none"} onValueChange={(v) => set(p.key, v)}>
            <SelectTrigger>
              <SelectValue placeholder="— Không bắt —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Không bắt —</SelectItem>
              {pulseSymptoms.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
