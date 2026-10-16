"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { SymptomOption } from "@/features/clinical-cases/actions";

/** Chọn triệu chứng dạng chip theo nhóm (dùng chung cho form bệnh án + màn hình chẩn đoán) */
export function SymptomPicker({
  symptoms,
  selected,
  onChange,
}: {
  symptoms: SymptomOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();

  const grouped = new Map<string, SymptomOption[]>();
  for (const s of symptoms) {
    if (q && !s.name.toLowerCase().includes(q)) continue;
    const list = grouped.get(s.category) ?? [];
    list.push(s);
    grouped.set(s.category, list);
  }

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const selectedSymptoms = symptoms.filter((s) => selected.includes(s.id));

  return (
    <div className="space-y-3">
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Tìm triệu chứng..."
      />
      {selectedSymptoms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedSymptoms.map((s) => (
            <Badge
              key={s.id}
              className="cursor-pointer bg-emerald-800 hover:bg-emerald-900"
              onClick={() => toggle(s.id)}
            >
              {s.name} <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
      {[...grouped.entries()].map(([category, list]) => (
        <div key={category} className="space-y-1.5">
          <Label className="text-xs text-stone-500">{category}</Label>
          <div className="flex flex-wrap gap-1.5">
            {list.map((s) => {
              const active = selected.includes(s.id);
              return (
                <Badge
                  key={s.id}
                  variant={active ? "default" : "outline"}
                  className={
                    active
                      ? "cursor-pointer bg-emerald-800 hover:bg-emerald-900"
                      : "cursor-pointer hover:border-emerald-600 hover:text-emerald-700"
                  }
                  onClick={() => toggle(s.id)}
                >
                  {s.name}
                </Badge>
              );
            })}
          </div>
        </div>
      ))}
      {grouped.size === 0 && (
        <p className="text-sm text-stone-500">Không tìm thấy triệu chứng nào.</p>
      )}
    </div>
  );
}
