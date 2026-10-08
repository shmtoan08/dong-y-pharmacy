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
import {
  completePrescription,
  previewDispense,
  type FefoPreviewItem,
} from "@/features/prescriptions/actions";

/**
 * Nút "Bốc thuốc" — dialog hiển thị preview FEFO (lô nào trừ bao nhiêu)
 * trước khi xác nhận trừ kho.
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
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<FefoPreviewItem[] | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const openDialog = async () => {
    setConfirmOpen(true);
    setLoading(true);
    setPreview(null);
    try {
      const p = await previewDispense(prescriptionId);
      setPreview(p);
    } finally {
      setLoading(false);
    }
  };

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

  const hasShortage = preview?.some((p) => p.shortage > 0.0001) ?? false;

  return (
    <>
      <Button
        size="sm"
        onClick={openDialog}
        className="bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
      >
        <Scale className="mr-1 h-4 w-4" /> Bốc thuốc
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận bốc thuốc</DialogTitle>
            <DialogDescription>
              Đơn {prescriptionCode} sẽ trừ kho theo lô cận date trước (FEFO).
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="py-6 text-center text-sm text-stone-500">Đang tính tồn kho...</p>
          ) : preview && preview.length > 0 ? (
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {preview.map((p, i) => (
                <div key={i} className="rounded-lg border border-stone-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{p.herb_name}</p>
                    {p.shortage > 0.0001 ? (
                      <span className="text-xs font-medium text-red-600">
                        Thiếu {p.shortage.toLocaleString("vi-VN")}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-700">
                        Đủ {p.needed.toLocaleString("vi-VN")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-xs text-stone-500">
                    {p.lots.map((l, j) => (
                      <p key={j} className="flex justify-between">
                        <span className="font-mono">{l.lot_code}</span>
                        <span>
                          −{l.take.toLocaleString("vi-VN")}
                          {l.expiry_date &&
                            ` (HSD ${new Date(l.expiry_date).toLocaleDateString("vi-VN")})`}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-stone-500">
              Đơn không có vị thuốc liên kết kho.
            </p>
          )}

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
              disabled={busy || loading || hasShortage}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {busy ? "Đang xử lý..." : "Xác nhận bốc thuốc"}
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
