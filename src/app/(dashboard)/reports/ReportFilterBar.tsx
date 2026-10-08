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

const PRESETS = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "month", label: "Tháng này" },
  { value: "custom", label: "Tùy chọn" },
];

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function detectPreset(sp: URLSearchParams): string {
  if (sp.get("from") || sp.get("to")) return "custom";
  return "30d";
}

export function ReportFilterBar({ basePath }: { basePath: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [preset, setPreset] = useState(() => detectPreset(sp));
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");

  useEffect(() => {
    setPreset(detectPreset(sp));
    setFrom(sp.get("from") ?? "");
    setTo(sp.get("to") ?? "");
  }, [sp]);

  const apply = (p: string, f?: string, t?: string) => {
    setPreset(p);
    const params = new URLSearchParams();
    if (p === "custom") {
      if (f) params.set("from", f);
      if (t) params.set("to", t);
    } else if (p === "7d") {
      params.set("from", toISO(new Date(Date.now() - 7 * 864e5)));
    } else if (p === "30d") {
      params.set("from", toISO(new Date(Date.now() - 30 * 864e5)));
    } else if (p === "month") {
      const now = new Date();
      params.set("from", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
    }
    router.replace(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Khoảng thời gian</Label>
        <Select value={preset} onValueChange={(v) => { if (v !== "custom") apply(v); else setPreset("custom"); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {preset === "custom" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Từ ngày</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Đến ngày</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>
          <Button size="sm" variant="outline" onClick={() => apply("custom", from, to)}>Áp dụng</Button>
        </>
      )}
    </div>
  );
}
