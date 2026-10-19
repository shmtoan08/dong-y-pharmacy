"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Plus, Minus } from "lucide-react";
import { createManualTransaction } from "@/features/finance/ledger";

export function ManualTxButton({ type }: { type: "income" | "expense" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [person, setPerson] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIncome = type === "income";

  const onSubmit = async () => {
    const v = Number(amount);
    if (isNaN(v) || v <= 0) {
      setError("Số tiền không hợp lệ.");
      return;
    }
    if (!reason.trim()) {
      setError("Chưa nhập lý do.");
      return;
    }
    setBusy(true);
    const res = await createManualTransaction({
      type, amount: v, reason, person, method, note,
    });
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setOpen(false);
      setAmount(""); setReason(""); setPerson(""); setNote("");
      router.refresh();
    }
  };

  return (
    <>
      <Button
        size="sm"
        className={isIncome ? "bg-emerald-800 hover:bg-emerald-900" : "bg-red-700 hover:bg-red-800"}
        onClick={() => setOpen(true)}
      >
        {isIncome ? <Plus className="mr-1 h-4 w-4" /> : <Minus className="mr-1 h-4 w-4" />}
        {isIncome ? "Phiếu thu" : "Phiếu chi"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isIncome ? "Lập phiếu thu" : "Lập phiếu chi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Số tiền (đ) *</Label>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="VD: 500000" />
            </div>
            <div className="space-y-1.5">
              <Label>Lý do *</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder={isIncome ? "VD: Thu thanh lý tài sản" : "VD: Mua văn phòng phẩm"} />
            </div>
            <div className="space-y-1.5">
              <Label>{isIncome ? "Người nộp" : "Người nhận"}</Label>
              <Input value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Họ tên" />
            </div>
            <div className="space-y-1.5">
              <Label>Quỹ</Label>
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Hủy</Button>
            <Button
              className={isIncome ? "bg-emerald-800 hover:bg-emerald-900" : "bg-red-700 hover:bg-red-800"}
              onClick={onSubmit} disabled={busy}
            >
              {busy ? "Đang lưu..." : `Lập phiếu ${isIncome ? "thu" : "chi"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal open={error !== null} onOpenChange={(o) => !o && setError(null)} title={error ?? ""} />
    </>
  );
}
