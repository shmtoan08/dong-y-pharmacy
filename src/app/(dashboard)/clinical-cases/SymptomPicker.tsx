"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Check, RotateCcw } from "lucide-react";
import type { SymptomOption } from "@/features/clinical-cases/actions";
import { cn } from "@/lib/utils";

/** Chọn triệu chứng dạng chip phân nhóm trực quan (dùng chung cho form bệnh án + màn hình chẩn đoán) */
export function SymptomPicker({
  symptoms,
  selected,
  onChange,
  hideCategories = [],
}: {
  symptoms: SymptomOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  hideCategories?: string[];
}) {
  const [filter, setFilter] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const q = filter.trim().toLowerCase();

  // Lọc bỏ các category cần ẩn (ví dụ: "Mạch" khi đã có bộ bắt mạch riêng)
  const visibleSymptoms = useMemo(() => {
    return symptoms.filter((s) => !hideCategories.includes(s.category));
  }, [symptoms, hideCategories]);

  // Danh sách các category duy nhất
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of visibleSymptoms) {
      set.add(s.category);
    }
    return Array.from(set);
  }, [visibleSymptoms]);

  // Gom nhóm triệu chứng theo category và từ khóa
  const grouped = useMemo(() => {
    const map = new Map<string, SymptomOption[]>();
    for (const s of visibleSymptoms) {
      if (q && !s.name.toLowerCase().includes(q)) continue;
      if (activeCategory !== "all" && s.category !== activeCategory && !q) continue;

      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return map;
  }, [visibleSymptoms, q, activeCategory]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectedSymptoms = visibleSymptoms.filter((s) => selected.includes(s.id));

  // Đếm số lượng triệu chứng đã chọn theo category
  const selectedCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of selectedSymptoms) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    return counts;
  }, [selectedSymptoms]);

  return (
    <div className="space-y-3.5">
      {/* Ô tìm kiếm nhanh */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Tìm nhanh triệu chứng (ví dụ: đau khớp, sốt, lưỡi đỏ...)..."
          className="pl-9 pr-8 bg-stone-50/50 border-stone-200 focus:bg-white text-sm"
        />
        {filter && (
          <button
            type="button"
            onClick={() => setFilter("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dải phân loại Danh mục (Category Filter Pills) */}
      {!q && categories.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-100 pb-2.5">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={cn(
              "px-2.5 py-1 text-xs rounded-full transition-colors font-medium",
              activeCategory === "all"
                ? "bg-emerald-800 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
            )}
          >
            Tất cả ({visibleSymptoms.length})
          </button>
          {categories.map((cat) => {
            const count = selectedCountByCategory[cat] || 0;
            const isCatActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full transition-colors font-medium flex items-center gap-1",
                  isCatActive
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900"
                )}
              >
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                      isCatActive
                        ? "bg-white text-emerald-900"
                        : "bg-emerald-700 text-white"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Triệu chứng đã chọn (Summary chips) */}
      {selectedSymptoms.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-900">
              Đã ghi nhận ({selectedSymptoms.length})
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-800 font-medium text-[11px]"
            >
              <RotateCcw className="h-3 w-3" />
              Bỏ chọn tất cả
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedSymptoms.map((s) => (
              <Badge
                key={s.id}
                className="cursor-pointer bg-white text-emerald-900 border border-emerald-300 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors shadow-2xs font-normal"
                onClick={() => toggle(s.id)}
                title="Bấm để xoá triệu chứng này"
              >
                <Check className="mr-1 h-3 w-3 text-emerald-700" />
                {s.name}
                <X className="ml-1 h-3 w-3 text-stone-400 group-hover:text-red-500" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Danh sách Triệu chứng theo nhóm */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {[...grouped.entries()].map(([category, list]) => (
          <div key={category} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {category}
              </span>
              <div className="h-px flex-1 bg-stone-100" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {list.map((s) => {
                const active = selected.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-md border transition-all text-left font-normal",
                      active
                        ? "bg-emerald-800 text-white border-emerald-900 shadow-2xs font-medium"
                        : "bg-white text-stone-700 border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/50 hover:text-emerald-900"
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {grouped.size === 0 && (
          <div className="py-6 text-center text-sm text-stone-400">
            Không tìm thấy triệu chứng phù hợp với từ khoá &quot;{filter}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
