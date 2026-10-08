"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export function LedgerSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

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

  return (
    <div className="min-w-44 flex-1 space-y-1.5">
      <Label className="text-xs">Tìm kiếm</Label>
      <div className="relative">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Mã phiếu, nội dung, người thực hiện..."
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
  );
}
