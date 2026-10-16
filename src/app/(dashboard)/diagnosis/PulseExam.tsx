"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, RotateCcw } from "lucide-react";
import type { SymptomOption } from "@/features/clinical-cases/actions";
import { cn } from "@/lib/utils";

/** 6 vị trí bắt mạch (thốn/quan/xích × trái/phải) + tạng phủ tương ứng */
export const PULSE_POSITIONS_LEFT = [
  { key: "thon-trai", label: "Thốn trái", organ: "Tâm" },
  { key: "quan-trai", label: "Quan trái", organ: "Can / Đởm" },
  { key: "xich-trai", label: "Xích trái", organ: "Thận âm" },
] as const;

export const PULSE_POSITIONS_RIGHT = [
  { key: "thon-phai", label: "Thốn phải", organ: "Phế" },
  { key: "quan-phai", label: "Quan phải", organ: "Tỳ / Vị" },
  { key: "xich-phai", label: "Xích phải", organ: "Thận dương / Mệnh môn" },
] as const;

export type PulseSelection = Record<string, string>;

/** Bắt mạch trực quan 2 cổ tay: chọn mạch tượng cho từng bộ vị thốn/quan/xích */
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
    if (!symptomId || symptomId === "none") {
      delete next[key];
    } else {
      next[key] = symptomId;
    }
    onChange(next);
  };

  const clearAllPulse = () => {
    onChange({});
  };

  const selectedCount = Object.keys(selected).length;

  const renderPositionBox = (p: { key: string; label: string; organ: string }) => {
    const activeSymptomId = selected[p.key];
    const activeSymptom = pulseSymptoms.find((s) => s.id === activeSymptomId);

    return (
      <div
        key={p.key}
        className={cn(
          "rounded-lg border p-2.5 transition-all text-xs space-y-2",
          activeSymptom
            ? "border-emerald-300 bg-emerald-50/50 shadow-2xs"
            : "border-stone-200 bg-white hover:border-stone-300"
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold text-stone-800">{p.label}</span>
            <span className="ml-1.5 text-stone-500 font-normal">({p.organ})</span>
          </div>
          {activeSymptom && (
            <button
              type="button"
              onClick={() => set(p.key, "none")}
              className="text-stone-400 hover:text-red-600 transition-colors p-0.5"
              title="Bỏ bắt vị trí này"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown chọn mạch đầy đủ */}
        <Select
          value={activeSymptomId ?? "none"}
          onValueChange={(v) => set(p.key, v)}
        >
          <SelectTrigger className="h-8 text-xs bg-stone-50/50 border-stone-200">
            <SelectValue placeholder="— Chọn mạch tượng —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs text-stone-400">
              — Không bắt / Bình thường —
            </SelectItem>
            {pulseSymptoms.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Chips chọn nhanh các mạch phổ biến */}
        {pulseSymptoms.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {pulseSymptoms.slice(0, 5).map((s) => {
              const isSelected = activeSymptomId === s.id;
              // Rút ngắn tên hiển thị nếu bắt đầu bằng "Mạch "
              const shortName = s.name.replace(/^mạch\s+/i, "");
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set(p.key, isSelected ? "none" : s.id)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] border transition-colors",
                    isSelected
                      ? "bg-emerald-800 text-white border-emerald-900 font-medium"
                      : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300"
                  )}
                >
                  {shortName}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header trạng thái */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-500">
          Mô phỏng 2 cổ tay (Thốn - Quan - Xích)
        </span>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={clearAllPulse}
            className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-800 font-medium text-[11px]"
          >
            <RotateCcw className="h-3 w-3" />
            Bỏ chọn mạch
          </button>
        )}
      </div>

      {/* 2 Cột mô phỏng Cổ tay Trái & Cổ tay Phải */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tay Trái (Tả thốn tâm, quan can, xích thận) */}
        <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/40 p-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <Label className="text-xs font-bold text-stone-800 uppercase tracking-wide">
              Tay Trái (Tả thủ)
            </Label>
            <span className="text-[11px] text-stone-400">Tâm · Can · Thận âm</span>
          </div>
          <div className="space-y-2">
            {PULSE_POSITIONS_LEFT.map(renderPositionBox)}
          </div>
        </div>

        {/* Tay Phải (Hữu thốn phế, quan tỳ vị, xích mệnh môn) */}
        <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/40 p-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <Label className="text-xs font-bold text-stone-800 uppercase tracking-wide">
              Tay Phải (Hữu thủ)
            </Label>
            <span className="text-[11px] text-stone-400">Phế · Tỳ/Vị · Thận dương</span>
          </div>
          <div className="space-y-2">
            {PULSE_POSITIONS_RIGHT.map(renderPositionBox)}
          </div>
        </div>
      </div>
    </div>
  );
}
