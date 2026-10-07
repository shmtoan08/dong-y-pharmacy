"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { InfoModal } from "@/components/shared/InfoModal";
import { confirmReceipt, cancelReceipt } from "@/features/inventory/actions";

export function ReceiptActions({ receiptId }: { receiptId: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doConfirm = async () => {
    setBusy(true);
    const res = await confirmReceipt(receiptId);
    setBusy(false);
    setConfirmOpen(false);
    if (res.error) {
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  const doCancel = async () => {
    setBusy(true);
    const res = await cancelReceipt(receiptId);
    setBusy(false);
    setCancelOpen(false);
    if (res.error) {
      setError(res.error);
    } else {
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-emerald-800 hover:bg-emerald-900"
          onClick={() => setConfirmOpen(true)}
        >
          <CheckCircle className="mr-1 h-4 w-4" /> Xác nhận nhập kho
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-600"
          onClick={() => setCancelOpen(true)}
        >
          <XCircle className="mr-1 h-4 w-4" /> Hủy phiếu
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận nhập kho?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            Hệ thống sẽ tạo lô hàng cho từng dòng và cộng tồn kho. Thao tác này không thể hoàn tác.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Để sau
            </Button>
            <Button
              className="bg-emerald-800 hover:bg-emerald-900"
              onClick={doConfirm}
              disabled={busy}
            >
              {busy ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy phiếu nhập?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            Phiếu nháp sẽ chuyển sang trạng thái đã hủy.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>
              Để sau
            </Button>
            <Button variant="destructive" onClick={doCancel} disabled={busy}>
              {busy ? "Đang xử lý..." : "Hủy phiếu"}
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
