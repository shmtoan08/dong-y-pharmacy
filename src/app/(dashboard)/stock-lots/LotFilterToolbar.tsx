"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Supplier } from "@/features/suppliers/actions";

const EXPIRY_OPTIONS = [
  { value: "all", label: "Tất cả HSD" },
  { value: "expiring", label: "Sắp hết hạn (30 ngày)" },
  { value: "expired", label: "Đã hết hạn" },
  { value: "valid", label: "Còn hạn tốt" },
  { value: "no_expiry", label: "Không HSD" },
];

export function LotFilterToolbar({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const expiry = sp.get("expiry") ?? "all";
  const supplier = sp.get("supplier") ?? "all";
  const stock = sp.get("stock") ?? "all";

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      params.delete("page");
      router.replace(`?${params.toString()}`);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setParam = (key: string, v: string) => {
    const params = new URLSearchParams(sp.toString());
    if (v === "all") params.delete(key);
    else params.set(key, v);
    params.delete("page");
    router.replace(`?${params.toString()}`);
  };

  const clearAll = () => {
    setQ("");
    router.replace("?");
  };

  const hasFilter = q || expiry !== "all" || supplier !== "all" || stock !== "all";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1 space-y-1.5">
        <Label className="text-xs">Tìm kiếm</Label>
        <div className="relative">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mã lô, tên vị thuốc..."
            className="pr-8"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Hạn sử dụng</Label>
        <Select value={expiry} onValueChange={(v) => setParam("expiry", v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPIRY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Nhà cung cấp</Label>
        <Select value={supplier} onValueChange={(v) => setParam("supplier", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tất cả" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Tồn kho</Label>
        <Select value={stock} onValueChange={(v) => setParam("stock", v)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="in_stock">Còn hàng</SelectItem>
            <SelectItem value="out_of_stock">Đã hết</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Xóa lọc
        </Button>
      )}
    </div>
  );
}
