"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { InfoModal } from "@/components/shared/InfoModal";
import { BackButton } from "@/components/shared/BackButton";
import {
  setCheckActual,
  confirmStockCheck,
  cancelStockCheck,
  type StockCheckRow,
  type StockCheckItemRow,
} from "@/features/inventory/actions";

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

  const isDraft = check.status === "draft";

  const onSetActual = async (itemId: string, val: string) => {
    const qty = Number(val);
    if (isNaN(qty) || qty < 0) return;
    const res = await setCheckActual(itemId, qty);
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
            {diffCount > 0 && ` · ${diffCount} lô chênh lệch`}
          </p>
        </div>
        {isDraft && canConfirm && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Hủy phiếu
            </Button>
            <Button
              size="sm"
              className="bg-emerald-800 hover:bg-emerald-900"
              onClick={() => setConfirmOpen(true)}
            >
              Xác nhận kiểm kho
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Nhập tồn thực tế</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-stone-600">Lô</th>
                  <th className="px-4 py-2.5 font-medium text-stone-600">Vị thuốc</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tồn hệ thống</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tồn thực tế</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Chênh lệch</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const diff =
                    i.actual_qty !== null
                      ? Number(i.actual_qty) - Number(i.system_qty)
                      : null;
                  return (
                    <tr key={i.id} className="border-b border-stone-100">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{i.lot_code}</td>
                      <td className="px-4 py-2.5">{i.herb_name}</td>
                      <td className="px-4 py-2.5 text-right">
                        {Number(i.system_qty).toLocaleString("vi-VN")}
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
                              if (e.target.value !== String(i.actual_qty ?? "")) {
                                onSetActual(i.id, e.target.value);
                              }
                            }}
                          />
                        ) : (
                          <span className="block text-right">
                            {i.actual_qty !== null
                              ? Number(i.actual_qty).toLocaleString("vi-VN")
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
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
            <DialogTitle>Xác nhận kiểm kho?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            {diffCount > 0
              ? `Có ${diffCount} lô chênh lệch sẽ được điều chỉnh tồn kho.`
              : "Tất cả các lô đều khớp, không có điều chỉnh nào."}
            {" "}Nếu kho đã thay đổi sau khi lập phiếu, hệ thống sẽ từ chối xác nhận.
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
              {busy ? "Đang xử lý..." : "Xác nhận"}
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
