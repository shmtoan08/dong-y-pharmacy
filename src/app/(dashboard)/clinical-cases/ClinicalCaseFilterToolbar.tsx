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

/** Toolbar tìm kiếm tự động cho trang Bệnh án kinh nghiệm */
export function ClinicalCaseFilterToolbar({
  initialQ,
  diseases,
  initialDisease,
}: {
  initialQ: string;
  diseases: { id: string; name: string }[];
  initialDisease: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const apply = (next: { q?: string; disease?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q.trim());
      else params.delete("q");
    }
    if (next.disease !== undefined) {
      if (next.disease && next.disease !== "all") params.set("disease", next.disease);
      else params.delete("disease");
    }
    params.set("page", "1");
    router.push(`/clinical-cases?${params.toString()}`);
  };

  const onSearchChange = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: v }), 400);
  };

  const hasFilter = q.trim() !== "" || initialDisease !== "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 md:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm bệnh, biện chứng, pháp trị, bài thuốc..."
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
      <Select value={initialDisease || "all"} onValueChange={(v) => apply({ disease: v })}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Bệnh: Tất cả" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Bệnh: Tất cả</SelectItem>
          {diseases.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilter && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/clinical-cases")}
        >
          Xóa lọc
        </Button>
      )}
    </div>
  );
}
