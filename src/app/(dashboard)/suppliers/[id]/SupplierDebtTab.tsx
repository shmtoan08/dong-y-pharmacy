"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Wallet } from "lucide-react";
import {
  paySupplierReceipt,
  type SupplierDebt,
} from "@/features/finance/actions";

export function SupplierDebtTab({
  supplierId,
  receipts,
  totalDebt,
  totalPaid,
  canPay,
}: {
  supplierId: string;
  receipts: SupplierDebt[];
  totalDebt: number;
  totalPaid: number;
  canPay: boolean;
}) {
  const router = useRouter();
  const [payTarget, setPayTarget] = useState<SupplierDebt | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const fmt = (n: number) => Number(n).toLocaleString("vi-VN") + "đ";

  const onPay = async () => {
    if (!payTarget) return;
    const v = Number(amount);
    if (isNaN(v) || v <= 0) {
      setInfo("Số tiền không hợp lệ.");
      return;
    }
    setBusy(true);
    const res = await paySupplierReceipt(payTarget.receipt_id, v, method, note);
    setBusy(false);
    if (res.error) setInfo(res.error);
    else {
      setPayTarget(null);
      setAmount("");
      setNote("");
      router.refresh();
    }
  };

  const totalPurchased = totalDebt + totalPaid;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">Tổng tiền đã nhập</p>
            <p className="mt-1 text-xl font-bold text-stone-900">{fmt(totalPurchased)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">Đã thanh toán</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{fmt(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500">Công nợ còn lại</p>
            <p className="mt-1 text-xl font-bold text-red-700">{fmt(totalDebt)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chi tiết công nợ theo phiếu nhập</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-2.5 font-medium text-stone-600">Phiếu nhập</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium text-stone-600">Ngày nhập</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Tổng tiền</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Đã trả</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Còn nợ</th>
                  <th className="px-4 py-2.5 text-right font-medium text-stone-600">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.receipt_id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{r.receipt_code}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-stone-600">
                      {new Date(r.received_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">{fmt(r.total)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-emerald-700">{fmt(r.paid)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                      {r.remaining <= 0.01 ? (
                        <Badge className="bg-emerald-100 text-emerald-800">Đã trả đủ</Badge>
                      ) : (
                        <span className="text-red-700">{fmt(r.remaining)}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end">
                        {canPay && r.remaining > 0.01 && (
                          <Button
                            size="sm" variant="outline"
                            onClick={() => { setPayTarget(r); setAmount(String(Math.round(r.remaining))); setNote(""); }}
                          >
                            <Wallet className="mr-1 h-3.5 w-3.5" /> Thanh toán
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {receipts.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500">Chưa có phiếu nhập nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={payTarget !== null} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thanh toán phiếu {payTarget?.receipt_code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Còn nợ: <span className="font-bold text-red-700">{payTarget && fmt(payTarget.remaining)}</span>
            </p>
            <div className="space-y-1.5">
              <Label>Số tiền (đ) *</Label>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Hình thức</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as "cash" | "transfer")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tiền mặt</SelectItem>
                  <SelectItem value="transfer">Chuyển khoản</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ghi chú</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)} disabled={busy}>Để sau</Button>
            <Button className="bg-emerald-800 hover:bg-emerald-900" onClick={onPay} disabled={busy}>
              {busy ? "Đang lưu..." : "Xác nhận thanh toán"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal open={info !== null} onOpenChange={(o) => !o && setInfo(null)} title={info ?? ""} />
    </div>
  );
}
