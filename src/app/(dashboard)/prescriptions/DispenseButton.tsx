"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InfoModal } from "@/components/shared/InfoModal";
import { completePrescription } from "@/features/prescriptions/actions";

/**
 * Nút "Bốc thuốc" nổi bật cho đơn ở trạng thái Chờ bốc.
 * Bấm → xác nhận → gọi completePrescription → chuyển thành "Đã bốc thuốc".
 */
export function DispenseButton({
  prescriptionId,
  prescriptionCode,
}: {
  prescriptionId: string;
  prescriptionCode: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const onConfirm = async () => {
    setBusy(true);
    const res = await completePrescription(prescriptionId);
    setBusy(false);
    setConfirmOpen(false);
    if (res.error) {
      setInfo(res.error);
    } else {
      setInfo(`Đã bốc thuốc đơn ${prescriptionCode}`);
      router.refresh();
    }
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setConfirmOpen(true)}
        className="bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
      >
        <Scale className="mr-1 h-4 w-4" /> Bốc thuốc
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận bốc thuốc</DialogTitle>
            <DialogDescription>
              Xác nhận đã bốc xong đơn {prescriptionCode}? Đơn sẽ chuyển sang
              trạng thái "Đã bốc thuốc".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={busy}
            >
              Để sau
            </Button>
            <Button
              onClick={onConfirm}
              disabled={busy}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {busy ? "Đang xử lý..." : "Xác nhận đã bốc"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal
        open={info !== null}
        onOpenChange={(o) => !o && setInfo(null)}
        title={info ?? ""}
      />
    </>
  );
}
