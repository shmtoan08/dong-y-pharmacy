"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { InfoModal } from "@/components/shared/InfoModal";
import { BackButton } from "@/components/shared/BackButton";
import { Printer } from "lucide-react";
import {
  setCheckActual,
  confirmStockCheck,
  cancelStockCheck,
  type StockCheckRow,
  type StockCheckItemRow,
} from "@/features/inventory/actions";

const DIFF_REASONS = [
  "Hao hụt tự nhiên (khô/bay hơi)",
  "Ẩm mốc / hư hỏng",
  "Sai số cân khi bốc thuốc",
  "Nhầm lẫn dược liệu",
  "Lý do khác",
];

export function CheckDetailClient({
  check,
  items,
  canConfirm,
}: {
  check: StockCheckRow;
  items: StockCheckItemRow[];
  canConfirm: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isDraft = check.status === "draft";

  const onSetActual = async (itemId: string, val: string, reason: string | null) => {
    const qty = Number(val);
    if (isNaN(qty) || qty < 0) return;
    const res = await setCheckActual(itemId, qty, reason ?? undefined);
    if (res.error) setInfo(res.error);
    else router.refresh();
  };

  const onConfirm = async () => {
    setBusy(true);
    const res = await confirmStockCheck(check.id);
    setBusy(false);
    setConfirmOpen(false);
    if (res.error) setInfo(res.error);
    else router.refresh();
  };

  const onCancel = async () => {
    const res = await cancelStockCheck(check.id);
    if (res.error) setInfo(res.error);
    else router.refresh();
  };

  const q = search.toLowerCase().trim();
  const visible = q
    ? items.filter(
        (i) =>
          i.herb_name.toLowerCase().includes(q) ||
          i.lot_code.toLowerCase().includes(q),
      )
    : items;

  const totalDiff = items.reduce(
    (s, i) => s + (i.actual_qty !== null ? Number(i.actual_qty) - Number(i.system_qty) : 0),
    0,
  );
  const diffCount = items.filter(
    (i) => i.actual_qty !== null && Number(i.actual_qty) !== Number(i.system_qty),
  ).length;

  return (
    <div className="space-y-4">
      <BackButton href="/stock-checks" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold text-stone-900">{check.check_code}</h1>
          <p className="text-sm text-stone-500">
            {new Date(check.created_at).toLocaleDateString("vi-VN")} · {items.length} lô
            {diffCount > 0 && (
              <span className={totalDiff < 0 ? "font-medium text-red-700" : "font-medium text-blue-700"}>
                {" "}· Tổng lệch: {totalDiff > 0 ? "+" : ""}{totalDiff.toLocaleString("vi-VN")} ({diffCount} lô)
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/stock-checks/${check.id}/print`}>
            <Button variant="outline" size="sm">
              <Printer className="mr-1 h-4 w-4" /> In biên bản
            </Button>
          </Link>
          {isDraft && canConfirm && (
            <>
              <Button variant="outline" size="sm" onClick={onCancel}>
                Hủy phiếu
              </Button>
              <Button
                size="sm"
                className="bg-emerald-800 hover:bg-emerald-900"
                onClick={() => setConfirmOpen(true)}
              >
                Cân bằng kho
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-xs">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm nhanh vị thuốc trong phiếu..."
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bảng đối chiếu kiểm đếm</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-stone-600">Lô / Vị thuốc</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tồn sổ sách</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tồn thực tế</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Chênh lệch</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Lý do chênh lệch</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((i) => {
                  const diff =
                    i.actual_qty !== null
                      ? Number(i.actual_qty) - Number(i.system_qty)
                      : null;
                  return (
                    <tr key={i.id} className="border-b border-stone-100">
                      <td className="px-4 py-2.5">
                        <p className="font-mono text-xs">{i.lot_code}</p>
                        <p className="text-xs text-stone-500">
                          {i.herb_name} ({i.herb_code})
                        </p>
                        {i.storage_location && (
                          <p className="text-xs text-stone-400">📍 {i.storage_location}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        {Number(i.system_qty).toLocaleString("vi-VN")} {i.base_unit}
                      </td>
                      <td className="px-4 py-2.5">
                        {isDraft ? (
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            defaultValue={i.actual_qty ?? ""}
                            placeholder={String(i.system_qty)}
                            className="ml-auto w-28 text-right"
                            onBlur={(e) => {
                              const cur = document.getElementById(`reason-${i.id}`) as HTMLInputElement | null;
                              if (e.target.value !== String(i.actual_qty ?? "")) {
                                onSetActual(i.id, e.target.value, cur?.value ?? i.diff_reason);
                              }
                            }}
                          />
                        ) : (
                          <span className="block text-right">
                            {i.actual_qty !== null
                              ? `${Number(i.actual_qty).toLocaleString("vi-VN")} ${i.base_unit}`
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        {diff === null ? (
                          <span className="text-stone-400">—</span>
                        ) : diff === 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-800">Khớp</Badge>
                        ) : (
                          <span className={diff > 0 ? "font-medium text-blue-700" : "font-medium text-red-700"}>
                            {diff > 0 ? "+" : ""}{diff.toLocaleString("vi-VN")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {isDraft && diff !== null && diff !== 0 ? (
                          <Select
                            defaultValue={i.diff_reason ?? ""}
                            onValueChange={(v) => {
                              const input = document.querySelector(
                                `input[data-item="${i.id}"]`,
                              ) as HTMLInputElement | null;
                              onSetActual(
                                i.id,
                                input?.value ?? String(i.actual_qty ?? i.system_qty),
                                v,
                              );
                            }}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Chọn lý do..." />
                            </SelectTrigger>
                            <SelectContent>
                              {DIFF_REASONS.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-stone-500">{i.diff_reason ?? "—"}</span>
                        )}
                        <input type="hidden" id={`reason-${i.id}`} defaultValue={i.diff_reason ?? ""} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cân bằng kho?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            {diffCount > 0
              ? `Có ${diffCount} lô chênh lệch (tổng ${totalDiff > 0 ? "+" : ""}${totalDiff.toLocaleString("vi-VN")}) sẽ được điều chỉnh tồn kho theo số thực tế.`
              : "Tất cả các lô đều khớp, không có điều chỉnh nào."}
            {" "}Nếu kho đã thay đổi sau khi lập phiếu, hệ thống sẽ từ chối.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Để sau
            </Button>
            <Button
              className="bg-emerald-800 hover:bg-emerald-900"
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "Đang xử lý..." : "Xác nhận cân bằng"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal
        open={info !== null}
        onOpenChange={(o) => !o && setInfo(null)}
        title={info ?? ""}
      />
    </div>
  );
}
