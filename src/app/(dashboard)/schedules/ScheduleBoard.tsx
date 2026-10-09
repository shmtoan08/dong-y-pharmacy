"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMyWeeklySchedule, updateMyWeeklySchedule, getMyDayOffs,
  requestDayOff, cancelDayOff,
  type WeeklyScheduleRow, type DayOffRow,
} from "@/features/schedules/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoModal } from "@/components/shared/InfoModal";

const DAY_NAMES = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
// Sap xep T2 -> CN
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function ScheduleBoard({
  initialWeekly, initialDayOffs, density,
}: {
  initialWeekly: WeeklyScheduleRow[];
  initialDayOffs: DayOffRow[];
  density: Record<number, number>;
}) {
  const router = useRouter();
  const [weekly, setWeekly] = useState<WeeklyScheduleRow[]>(() => {
    const map = new Map(initialWeekly.map((r) => [r.day_of_week, r]));
    return DAY_ORDER.map((dow) => map.get(dow) || {
      day_of_week: dow,
      is_working: dow !== 0,
      morning_start: dow !== 0 ? "08:00" : null,
      morning_end: dow !== 0 ? "11:30" : null,
      afternoon_start: dow !== 0 ? "14:00" : null,
      afternoon_end: dow !== 0 ? "17:00" : null,
      evening_start: null,
      evening_end: null,
    });
  });
  const [dayOffs, setDayOffs] = useState(initialDayOffs);
  const [offDate, setOffDate] = useState("");
  const [offReason, setOffReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<{ title: string; desc: string } | null>(null);
  const [tab, setTab] = useState<"weekly" | "dayoff">("weekly");

  function updateRow(dow: number, field: keyof WeeklyScheduleRow, value: any) {
    setWeekly((prev) => prev.map((r) => r.day_of_week === dow ? { ...r, [field]: value } : r));
  }

  async function handleSaveWeekly() {
    setSaving(true);
    const r = await updateMyWeeklySchedule(weekly);
    setSaving(false);
    if (r.error) setInfo({ title: "Lỗi", desc: r.error });
    else {
      setInfo({ title: "Thành công", desc: "Đã lưu lịch tuần" });
      router.refresh();
    }
  }

  async function handleRequestDayOff() {
    if (!offDate) {
      setInfo({ title: "Thiếu thông tin", desc: "Vui lòng chọn ngày nghỉ" });
      return;
    }
    setSaving(true);
    const r = await requestDayOff(offDate, offReason);
    setSaving(false);
    if (r.error) {
      setInfo({ title: "Không thể đăng ký nghỉ", desc: r.error });
    } else {
      setInfo({ title: "Thành công", desc: `Đã đăng ký nghỉ ngày ${offDate}` });
      setOffDate("");
      setOffReason("");
      const updated = await getMyDayOffs();
      setDayOffs(updated);
      router.refresh();
    }
  }

  async function handleCancelDayOff(id: string) {
    if (!confirm("Hủy đăng ký nghỉ này?")) return;
    const r = await cancelDayOff(id);
    if (r.error) setInfo({ title: "Lỗi", desc: r.error });
    else {
      const updated = await getMyDayOffs();
      setDayOffs(updated);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex w-fit gap-1 rounded-lg bg-stone-100 p-1">
        <button onClick={() => setTab("weekly")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === "weekly" ? "bg-white shadow" : "text-stone-500"}`}>
          📅 Lịch tuần
        </button>
        <button onClick={() => setTab("dayoff")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === "dayoff" ? "bg-white shadow" : "text-stone-500"}`}>
          🏖️ Đăng ký nghỉ ({dayOffs.length})
        </button>
      </div>

      {tab === "weekly" && (
        <Card>
          <CardHeader><CardTitle>Lịch làm việc hàng tuần</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {weekly.map((r) => (
              <div key={r.day_of_week} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <label className="flex w-28 items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={r.is_working}
                    onChange={(e) => updateRow(r.day_of_week, "is_working", e.target.checked)}
                    className="h-4 w-4" />
                  <span>
                    {DAY_NAMES[r.day_of_week]}
                    {(density[r.day_of_week] || 0) > 0 && (
                      <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        {density[r.day_of_week]} ca
                      </span>
                    )}
                  </span>
                </label>
                {r.is_working ? (
                  <div className="w-full space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-stone-500">☀️ Sáng:</span>
                      <Input type="time" value={r.morning_start || ""} className="w-32"
                        onChange={(e) => updateRow(r.day_of_week, "morning_start", e.target.value || null)} />
                      <span>–</span>
                      <Input type="time" value={r.morning_end || ""} className="w-32"
                        onChange={(e) => updateRow(r.day_of_week, "morning_end", e.target.value || null)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-stone-500">🌤️ Chiều:</span>
                      <Input type="time" value={r.afternoon_start || ""} className="w-32"
                        onChange={(e) => updateRow(r.day_of_week, "afternoon_start", e.target.value || null)} />
                      <span>–</span>
                      <Input type="time" value={r.afternoon_end || ""} className="w-32"
                        onChange={(e) => updateRow(r.day_of_week, "afternoon_end", e.target.value || null)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-stone-500">🌙 Tối:</span>
                      <Input type="time" value={(r as any).evening_start || ""} className="w-32"
                        onChange={(e) => updateRow(r.day_of_week, "evening_start" as any, e.target.value || null)} />
                      <span>–</span>
                      <Input type="time" value={(r as any).evening_end || ""} className="w-32"
                        onChange={(e) => updateRow(r.day_of_week, "evening_end" as any, e.target.value || null)} />
                      <span className="text-xs text-stone-400">(để trống nếu không làm)</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-stone-400">Nghỉ</span>
                )}
              </div>
            ))}
            <Button onClick={handleSaveWeekly} disabled={saving}>
              {saving ? "Đang lưu..." : "💾 Lưu lịch tuần"}
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "dayoff" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Đăng ký ngày nghỉ</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input type="date" value={offDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setOffDate(e.target.value)} className="w-44" />
                <Input value={offReason} onChange={(e) => setOffReason(e.target.value)}
                  placeholder="Lý do nghỉ (VD: đi công tác)" className="flex-1 min-w-52" />
                <Button onClick={handleRequestDayOff} disabled={saving}>
                  Đăng ký nghỉ
                </Button>
              </div>
              <p className="text-xs text-stone-500">
                ⚠️ Nếu ngày đó còn lịch đặt, hệ thống sẽ chặn — bạn cần dời hết lịch trước khi đăng ký nghỉ.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ngày nghỉ đã đăng ký</CardTitle></CardHeader>
            <CardContent>
              {dayOffs.length === 0 ? (
                <p className="py-4 text-center text-sm text-stone-400">Chưa có ngày nghỉ nào</p>
              ) : (
                <div className="space-y-2">
                  {dayOffs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">📅 {d.off_date}</p>
                        {d.reason && <p className="text-xs text-stone-500">{d.reason}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleCancelDayOff(d.id)}>
                        Hủy
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {info && <InfoModal open={!!info} onOpenChange={() => setInfo(null)} title={info.title} description={info.desc} />}
    </div>
  );
}
