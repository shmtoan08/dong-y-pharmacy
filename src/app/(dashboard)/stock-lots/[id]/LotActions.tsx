"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Scale, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { InfoModal } from "@/components/shared/InfoModal";
import { adjustLot, discardLot } from "@/features/inventory/actions";

export function LotActions({
  lotId,
  currentQty,
  baseUnit,
}: {
  lotId: string;
  currentQty: number;
  baseUnit: string;
}) {
  const router = useRouter();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [newQty, setNewQty] = useState(String(currentQty));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doAdjust = async () => {
    const qty = Number(newQty);
    if (isNaN(qty) || qty < 0) {
      setError("Số lượng không hợp lệ");
      return;
    }
    setBusy(true);
    const res = await adjustLot(lotId, qty, reason);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else {
      setAdjustOpen(false);
      router.refresh();
    }
  };

  const doDiscard = async () => {
    setBusy(true);
    const res = await discardLot(lotId, reason);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else {
      setDiscardOpen(false);
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => { setReason(""); setNewQty(String(currentQty)); setAdjustOpen(true); }}>
          <Scale className="mr-1 h-4 w-4" /> Điều chỉnh tồn
        </Button>
        <Button
          variant="outline" size="sm" className="text-red-600"
          onClick={() => { setReason(""); setDiscardOpen(true); }}
          disabled={currentQty <= 0}
        >
          <Trash2 className="mr-1 h-4 w-4" /> Hủy lô
        </Button>
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Điều chỉnh tồn kho lô</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Tồn hiện tại: <span className="font-semibold">{currentQty.toLocaleString("vi-VN")} {baseUnit}</span>
            </p>
            <div className="space-y-1.5">
              <Label>Tồn thực tế sau kiểm kê ({baseUnit})</Label>
              <Input
                type="number" min={0} step={0.01}
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lý do *</Label>
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Kiểm kê thừa 200g, hao hụt bay hơi..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)} disabled={busy}>
              Để sau
            </Button>
            <Button className="bg-emerald-800 hover:bg-emerald-900" onClick={doAdjust} disabled={busy}>
              {busy ? "Đang lưu..." : "Xác nhận điều chỉnh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy / Thanh lý lô?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Lô sẽ bị đưa tồn về 0 (thuốc ẩm mốc, hết hạn...). Thao tác ghi vào lịch sử.
            </p>
            <div className="space-y-1.5">
              <Label>Lý do *</Label>
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Thuốc bị mốc, hết hạn sử dụng..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardOpen(false)} disabled={busy}>
              Để sau
            </Button>
            <Button variant="destructive" onClick={doDiscard} disabled={busy}>
              {busy ? "Đang xử lý..." : "Xác nhận hủy lô"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal
        open={error !== null}
        onOpenChange={(o) => !o && setError(null)}
        title={error ?? ""}
      />
    </>
  );
}
