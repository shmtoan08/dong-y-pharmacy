"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { BackButton } from "@/components/shared/BackButton";
import { Printer, Wallet } from "lucide-react";
import {
  recordPayment,
  cancelInvoice,
  type InvoiceDetail,
} from "@/features/finance/actions";

const STATUS: Record<string, { label: string; cls: string }> = {
  unpaid: { label: "Chưa thu", cls: "bg-red-100 text-red-800" },
  partial: { label: "Thu một phần", cls: "bg-amber-100 text-amber-800" },
  paid: { label: "Đã thu đủ", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Đã hủy", cls: "bg-stone-200 text-stone-600" },
};

export function InvoiceDetailClient({
  invoice,
  canCollect,
  canCancel,
}: {
  invoice: InvoiceDetail;
  canCollect: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const fmt = (n: number) => Number(n).toLocaleString("vi-VN") + "đ";
  const st = STATUS[invoice.status];
  const canPay = canCollect && (invoice.status === "unpaid" || invoice.status === "partial");

  const onPay = async () => {
    const v = Number(amount);
    if (isNaN(v) || v <= 0) {
      setInfo("Số tiền không hợp lệ.");
      return;
    }
    setBusy(true);
    const res = await recordPayment(invoice.id, v, method, note);
    setBusy(false);
    if (res.error) setInfo(res.error);
    else {
      setPayOpen(false);
      setAmount("");
      setNote("");
      router.refresh();
    }
  };

  const onCancel = async () => {
    setBusy(true);
    const res = await cancelInvoice(invoice.id);
    setBusy(false);
    if (res.error) setInfo(res.error);
    else router.refresh();
  };

  return (
    <div className="space-y-4">
      <BackButton href="/finance/invoices" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold text-stone-900">{invoice.invoice_code}</h1>
          <p className="text-sm text-stone-500">
            {invoice.patient_name} · Đơn {invoice.prescription_code} ·{" "}
            {new Date(invoice.created_at).toLocaleDateString("vi-VN")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={st.cls}>{st.label}</Badge>
          <Link href={`/finance/invoices/${invoice.id}/print`}>
            <Button variant="outline" size="sm">
              <Printer className="mr-1 h-4 w-4" /> In hóa đơn
            </Button>
          </Link>
          {canPay && (
            <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900" onClick={() => { setAmount(String(invoice.remaining)); setPayOpen(true); }}>
              <Wallet className="mr-1 h-4 w-4" /> Thu tiền
            </Button>
          )}
          {canCancel && (invoice.status === "unpaid" || invoice.status === "partial") && (
            <Button size="sm" variant="outline" className="text-red-600" onClick={onCancel} disabled={busy}>
              Hủy hóa đơn
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Chi tiết tiền thuốc</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-2 font-medium text-stone-600">Vị thuốc</th>
                  <th className="px-4 py-2 text-right font-medium text-stone-600">SL</th>
                  <th className="px-4 py-2 text-right font-medium text-stone-600">Đơn giá</th>
                  <th className="px-4 py-2 text-right font-medium text-stone-600">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it, i) => (
                  <tr key={i} className="border-b border-stone-100">
                    <td className="px-4 py-2">{it.herb_name}</td>
                    <td className="px-4 py-2 text-right">{Number(it.quantity).toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-2 text-right">{fmt(it.unit_price)}</td>
                    <td className="px-4 py-2 text-right font-medium">{fmt(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 px-4 py-3 text-sm">
              <p className="flex justify-between"><span className="text-stone-500">Tạm tính:</span><span>{fmt(invoice.subtotal)}</span></p>
              <p className="flex justify-between"><span className="text-stone-500">Chiết khấu:</span><span>{fmt(invoice.discount)}</span></p>
              <p className="flex justify-between text-base font-bold"><span>Tổng cộng:</span><span>{fmt(invoice.total)}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Lịch sử thu tiền</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-stone-50 p-2">
                <p className="text-xs text-stone-500">Tổng</p>
                <p className="font-bold">{fmt(invoice.total)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-2">
                <p className="text-xs text-stone-500">Đã thu</p>
                <p className="font-bold text-emerald-700">{fmt(invoice.paid_total)}</p>
              </div>
              <div className="rounded-lg bg-red-50 p-2">
                <p className="text-xs text-stone-500">Còn lại</p>
                <p className="font-bold text-red-700">{fmt(invoice.remaining)}</p>
              </div>
            </div>
            {invoice.payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-500">Chưa thu lần nào.</p>
            ) : (
              <div className="space-y-2">
                {invoice.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-emerald-700">+{fmt(p.amount)}</p>
                      <p className="text-xs text-stone-500">
                        {p.method === "cash" ? "Tiền mặt" : "Chuyển khoản"} · {p.user_name ?? ""} ·{" "}
                        {new Date(p.created_at).toLocaleString("vi-VN")}
                      </p>
                      {p.note && <p className="text-xs text-stone-500">{p.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thu tiền hóa đơn</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Còn lại: <span className="font-bold text-red-700">{fmt(invoice.remaining)}</span>
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
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={busy}>Để sau</Button>
            <Button className="bg-emerald-800 hover:bg-emerald-900" onClick={onPay} disabled={busy}>
              {busy ? "Đang lưu..." : "Xác nhận thu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal open={info !== null} onOpenChange={(o) => !o && setInfo(null)} title={info ?? ""} />
    </div>
  );
}
