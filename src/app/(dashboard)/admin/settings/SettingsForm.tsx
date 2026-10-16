"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoModal } from "@/components/shared/InfoModal";
import { Upload, X, RotateCcw } from "lucide-react";
import { updateSettings, resetSettings, type ClinicSettings } from "@/features/admin/settings";
import { cn } from "@/lib/utils";

export function SettingsForm({ initial }: { initial: ClinicSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof ClinicSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
    setDirty(true);
  };

  const setCheck = (k: keyof ClinicSettings) => (checked: boolean) => {
    setForm((f) => ({ ...f, [k]: checked ? "true" : "false" }));
    setSaved(false);
    setDirty(true);
  };

  const onLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      setError("Logo quá lớn (tối đa 200KB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, clinic_logo_url: reader.result as string }));
      setDirty(true);
      setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    setSaving(true);
    const res = await updateSettings(form);
    setSaving(false);
    if (res.error) setError(res.error);
    else {
      setSaved(true);
      setDirty(false);
      router.refresh();
    }
  };

  const onCancel = () => {
    setForm(initial);
    setDirty(false);
    setSaved(false);
  };

  const onReset = async () => {
    if (!confirm("Khôi phục tất cả cài đặt về mặc định?")) return;
    setSaving(true);
    const res = await resetSettings();
    setSaving(false);
    if (res.error) setError(res.error);
    else router.refresh();
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="clinic" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="clinic">🏥 Thông tin PK</TabsTrigger>
          <TabsTrigger value="print">🖨️ Mẫu in</TabsTrigger>
          <TabsTrigger value="stock">📦 Kho</TabsTrigger>
          <TabsTrigger value="payment">💳 Thanh toán</TabsTrigger>
          <TabsTrigger value="booking">📅 Đặt lịch</TabsTrigger>
        </TabsList>

        <TabsContent value="clinic" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Thông tin phòng khám</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Logo phòng khám</Label>
                <div className="flex items-center gap-3">
                  {form.clinic_logo_url ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.clinic_logo_url} alt="Logo" className="h-16 w-16 rounded-lg border object-contain" />
                      <button type="button"
                        onClick={() => { setForm((f) => ({ ...f, clinic_logo_url: "" })); setDirty(true); }}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed text-stone-400">
                      <Upload className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      <Upload className="mr-1 h-4 w-4" /> Tải logo
                    </Button>
                    <p className="mt-1 text-xs text-stone-500">PNG/JPG, tối đa 200KB</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogoSelect} />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tên phòng khám *</Label>
                <Input value={form.clinic_name} onChange={set("clinic_name")} />
              </div>
              <div className="space-y-1.5">
                <Label>Địa chỉ</Label>
                <Input value={form.clinic_address} onChange={set("clinic_address")} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Số điện thoại</Label>
                  <Input value={form.clinic_phone} onChange={set("clinic_phone")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={form.clinic_email} onChange={set("clinic_email")} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Số giấy phép</Label>
                  <Input value={form.clinic_license_number} onChange={set("clinic_license_number")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Người phụ trách chuyên môn</Label>
                  <Input value={form.clinic_manager} onChange={set("clinic_manager")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="print" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mẫu in & Đơn thuốc</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Khổ giấy in mặc định</Label>
                <div className="flex gap-2">
                  {(["A5", "A4", "K80"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, print_paper_size: s })); setDirty(true); }}
                      className={cn(
                        "rounded-lg border px-4 py-2 text-sm",
                        form.print_paper_size === s
                          ? "border-emerald-600 bg-emerald-50 font-medium"
                          : "border-stone-200 hover:bg-stone-50"
                      )}
                    >
                      {s === "K80" ? "Hóa đơn K80" : `Khổ ${s}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tùy chọn hiển thị</Label>
                <label className="flex min-h-10 cursor-pointer items-center gap-2.5">
                  <Checkbox checked={form.print_show_logo === "true"}
                    onCheckedChange={setCheck("print_show_logo")} className="h-5 w-5" />
                  <span className="text-sm">In logo phòng khám trên đầu phiếu</span>
                </label>
                <label className="flex min-h-10 cursor-pointer items-center gap-2.5">
                  <Checkbox checked={form.print_show_qr === "true"}
                    onCheckedChange={setCheck("print_show_qr")} className="h-5 w-5" />
                  <span className="text-sm">In mã QR thanh toán trên hóa đơn</span>
                </label>
              </div>
              <div className="space-y-1.5">
                <Label>Lời dặn sắc thuốc mặc định</Label>
                <Textarea rows={4} value={form.decoction_instructions}
                  onChange={set("decoction_instructions")}
                  placeholder="Hướng dẫn sắc thuốc tự động điền vào đơn thuốc..." />
                <p className="text-xs text-stone-500">Tự động điền khi bác sĩ kê đơn thuốc thang</p>
              </div>
              <div className="space-y-1.5">
                <Label>Lời nhắn chân trang in</Label>
                <Textarea rows={2} value={form.prescription_footer} onChange={set("prescription_footer")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kho & Cảnh báo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Cảnh báo cận date (ngày)</Label>
                  <Input type="number" min={1} max={365}
                    value={form.stock_expiry_warning_days}
                    onChange={set("stock_expiry_warning_days")} />
                  <p className="text-xs text-stone-500">VD: 30 = cảnh báo lô hàng hết hạn trong 30 ngày tới</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Ngưỡng tồn kho tối thiểu</Label>
                  <Input type="number" min={0}
                    value={form.stock_min_threshold}
                    onChange={set("stock_min_threshold")} />
                  <p className="text-xs text-stone-500">Cảnh báo khi tồn kho dưới ngưỡng này</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tài khoản ngân hàng (VietQR)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Ngân hàng</Label>
                <Input value={form.bank_name} onChange={set("bank_name")}
                  placeholder="VD: Vietcombank" />
              </div>
              <div className="space-y-1.5">
                <Label>Số tài khoản</Label>
                <Input value={form.bank_account_number} onChange={set("bank_account_number")}
                  placeholder="VD: 1234567890" />
              </div>
              <div className="space-y-1.5">
                <Label>Chủ tài khoản</Label>
                <Input value={form.bank_account_holder} onChange={set("bank_account_holder")}
                  placeholder="VD: NGUYEN VAN A" />
              </div>
              <p className="text-xs text-stone-500">
                Thông tin này dùng để tạo mã VietQR in trên hóa đơn cho bệnh nhân quét chuyển khoản.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="mt-4">
          <Card>
            <CardHeader><CardTitle>📅 Cài đặt đặt lịch</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5 max-w-xs">
                <Label>Giới hạn bốc số mỗi ngày</Label>
                <Input type="number" min={1} max={500}
                  value={form.max_queue_per_day}
                  onChange={set("max_queue_per_day")} />
                <p className="text-xs text-stone-500">Số bệnh nhân bốc số tối đa trong 1 ngày. Vượt quá sẽ báo &quot;hết số&quot;.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky action bar */}
      <div className={cn(
        "sticky bottom-0 z-10 -mx-4 border-t border-stone-200 bg-white p-3 md:mx-0 md:rounded-lg md:border",
        !dirty && "hidden"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReset} disabled={saving}>
              <RotateCcw className="mr-1 h-4 w-4" /> Mặc định
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
              Hủy
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-sm text-emerald-700">✅ Đã lưu</span>}
            <Button size="sm" onClick={onSave} disabled={saving}
              className="bg-emerald-800 hover:bg-emerald-900">
              {saving ? "Đang lưu..." : "💾 Lưu cài đặt"}
            </Button>
          </div>
        </div>
      </div>

      <InfoModal open={error !== null} onOpenChange={(o) => !o && setError(null)} title={error ?? ""} />
    </div>
  );
}
