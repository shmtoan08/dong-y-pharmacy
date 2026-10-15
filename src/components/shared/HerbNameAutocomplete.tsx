"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { searchHerbs, type Herb } from "@/features/herbs/actions";
import { cn } from "@/lib/utils";

interface HerbNameAutocompleteProps {
  value: string;
  onChange: (value: string, herb: Herb | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Hiện mã VT trong gợi ý (mặc định true) */
  showCode?: boolean;
}

/**
 * Ô nhập tên vị thuốc dùng chung: gợi ý từ danh mục vị thuốc.
 * Cho phép gõ tự do nếu tên không có trong danh mục.
 * Dropdown render qua Portal để không bị cắt bởi Card (overflow-hidden).
 * Dùng ở: form bài thuốc, kê đơn, tương kỵ, nhập kho, ...
 */
export function HerbNameAutocomplete({
  value,
  onChange,
  placeholder = "Tên vị thuốc",
  className,
  disabled,
  showCode = true,
}: HerbNameAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Herb[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tính vị trí dropdown (fixed) theo ô input — thoát khỏi overflow-hidden của Card
  const updatePosition = () => {
    if (!boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    setDropdownStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // Đóng dropdown khi bấm ra ngoài (cả ô input lẫn dropdown Portal)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inInput = boxRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inInput && !inDropdown) setOpen(false);
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
    onChange(v, null);
    doSearch(v);
  };

  const pick = (h: Herb) => {
    onChange(h.name_common, h);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <Input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        onChange={(e) => handleText(e.target.value)}
        onFocus={() => value.trim() && results.length > 0 && setOpen(true)}
      />
      {open &&
        dropdownStyle &&
        createPortal(
          <ul
            ref={dropdownRef}
            className="fixed z-[100] max-h-56 overflow-auto rounded-md border border-stone-200 bg-white shadow-lg"
            style={{
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
            }}
          >
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
                    {showCode && (
                      <span className="font-mono text-xs text-stone-500">{h.code}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
