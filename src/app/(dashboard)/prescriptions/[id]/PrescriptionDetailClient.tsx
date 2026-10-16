"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle2, XCircle, Pill } from "lucide-react";
import {
  confirmPrescription,
  completePrescription,
  cancelPrescription,
  type PrescriptionDetail,
} from "@/features/prescriptions/actions";
import { STATUS_LABEL, STATUS_STYLE } from "@/features/prescriptions/constants";
import { SafetyBanner } from "./SafetyBanner";
import { InfoModal } from "@/components/shared/InfoModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function PrescriptionDetailClient({
  prescription,
  canEdit,
  canDispense,
}: {
  prescription: PrescriptionDetail;
  canEdit: boolean;
  canDispense: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const run = async (fn: () => Promise<{ error?: string }>, okMsg: string) => {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (r.error) setError(r.error);
    else {
      setInfo(okMsg);
      // Reload để cập nhật trạng thái
      window.location.reload();
    }
  };

  const totalPerPack = prescription.items.reduce(
    (s, it) => s + Number(it.weight_per_pack),
    0,
  );

  const [safetyKey, setSafetyKey] = useState(0);

  return (
    <div className="space-y-4">
      {prescription.status === "draft" && (
        <SafetyBanner
          key={safetyKey}
          prescriptionId={prescription.id}
          canOverride={canEdit}
          onChanged={() => setSafetyKey((k) => k + 1)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 md:text-2xl">
            Đơn {prescription.prescription_code}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge className={STATUS_STYLE[prescription.status]}>
              {STATUS_LABEL[prescription.status]}
            </Badge>
            <span className="text-sm text-stone-500">
              {prescription.patient_name} · {prescription.patient_code}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {prescription.status === "confirmed" && (
            <Link href={`/prescriptions/${prescription.id}/print`} target="_blank">
              <Button variant="outline" size="sm">
                <Printer className="mr-1 h-4 w-4" /> In đơn
              </Button>
            </Link>
          )}
          {prescription.status === "draft" && canEdit && (
            <Button
              size="sm"
              disabled={busy}
              className="bg-emerald-800 hover:bg-emerald-900"
              onClick={() => run(() => confirmPrescription(prescription.id), "Đã chốt đơn")}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" /> Chốt đơn
            </Button>
          )}
          {prescription.status === "confirmed" && canDispense && (
            <Button
              size="sm"
              disabled={busy}
              className="bg-blue-700 hover:bg-blue-800"
              onClick={() => run(() => completePrescription(prescription.id), "Đã bốc thuốc")}
            >
              <Pill className="mr-1 h-4 w-4" /> Đã bốc thuốc
            </Button>
          )}
          {(prescription.status === "draft" || prescription.status === "confirmed") && canEdit && (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => { setCancelReason(""); setShowCancel(true); }}
            >
              <XCircle className="mr-1 h-4 w-4" /> Hủy đơn
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Chi tiết đơn ({prescription.num_of_packs} thang)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-stone-500">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Vị thuốc</th>
                  <th className="py-2 pr-2 text-right">Liều/thang (g)</th>
                  <th className="py-2 pr-2 text-right">Tổng (g)</th>
                  <th className="py-2">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {prescription.items.map((it, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-2 text-stone-500">{i + 1}</td>
                    <td className="py-2 pr-2 font-medium">{it.herb_name}</td>
                    <td className="py-2 pr-2 text-right">{Number(it.weight_per_pack).toFixed(1)}</td>
                    <td className="py-2 pr-2 text-right">
                      {(Number(it.weight_per_pack) * prescription.num_of_packs).toFixed(1)}
                    </td>
                    <td className="py-2 text-stone-500">{it.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={3} className="py-2 pr-2 text-right">Tổng cộng:</td>
                  <td className="py-2 pr-2 text-right">
                    {(totalPerPack * prescription.num_of_packs).toFixed(1)} g
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 space-y-1 text-sm text-stone-600">
            {prescription.template_name && (
              <p>
                <span className="font-medium">Bài mẫu:</span> {prescription.template_name}
                {prescription.template_version ? ` (v${prescription.template_version})` : ""}
              </p>
            )}
            {prescription.usage_instruction && (
              <p>
                <span className="font-medium">Cách dùng:</span> {prescription.usage_instruction}
              </p>
            )}
            {prescription.doctor_notes && (
              <p>
                <span className="font-medium">Ghi chú:</span> {prescription.doctor_notes}
              </p>
            )}
            <p>
              <span className="font-medium">Thầy thuốc:</span> {prescription.practitioner_name}
            </p>
          </div>
        </CardContent>
      </Card>

      <InfoModal
        open={info !== null}
        onOpenChange={(o) => !o && setInfo(null)}
        title={info ?? ""}
      />

      {/* Dialog nhập lý do hủy đơn */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hủy đơn {prescription.prescription_code}</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do hủy. Đơn đã hủy không thể khôi phục.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Lý do hủy đơn..."
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              Bỏ qua
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !cancelReason.trim()}
              onClick={async () => {
                setShowCancel(false);
                await run(() => cancelPrescription(prescription.id, cancelReason), "Đã hủy đơn");
              }}
            >
              Xác nhận hủy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
