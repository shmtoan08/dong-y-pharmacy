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

const EXPIRY_OPTIONS = [
  { value: "all", label: "Tất cả HSD" },
  { value: "expiring", label: "Sắp hết hạn (30 ngày)" },
  { value: "expired", label: "Đã hết hạn" },
  { value: "valid", label: "Còn hạn tốt" },
  { value: "no_expiry", label: "Không HSD" },
];

export function LotFilterToolbar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const expiry = sp.get("expiry") ?? "all";

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      router.replace(`?${params.toString()}`);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setExpiry = (v: string) => {
    const params = new URLSearchParams(sp.toString());
    if (v === "all") params.delete("expiry");
    else params.set("expiry", v);
    router.replace(`?${params.toString()}`);
  };

  const clearAll = () => {
    setQ("");
    router.replace("?");
  };

  const hasFilter = q || expiry !== "all";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label className="text-xs">Tìm lô / vị thuốc</Label>
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
        <Select value={expiry} onValueChange={setExpiry}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPIRY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
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
