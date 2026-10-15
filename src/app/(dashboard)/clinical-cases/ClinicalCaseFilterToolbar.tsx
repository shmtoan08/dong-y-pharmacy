"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Toolbar tìm kiếm tự động cho trang Bệnh án kinh nghiệm */
export function ClinicalCaseFilterToolbar({ initialQ }: { initialQ: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
  }, [searchParams]);

  const apply = (nextQ: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ.trim()) params.set("q", nextQ.trim());
    else params.delete("q");
    params.set("page", "1");
    router.push(`/clinical-cases?${params.toString()}`);
  };

  const onSearchChange = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(v), 400);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 md:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm bệnh danh, biện chứng, pháp trị, bài thuốc..."
          className="pl-9 pr-9"
        />
        {q && (
          <button
            type="button"
            aria-label="Xóa tìm kiếm"
            onClick={() => {
              setQ("");
              apply("");
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {q.trim() !== "" && (
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
