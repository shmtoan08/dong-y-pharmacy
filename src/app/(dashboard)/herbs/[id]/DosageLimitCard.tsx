"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InfoModal } from "@/components/shared/InfoModal";
import {
  setDosageLimit,
  verifyDosageLimit,
} from "@/features/prescriptions/actions";

/** Quản lý giới hạn liều dùng của vị thuốc */
export function DosageLimitCard({
  herbId,
  baseUnit,
  initial,
  canManage,
}: {
  herbId: string;
  baseUnit: string;
  initial: { max_daily_dose: number | null; source: string | null; verified: boolean } | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const [maxDose, setMaxDose] = useState(initial?.max_daily_dose?.toString() ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    const v = maxDose.trim() === "" ? null : Number(maxDose);
    if (v !== null && (isNaN(v) || v <= 0)) {
      setError("Liều phải là số dương.");
      return;
    }
    setBusy(true);
    const res = await setDosageLimit(herbId, v, source);
    setBusy(false);
    if (res.error) setError(res.error);
    else router.refresh();
  };

  const onVerify = async () => {
    setBusy(true);
    const res = await verifyDosageLimit(herbId);
    setBusy(false);
    if (res.error) setError(res.error);
    else router.refresh();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Giới hạn liều dùng</CardTitle>
          {initial?.verified && (
            <Badge className="bg-emerald-100 text-emerald-800">Đã kiểm duyệt</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {canManage ? (
          <>
            <div className="space-y-1.5">
              <Label>Liều tối đa/ngày ({baseUnit})</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={maxDose}
                onChange={(e) => setMaxDose(e.target.value)}
                placeholder="VD: 12"
                className="max-w-48"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nguồn tham khảo</Label>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="VD: Dược điển..."
                className="max-w-md"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onSave} disabled={busy}>
                {busy ? "Đang lưu..." : "Lưu"}
              </Button>
              {initial && !initial.verified && initial.max_daily_dose && (
                <Button size="sm" variant="outline" onClick={onVerify} disabled={busy}>
                  Duyệt
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-stone-600">
            {initial?.max_daily_dose
              ? `Tối đa ${Number(initial.max_daily_dose).toLocaleString("vi-VN")} ${baseUnit}/ngày`
              : "Chưa thiết lập giới hạn liều."}
          </p>
        )}
        <p className="text-xs text-stone-500">
          Vượt ngưỡng đã kiểm duyệt sẽ hiện cảnh báo vàng khi kê đơn (không chặn).
        </p>
      </CardContent>

      <InfoModal
        open={error !== null}
        onOpenChange={(o) => !o && setError(null)}
        title={error ?? ""}
      />
    </Card>
  );
}
