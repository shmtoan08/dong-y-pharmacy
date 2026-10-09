"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoModal } from "@/components/shared/InfoModal";
import { updateSettings, type ClinicSettings } from "@/features/admin/settings";

export function SettingsForm({ initial }: { initial: ClinicSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof ClinicSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setSaved(false);
  };

  const onSave = async () => {
    if (!form.clinic_name.trim()) {
      setError("Tên phòng khám không được để trống.");
      return;
    }
    setSaving(true);
    const res = await updateSettings(form);
    setSaving(false);
    if (res.error) setError(res.error);
    else {
      setSaved(true);
      router.refresh();
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🏥 Thông tin phòng khám</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tên phòng khám *</Label>
            <Input value={form.clinic_name} onChange={set("clinic_name")} />
          </div>
          <div className="space-y-1.5">
            <Label>Địa chỉ</Label>
            <Input value={form.clinic_address} onChange={set("clinic_address")}
              placeholder="VD: 123 Nguyễn Huệ, Q.1, TP.HCM" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input value={form.clinic_phone} onChange={set("clinic_phone")}
                placeholder="VD: 0901234567" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.clinic_email} onChange={set("clinic_email")}
                placeholder="VD: info@phongkham.vn" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🖨️ Mẫu in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Lời nhắn cuối đơn thuốc / phiếu thu</Label>
            <Textarea rows={2} value={form.prescription_footer} onChange={set("prescription_footer")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={saving}
          className="bg-emerald-800 hover:bg-emerald-900">
          {saving ? "Đang lưu..." : "💾 Lưu cài đặt"}
        </Button>
        {saved && <span className="text-sm text-emerald-700">✅ Đã lưu thành công</span>}
      </div>

      <InfoModal open={error !== null} onOpenChange={(o) => !o && setError(null)} title={error ?? ""} />
    </div>
  );
}
