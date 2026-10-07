"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SEX_FILTERS = [
  { value: "all", label: "Giới tính: Tất cả" },
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];

const VISIT_FILTERS = [
  { value: "all", label: "Lần khám: Tất cả" },
  { value: "month", label: "Trong tháng này" },
  { value: "stale", label: "Trên 6 tháng chưa tái khám" },
  { value: "never", label: "Chưa khám lần nào" },
];

/** Toolbar lọc tự động cho trang bệnh nhân */
export function PatientFilterToolbar({
  initialQ,
  initialSex,
  initialVisit,
}: {
  initialQ: string;
  initialSex: string;
  initialVisit: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const apply = (next: { q?: string; sex?: string; visit?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q.trim());
      else params.delete("q");
    }
    if (next.sex !== undefined) params.set("sex", next.sex);
    if (next.visit !== undefined) params.set("visit", next.visit);
    params.set("page", "1");
    router.push(`/patients?${params.toString()}`);
  };

  const onSearchChange = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: v }), 400);
  };

  const hasFilter = q.trim() !== "" || initialSex !== "all" || initialVisit !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 md:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm tên, SĐT, mã BN, địa chỉ..."
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
      <Select value={initialSex} onValueChange={(v) => apply({ sex: v })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SEX_FILTERS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={initialVisit} onValueChange={(v) => apply({ visit: v })}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VISIT_FILTERS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilter && (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/patients")}>
          Xóa lọc
        </Button>
      )}
    </div>
  );
}
