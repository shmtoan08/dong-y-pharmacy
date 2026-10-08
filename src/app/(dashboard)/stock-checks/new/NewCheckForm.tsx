"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InfoModal } from "@/components/shared/InfoModal";
import { BackButton } from "@/components/shared/BackButton";
import { createStockCheck } from "@/features/inventory/actions";
import type { LotRow } from "@/features/inventory/actions";

export function NewCheckForm({ lots }: { lots: LotRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checkAll, setCheckAll] = useState(true);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
    setCheckAll(false);
  };

  const q = search.toLowerCase().trim();
  const visibleLots = q
    ? lots.filter(
        (l) =>
          l.herb_name.toLowerCase().includes(q) ||
          l.lot_code.toLowerCase().includes(q) ||
          l.herb_code.toLowerCase().includes(q),
      )
    : lots;

  const onSubmit = async () => {
    setBusy(true);
    const res = await createStockCheck(checkAll ? [] : Array.from(selected), note);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else if (res.id) {
      router.push(`/stock-checks/${res.id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Ghi chú</Label>
        <Textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="VD: Kiểm kho cuối tháng 10..."
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Chọn lô kiểm kê ({lots.length})</CardTitle>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={checkAll}
                onCheckedChange={(v) => setCheckAll(v === true)}
              />
              Tất cả lô còn hàng
            </label>
          </div>
          {!checkAll && (
            <div className="pt-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm nhanh vị thuốc, mã lô..."
              />
            </div>
          )}
        </CardHeader>
        {!checkAll && (
          <CardContent className="max-h-96 space-y-1 overflow-y-auto">
            {visibleLots.map((l) => (
              <label
                key={l.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-50"
              >
                <Checkbox
                  checked={selected.has(l.id)}
                  onCheckedChange={() => toggle(l.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-mono text-xs">{l.lot_code}</span>{" "}
                    {l.herb_name}
                  </p>
                  {(l as LotRow & { storage_location?: string }).storage_location && (
                    <p className="text-xs text-stone-500">
                      Vị trí: {(l as LotRow & { storage_location?: string }).storage_location}
                    </p>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-stone-500">
                  {Number(l.quantity_current).toLocaleString("vi-VN")} {l.base_unit}
                </span>
              </label>
            ))}
            {visibleLots.length === 0 && (
              <p className="py-4 text-center text-sm text-stone-500">
                Không tìm thấy lô nào.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      <div className="flex gap-2">
        <BackButton href="/stock-checks" />
        <Button
          onClick={onSubmit}
          disabled={busy || (!checkAll && selected.size === 0)}
          className="bg-emerald-800 hover:bg-emerald-900"
        >
          {busy ? "Đang tạo..." : "Tạo phiếu kiểm kho"}
        </Button>
      </div>

      <InfoModal
        open={error !== null}
        onOpenChange={(o) => !o && setError(null)}
        title={error ?? ""}
      />
    </div>
  );
}
