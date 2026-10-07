"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** 4 cặp Bát cương: mỗi cặp chọn tối đa 1 */
const PAIRS: [string, string][] = [
  ["Biểu", "Lý"],
  ["Hàn", "Nhiệt"],
  ["Hư", "Thực"],
  ["Âm", "Dương"],
];

/**
 * Chọn nhanh Bát cương dạng chips. Mỗi cặp chọn 1 (bấm lại để bỏ chọn).
 * Giá trị lưu vào input hidden "bat_cuong" dạng "Biểu,Hàn,Hư,Âm".
 */
export function BatCuongPicker() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (value: string, pair: [string, string]) => {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      // Bỏ chọn còn lại trong cặp, thêm mới
      return [...prev.filter((v) => v !== pair[0] && v !== pair[1]), value];
    });
  };

  return (
    <div className="space-y-2">
      <input type="hidden" name="bat_cuong" value={selected.join(",")} />
      <p className="text-sm font-medium">Bát cương</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {PAIRS.map((pair) => (
          <div key={pair[0]} className="flex gap-1.5">
            {pair.map((v) => {
              const on = selected.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggle(v, pair)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    on
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-stone-300 bg-white text-stone-600 hover:border-emerald-500 hover:text-emerald-700",
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
