"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, OctagonX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InfoModal } from "@/components/shared/InfoModal";
import {
  checkPrescriptionSafety,
  overrideInteraction,
  type SafetyResult,
} from "@/features/prescriptions/actions";

/**
 * Banner cảnh báo an toàn lâm sàng trên chi tiết đơn thuốc.
 * Hiển thị tương kỵ (đỏ/vàng) + cảnh báo liều real-time.
 */
export function SafetyBanner({
  prescriptionId,
  canOverride,
  onChanged,
}: {
  prescriptionId: string;
  canOverride: boolean;
  onChanged?: () => void;
}) {
  const [safety, setSafety] = useState<SafetyResult | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    checkPrescriptionSafety(prescriptionId).then((s) => {
      if (!ignore) {
        setSafety(s);
      }
    });
    return () => {
      ignore = true;
    };
  }, [prescriptionId]);

  const doOverride = async () => {
    if (!overrideTarget) return;
    setBusy(true);
    const res = await overrideInteraction(prescriptionId, overrideTarget, reason);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    } else {
      setOverrideTarget(null);
      setReason("");
      const updated = await checkPrescriptionSafety(prescriptionId);
      setSafety(updated);
      onChanged?.();
    }
  };

  if (!safety) return null;
  const { interactions, dosageWarnings } = safety;
  if (interactions.length === 0 && dosageWarnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {interactions.map((ix) => (
        <div
          key={ix.interaction_id}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm ${
            ix.severity === "cam_ky"
              ? "border-red-300 bg-red-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-2">
            {ix.severity === "cam_ky" ? (
              <OctagonX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            )}
            <div>
              <p className="font-medium">
                {ix.severity === "cam_ky" ? "Cấm kỵ" : "Cẩn trọng"}: {ix.herb_a_name} ⛔ {ix.herb_b_name}
              </p>
              {ix.description && <p className="text-xs text-stone-600">{ix.description}</p>}
              {ix.overridden && (
                <Badge className="mt-1 bg-stone-200 text-stone-700">Đã override</Badge>
              )}
            </div>
          </div>
          {ix.severity === "cam_ky" && !ix.overridden && canOverride && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
              onClick={() => { setReason(""); setOverrideTarget(ix.interaction_id); }}
            >
              Duyệt override
            </Button>
          )}
        </div>
      ))}

      {dosageWarnings.map((w, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p>
            <span className="font-medium">{w.herb_name}</span> vượt liều tham khảo:{" "}
            {w.daily_dose.toLocaleString("vi-VN")}g/ngày (tối đa {w.max_daily_dose.toLocaleString("vi-VN")}g/ngày)
          </p>
        </div>
      ))}

      <Dialog open={overrideTarget !== null} onOpenChange={(o) => !o && setOverrideTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override tương kỵ cấm kỵ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Bạn chịu trách nhiệm về quyết định này. Lý do sẽ được ghi vào lịch sử.
            </p>
            <div className="space-y-1.5">
              <Label>Lý do override *</Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Bệnh nhân đã dùng phối hợp này 2 tuần không có phản ứng phụ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideTarget(null)} disabled={busy}>
              Để sau
            </Button>
            <Button
              className="bg-red-700 hover:bg-red-800"
              onClick={doOverride}
              disabled={busy || !reason.trim()}
            >
              {busy ? "Đang lưu..." : "Xác nhận override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InfoModal
        open={error !== null}
        onOpenChange={(o) => !o && setError(null)}
        title={error ?? ""}
      />
    </div>
  );
}
