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

const TIME_PRESETS = [
  { value: "all", label: "Tất cả" },
  { value: "today", label: "Hôm nay" },
  { value: "month", label: "Tháng này" },
  { value: "custom", label: "Tùy chọn" },
];

export function InvoiceFilterToolbar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const status = sp.get("status") ?? "all";
  const timePreset = sp.get("time") ?? "all";
  const method = sp.get("method") ?? "all";
  const [customFrom, setCustomFrom] = useState(sp.get("from") ?? "");
  const [customTo, setCustomTo] = useState(sp.get("to") ?? "");

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

  const setTime = (v: string) => {
    const params = new URLSearchParams(sp.toString());
    params.delete("from");
    params.delete("to");
    if (v === "all") params.delete("time");
    else params.set("time", v);
    params.delete("page");
    router.replace(`?${params.toString()}`);
  };

  const applyCustom = () => {
    const params = new URLSearchParams(sp.toString());
    params.set("time", "custom");
    if (customFrom) params.set("from", customFrom);
    else params.delete("from");
    if (customTo) params.set("to", customTo);
    else params.delete("to");
    params.delete("page");
    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1 space-y-1.5">
        <Label className="text-xs">Tìm kiếm</Label>
        <div className="relative">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mã HĐ, tên BN, SĐT..."
            className="pr-8"
          />
          {q && (
            <button type="button" onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Thời gian</Label>
        <Select value={timePreset} onValueChange={setTime}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TIME_PRESETS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {timePreset === "custom" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Từ ngày</Label>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-36" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Đến ngày</Label>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-36" />
          </div>
          <Button size="sm" variant="outline" onClick={applyCustom}>Áp dụng</Button>
        </>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Hình thức TT</Label>
        <Select value={method} onValueChange={(v) => setParam("method", v)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="cash">Tiền mặt</SelectItem>
            <SelectItem value="transfer">Chuyển khoản</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Trạng thái</Label>
        <Select value={status} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="unpaid">Chưa thu</SelectItem>
            <SelectItem value="partial">Thu một phần</SelectItem>
            <SelectItem value="paid">Đã thu đủ</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(q || status !== "all" || timePreset !== "all" || method !== "all") && (
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); setCustomFrom(""); setCustomTo(""); router.replace("?"); }}>
          Xóa lọc
        </Button>
      )}
    </div>
  );
}
