"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchHerbs, type Herb } from "@/features/herbs/actions";
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
 * Ô nhập tên vị thuốc: gợi ý từ danh mục (ưu tiên herb_id).
 * Không chọn → giữ text tự do (sẽ tạo mapping pending khi lưu đơn).
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
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Herb[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Đóng dropdown khi bấm ra ngoài
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const doSearch = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await searchHerbs(q.trim(), 8);
        setResults(r);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleText = (v: string) => {
    setText(v);
    // Đổi text → bỏ link herb_id cũ (trừ khi text khớp tên đã chọn)
    if (herbId) {
      setHerbId(null);
      onHerbChange(null, v);
    } else {
      onHerbChange(null, v);
    }
    doSearch(v);
  };

  const pick = (h: Herb) => {
    setText(h.name_common);
    setHerbId(h.id);
    onHerbChange(h.id, h.name_common);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <Input
        name={name}
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => handleText(e.target.value)}
        onFocus={() => text.trim() && results.length > 0 && setOpen(true)}
        className={cn(herbId && "border-emerald-500")}
      />
      {/* hidden field lưu herb_id */}
      <input type="hidden" data-herb-id={herbId ?? ""} />
      {open && (
        <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-stone-200 bg-white shadow-lg">
          {loading ? (
            <li className="px-3 py-2 text-sm text-stone-500">Đang tìm...</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-stone-500">
              Không có trong danh mục — sẽ lưu tên tự do
            </li>
          ) : (
            results.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => pick(h)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50"
                >
                  <span>
                    {h.name_common}
                    {h.name_han_viet && (
                      <span className="ml-1 text-xs text-stone-400">{h.name_han_viet}</span>
                    )}
                  </span>
                  <span className="font-mono text-xs text-stone-500">{h.code}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
