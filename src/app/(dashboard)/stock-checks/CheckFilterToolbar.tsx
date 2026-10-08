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

export function CheckFilterToolbar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const status = sp.get("status") ?? "all";

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
    if (!v || v === "all") params.delete(key);
    else params.set(key, v);
    params.delete("page");
    router.replace(`?${params.toString()}`);
  };

  const clearAll = () => {
    setQ("");
    setFrom("");
    setTo("");
    router.replace("?");
  };

  const hasFilter = q || status !== "all" || from || to;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1 space-y-1.5">
        <Label className="text-xs">Tìm kiếm</Label>
        <div className="relative">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mã phiếu, người kiểm..."
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
        <Label className="text-xs">Trạng thái</Label>
        <Select value={status} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="draft">Nháp</SelectItem>
            <SelectItem value="confirmed">Đã cân bằng</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Từ ngày</Label>
        <Input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setParam("from", e.target.value); }}
          className="w-36"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Đến ngày</Label>
        <Input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setParam("to", e.target.value); }}
          className="w-36"
        />
      </div>
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Xóa lọc
        </Button>
      )}
    </div>
  );
}
