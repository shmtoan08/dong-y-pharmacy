"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoModal } from "@/components/shared/InfoModal";
import { CATEGORY_LABEL } from "@/features/formulas/schemas";

const STATUS_FILTERS = [
  { value: "all", label: "Trạng thái: Tất cả" },
  { value: "active", label: "Đang dùng" },
  { value: "inactive", label: "Tạm ngưng" },
];

/** Toolbar lọc tự động cho trang Bài thuốc mẫu */
export function FormulaFilterToolbar({
  initialQ,
  initialCategory,
  initialStatus,
}: {
  initialQ: string;
  initialCategory: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [importOpen, setImportOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const apply = (next: { q?: string; category?: string; status?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q.trim());
      else params.delete("q");
    }
    if (next.category !== undefined) params.set("category", next.category);
    if (next.status !== undefined) params.set("status", next.status);
    params.set("page", "1");
    router.push(`/formulas?${params.toString()}`);
  };

  const onSearchChange = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: v }), 400);
  };

  const hasFilter =
    q.trim() !== "" || initialCategory !== "all" || initialStatus !== "all";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên bài thuốc, hội chứng..."
            className="pl-9 pr-9"
          />
          {q && (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              onClick={() => {
                setQ("");
                apply({ q: "" });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Select value={initialCategory} onValueChange={(v) => apply({ category: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Phân loại: Tất cả" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Phân loại: Tất cả</SelectItem>
            {Object.entries(CATEGORY_LABEL).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={initialStatus} onValueChange={(v) => apply({ status: v })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/formulas")}
          >
            Xóa lọc
          </Button>
        )}
        <div className="ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
          >
            <Download className="mr-1 h-4 w-4" /> Nhập Excel
          </Button>
        </div>
      </div>

      <InfoModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Sắp có"
        description="Tính năng nhập bài thuốc từ Excel sẽ có trong thời gian tới."
      />
    </>
  );
}
