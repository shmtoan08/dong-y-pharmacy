"use client";

import { useRef, useState } from "react";
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

const DATE_FILTERS = [
  { value: "all", label: "Ngày kê: Tất cả" },
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
];

/** Toolbar lọc tự động cho trang Kê đơn & Bốc thuốc */
export function PrescriptionFilterToolbar({
  initialQ,
  initialDate,
  initialPractitioner,
  practitioners,
}: {
  initialQ: string;
  initialDate: string;
  initialPractitioner: string;
  practitioners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") ?? "";
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  const [q, setQ] = useState(initialQ);

  if (prevUrlQ !== urlQ) {
    setPrevUrlQ(urlQ);
    setQ(urlQ);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = (next: { q?: string; date?: string; practitioner?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q.trim());
      else params.delete("q");
    }
    if (next.date !== undefined) params.set("date", next.date);
    if (next.practitioner !== undefined) params.set("practitioner", next.practitioner);
    params.set("page", "1");
    router.push(`/prescriptions?${params.toString()}`);
  };

  const onSearchChange = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: v }), 400);
  };

  const hasFilter =
    q.trim() !== "" || initialDate !== "all" || initialPractitioner !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 md:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm mã đơn DT-..., tên BN, SĐT..."
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
      <Select value={initialDate} onValueChange={(v) => apply({ date: v })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_FILTERS.map((d) => (
            <SelectItem key={d.value} value={d.value}>
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={initialPractitioner}
        onValueChange={(v) => apply({ practitioner: v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Bác sĩ: Tất cả" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Bác sĩ: Tất cả</SelectItem>
          {practitioners.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilter && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const params = new URLSearchParams();
            const status = searchParams.get("status");
            if (status) params.set("status", status);
            router.push(`/prescriptions${params.toString() ? `?${params.toString()}` : ""}`);
          }}
        >
          Xóa lọc
        </Button>
      )}
    </div>
  );
}
