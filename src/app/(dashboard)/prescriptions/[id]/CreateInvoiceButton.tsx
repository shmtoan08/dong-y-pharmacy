"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { InfoModal } from "@/components/shared/InfoModal";
import { Receipt } from "lucide-react";
import { createInvoice } from "@/features/finance/actions";

/** Nút lập hóa đơn từ đơn thuốc đã bốc */
export function CreateInvoiceButton({ prescriptionId }: { prescriptionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [discount, setDiscount] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const d = Number(discount);
    if (isNaN(d) || d < 0) {
      setError("Chiết khấu không hợp lệ.");
      return;
    }
    setBusy(true);
    const res = await createInvoice(prescriptionId, d);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else if (res.id) {
      setOpen(false);
      router.push(`/finance/invoices/${res.id}`);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setDiscount("0"); setOpen(true); }}>
        <Receipt className="mr-1 h-4 w-4" /> Lập hóa đơn
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Lập hóa đơn</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Đơn giá lấy từ danh mục vị thuốc. Có thể điều chỉnh sau khi lập.
            </p>
            <div className="space-y-1.5">
              <Label>Chiết khấu (đ)</Label>
              <Input
                type="number" min={0} value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Để sau</Button>
            <Button className="bg-emerald-800 hover:bg-emerald-900" onClick={onSubmit} disabled={busy}>
              {busy ? "Đang lập..." : "Lập hóa đơn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal open={error !== null} onOpenChange={(o) => !o && setError(null)} title={error ?? ""} />
    </>
  );
}
