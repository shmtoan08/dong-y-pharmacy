"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PulsePattern } from "@/features/visits/actions";

const HAND_LABEL: Record<string, string> = { left: "Tay trái", right: "Tay phải" };
const POS_LABEL: Record<string, string> = {
  thon: "Thốn",
  quan: "Quan",
  xich: "Xích",
};

interface PulseValue {
  pulse_pattern_id: string | null;
  custom_note: string;
}

/**
 * Form nhập mạch 6 vị trí. Parent đọc giá trị qua hidden input "pulses" (JSON).
 */
export function PulseInputForm({
  patterns,
  name = "pulses",
}: {
  patterns: PulsePattern[];
  name?: string;
}) {
  const [values, setValues] = useState<Record<string, PulseValue>>({});

  const key = (hand: string, pos: string) => `${hand}:${pos}`;
  const get = (hand: string, pos: string): PulseValue =>
    values[key(hand, pos)] ?? { pulse_pattern_id: null, custom_note: "" };

  const set = (hand: string, pos: string, v: Partial<PulseValue>) => {
    setValues((prev) => ({
      ...prev,
      [key(hand, pos)]: { ...get(hand, pos), ...v },
    }));
  };

  const payload = ["left", "right"].flatMap((hand) =>
    ["thon", "quan", "xich"].map((position) => ({
      hand,
      position,
      pulse_pattern_id: get(hand, position).pulse_pattern_id,
      custom_note: get(hand, position).custom_note || undefined,
    })),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bắt mạch (6 vị trí)</CardTitle>
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
                return (
                  <div key={pos} className="space-y-2 rounded-lg border border-stone-200 p-3">
                    <Label className="text-sm font-medium">{POS_LABEL[pos]}</Label>
                    <Select
                      value={v.pulse_pattern_id ?? ""}
                      onValueChange={(val) =>
                        set(hand, pos, { pulse_pattern_id: val || null })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn mạch..." />
                      </SelectTrigger>
                      <SelectContent>
                        {patterns.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name_viet} ({p.name_han_viet})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
