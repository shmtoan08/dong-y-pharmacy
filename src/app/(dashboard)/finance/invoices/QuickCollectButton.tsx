"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tooltip } from "@/components/ui/tooltip";
import { InfoModal } from "@/components/shared/InfoModal";
import { Wallet } from "lucide-react";
import { recordPayment } from "@/features/finance/actions";

/** Nút thu tiền nhanh trong cột Thao tác */
export function QuickCollectButton({
  invoiceId,
  remaining,
}: {
  invoiceId: string;
  remaining: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const fmt = (n: number) => Number(n).toLocaleString("vi-VN") + "đ";

  const onSubmit = async () => {
    const v = Number(amount);
    if (isNaN(v) || v <= 0) {
      setInfo("Số tiền không hợp lệ.");
      return;
    }
    setBusy(true);
    const res = await recordPayment(invoiceId, v, method);
    setBusy(false);
    if (res.error) setInfo(res.error);
    else {
      setOpen(false);
      setAmount("");
      router.refresh();
    }
  };

  return (
    <>
      <Tooltip label="Thu tiền nhanh">
        <Button
          variant="ghost" size="icon" className="h-8 w-8 text-emerald-700"
          onClick={() => { setAmount(String(Math.round(remaining))); setOpen(true); }}
        >
          <Wallet className="h-4 w-4" />
        </Button>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Thu tiền nhanh</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Còn lại: <span className="font-bold text-red-700">{fmt(remaining)}</span>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Để sau</Button>
            <Button className="bg-emerald-800 hover:bg-emerald-900" onClick={onSubmit} disabled={busy}>
              {busy ? "Đang lưu..." : "Xác nhận thu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal open={info !== null} onOpenChange={(o) => !o && setInfo(null)} title={info ?? ""} />
    </>
  );
}
