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

export function AppointmentFilterToolbar({
  practitioners,
}: {
  practitioners: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const practitionerId = sp.get("practitionerId") ?? "all";
  const status = sp.get("status") ?? "all";

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

  const setParam = (key: string, v: string) => {
    const params = new URLSearchParams(sp.toString());
    if (v === "all") params.delete(key);
    else params.set(key, v);
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
            placeholder="Tên bệnh nhân, SĐT..."
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
        <Label className="text-xs">Bác sĩ</Label>
        <Select value={practitionerId} onValueChange={(v) => setParam("practitionerId", v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {practitioners.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Trạng thái</Label>
        <Select value={status} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="scheduled">Đã đặt</SelectItem>
            <SelectItem value="checked_in">Đã tiếp đón</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
            <SelectItem value="no_show">Không đến</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(q || practitionerId !== "all" || status !== "all") && (
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); router.replace(`?date=${sp.get("date") ?? ""}`); }}>
          Xóa lọc
        </Button>
      )}
    </div>
  );
}
