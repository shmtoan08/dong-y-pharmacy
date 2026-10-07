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

const TINH_FILTERS = [
  { value: "all", label: "Tính vị: Tất cả" },
  { value: "ôn", label: "Ôn" },
  { value: "hàn", label: "Hàn" },
  { value: "nhiệt", label: "Nhiệt" },
  { value: "lương", label: "Lương" },
  { value: "bình", label: "Bình" },
];

const STOCK_FILTERS = [
  { value: "all", label: "Tồn kho: Tất cả" },
  { value: "available", label: "Sẵn có" },
  { value: "low", label: "Sắp hết" },
  { value: "out", label: "Hết hàng" },
];

/** Toolbar lọc tự động cho trang Danh mục vị thuốc */
export function HerbFilterToolbar({
  initialQ,
  initialTinh,
  initialQuyKinh,
  initialStock,
  quyKinhOptions,
}: {
  initialQ: string;
  initialTinh: string;
  initialQuyKinh: string;
  initialStock: string;
  quyKinhOptions: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [importOpen, setImportOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const apply = (next: { q?: string; tinh?: string; quyKinh?: string; stock?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q.trim());
      else params.delete("q");
    }
    if (next.tinh !== undefined) params.set("tinh", next.tinh);
    if (next.quyKinh !== undefined) params.set("quykinh", next.quyKinh);
    if (next.stock !== undefined) params.set("stock", next.stock);
    params.set("page", "1");
    router.push(`/herbs?${params.toString()}`);
  };

  const onSearchChange = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: v }), 400);
  };

  const hasFilter =
    q.trim() !== "" ||
    initialTinh !== "all" ||
    initialQuyKinh !== "all" ||
    initialStock !== "all";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên vị thuốc, mã VT..."
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
        <Select value={initialTinh} onValueChange={(v) => apply({ tinh: v })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TINH_FILTERS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={initialQuyKinh} onValueChange={(v) => apply({ quyKinh: v })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Quy kinh: Tất cả" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Quy kinh: Tất cả</SelectItem>
            {quyKinhOptions.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={initialStock} onValueChange={(v) => apply({ stock: v })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STOCK_FILTERS.map((s) => (
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
            onClick={() => router.push("/herbs")}
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
        description="Tính năng nhập danh mục vị thuốc từ Excel sẽ có trong thời gian tới."
      />
    </>
  );
}
