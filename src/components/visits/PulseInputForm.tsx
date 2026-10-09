"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import type { PulsePattern } from "@/features/visits/actions";
import { cn } from "@/lib/utils";

const HAND_LABEL: Record<string, string> = { left: "Tay trái", right: "Tay phải" };
const POS_LABEL: Record<string, string> = {
  thon: "Thốn",
  quan: "Quan",
  xich: "Xích",
};

// 8 mạch hay gặp nhất — hiển thị dạng chips nhanh
const COMMON_PULSES = ["Phù", "Trầm", "Trì", "Sác", "Huyền", "Hoạt", "Tế", "Hư"];

interface PulseValue {
  pulse_pattern_id: string | null;
  pulse_pattern_id_2: string | null;
  custom_note: string;
}

/**
 * Form nhập mạch 6 vị trí với chips chọn nhanh + mạch kết hợp.
 * Parent đọc giá trị qua hidden input "pulses" (JSON).
 */
export function PulseInputForm({
  patterns,
  name = "pulses",
}: {
  patterns: PulsePattern[];
  name?: string;
}) {
  const [values, setValues] = useState<Record<string, PulseValue>>({});
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});

  const key = (hand: string, pos: string) => `${hand}:${pos}`;
  const get = (hand: string, pos: string): PulseValue =>
    values[key(hand, pos)] ?? { pulse_pattern_id: null, pulse_pattern_id_2: null, custom_note: "" };

  const set = (hand: string, pos: string, v: Partial<PulseValue>) => {
    setValues((prev) => ({
      ...prev,
      [key(hand, pos)]: { ...get(hand, pos), ...v },
    }));
  };

  const findByName = (nameViet: string) =>
    patterns.find((p) => p.name_viet === nameViet);

  const togglePulse = (hand: string, pos: string, patternId: string) => {
    const v = get(hand, pos);
    if (v.pulse_pattern_id === patternId) {
      // Bỏ chọn mạch 1, đẩy mạch 2 lên
      set(hand, pos, { pulse_pattern_id: v.pulse_pattern_id_2, pulse_pattern_id_2: null });
    } else if (v.pulse_pattern_id_2 === patternId) {
      // Bỏ chọn mạch 2
      set(hand, pos, { pulse_pattern_id_2: null });
    } else if (!v.pulse_pattern_id) {
      set(hand, pos, { pulse_pattern_id: patternId });
    } else if (!v.pulse_pattern_id_2) {
      set(hand, pos, { pulse_pattern_id_2: patternId });
    } else {
      // Đã có 2 mạch, thay mạch 2
      set(hand, pos, { pulse_pattern_id_2: patternId });
    }
  };

  const getPatternName = (id: string | null) =>
    patterns.find((p) => p.id === id)?.name_viet ?? "";

  const payload = ["left", "right"].flatMap((hand) =>
    ["thon", "quan", "xich"].map((position) => ({
      hand,
      position,
      pulse_pattern_id: get(hand, position).pulse_pattern_id,
      pulse_pattern_id_2: get(hand, position).pulse_pattern_id_2,
      custom_note: get(hand, position).custom_note || undefined,
    })),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bắt mạch (6 vị trí)</CardTitle>
        <p className="text-xs text-stone-500">Chạm để chọn, chạm lại để bỏ. Có thể chọn tối đa 2 mạch/vị trí (mạch kết hợp).</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <input type="hidden" name={name} value={JSON.stringify(payload)} />
        {(["left", "right"] as const).map((hand) => (
          <div key={hand}>
            <p className="mb-2 text-sm font-semibold text-stone-800">
              {HAND_LABEL[hand]}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {(["thon", "quan", "xich"] as const).map((pos) => {
                const v = get(hand, pos);
                const k = key(hand, pos);
                const expanded = showAll[k];
                return (
                  <div key={pos} className="space-y-2 rounded-lg border border-stone-200 p-3">
                    <Label className="text-sm font-medium">{POS_LABEL[pos]}</Label>

                    {/* Mạch đã chọn */}
                    {(v.pulse_pattern_id || v.pulse_pattern_id_2) && (
                      <div className="flex flex-wrap gap-1.5">
                        {v.pulse_pattern_id && (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                            {getPatternName(v.pulse_pattern_id)}
                            <button type="button"
                              onClick={() => togglePulse(hand, pos, v.pulse_pattern_id!)}
                              className="ml-1">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                        {v.pulse_pattern_id_2 && (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                            {getPatternName(v.pulse_pattern_id_2)}
                            <button type="button"
                              onClick={() => togglePulse(hand, pos, v.pulse_pattern_id_2!)}
                              className="ml-1">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Chips mạch phổ biến */}
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_PULSES.map((pulseName) => {
                        const p = findByName(pulseName);
                        if (!p) return null;
                        const selected = v.pulse_pattern_id === p.id || v.pulse_pattern_id_2 === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => togglePulse(hand, pos, p.id)}
                            className={cn(
                              "min-h-9 rounded-full border px-3 py-1.5 text-sm transition-colors",
                              selected
                                ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-800"
                                : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                            )}
                          >
                            {pulseName}
                          </button>
                        );
                      })}
                    </div>

                    {/* Mở rộng: tất cả các mạch */}
                    {!expanded ? (
                      <button type="button"
                        onClick={() => setShowAll((s) => ({ ...s, [k]: true }))}
                        className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700">
                        <Plus className="h-3 w-3" /> Thêm mạch khác...
                      </button>
                    ) : (
                      <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded border border-stone-100 p-2">
                        {patterns
                          .filter((p) => !COMMON_PULSES.includes(p.name_viet))
                          .map((p) => {
                            const selected = v.pulse_pattern_id === p.id || v.pulse_pattern_id_2 === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => togglePulse(hand, pos, p.id)}
                                className={cn(
                                  "min-h-8 rounded-full border px-2.5 py-1 text-xs",
                                  selected
                                    ? "border-emerald-600 bg-emerald-50 font-medium text-emerald-800"
                                    : "border-stone-200 hover:bg-stone-50"
                                )}
                              >
                                {p.name_viet}
                              </button>
                            );
                          })}
                      </div>
                    )}

                    <Input
                      placeholder="Ghi chú thêm..."
                      value={v.custom_note}
                      onChange={(e) => set(hand, pos, { custom_note: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
