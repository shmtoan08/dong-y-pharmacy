"use client";

import { useState } from "react";
import { HerbNameAutocomplete } from "@/components/shared/HerbNameAutocomplete";
import { cn } from "@/lib/utils";

interface HerbAutocompleteProps {
  name: string; // tên field cho react-hook-form (herb_name)
  defaultValue?: string;
  defaultHerbId?: string;
  onHerbChange: (herbId: string | null, herbName: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Ô nhập tên vị thuốc cho kê đơn: gợi ý từ danh mục (ưu tiên herb_id).
 * Không chọn → giữ text tự do (sẽ tạo mapping pending khi lưu đơn).
 * Wrapper quanh HerbNameAutocomplete (common), thêm tracking herb_id + viền xanh khi đã link.
 */
export function HerbAutocomplete({
  name,
  defaultValue = "",
  defaultHerbId,
  onHerbChange,
  placeholder = "Tên vị thuốc",
  className,
}: HerbAutocompleteProps) {
  const [text, setText] = useState(defaultValue);
  const [herbId, setHerbId] = useState<string | null>(defaultHerbId ?? null);

  const handleChange = (v: string, herb: { id: string } | null) => {
    setText(v);
    const newId = herb ? herb.id : null;
    setHerbId(newId);
    onHerbChange(newId, v);
  };

  return (
    <div className={cn("relative", className)}>
      <HerbNameAutocomplete
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(herbId && "[&>input]:border-emerald-500")}
      />
      {/* hidden field lưu herb_id */}
      <input type="hidden" name={name} value={text} />
      <input type="hidden" data-herb-id={herbId ?? ""} />
    </div>
  );
}
