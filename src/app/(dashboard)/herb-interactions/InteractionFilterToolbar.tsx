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
import { CATEGORY_LABEL } from "@/features/prescriptions/interactionConstants";
import type { InteractionCategory } from "@/features/prescriptions/interactionConstants";

export function InteractionFilterToolbar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const severity = sp.get("severity") ?? "all";
  const category = sp.get("category") ?? "all";
  const verified = sp.get("verified") ?? "all";

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

  const hasFilter = q || severity !== "all" || category !== "all" || verified !== "all";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1 space-y-1.5">
        <Label className="text-xs">Tìm kiếm</Label>
        <div className="relative">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tên vị thuốc A hoặc B..."
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
        <Label className="text-xs">Phân loại YHCT</Label>
        <Select value={category} onValueChange={(v) => setParam("category", v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Mức độ</Label>
        <Select value={severity} onValueChange={(v) => setParam("severity", v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="cam_ky">Cấm kỵ</SelectItem>
            <SelectItem value="can_trong">Cẩn trọng</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Duyệt</Label>
        <Select value={verified} onValueChange={(v) => setParam("verified", v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="yes">Đã duyệt</SelectItem>
            <SelectItem value="no">Chưa duyệt</SelectItem>
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
