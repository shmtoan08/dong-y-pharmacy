"use client";

import { useState, useEffect } from "react";
import { getAppointmentDensity, type DayDensity } from "@/features/appointments/density";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function densityColor(count: number, isSunday: boolean): { bg: string; label: string } {
  if (isSunday) return { bg: "bg-stone-100", label: "Nghỉ" };
  if (count > 15) return { bg: "bg-red-100 border-red-300", label: `${count} ca • Kín` };
  if (count >= 8) return { bg: "bg-amber-100 border-amber-300", label: `${count} ca` };
  return { bg: "bg-emerald-50 border-emerald-200", label: `${count} ca` };
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function WeekRibbon({
  selectedDate,
  onSelect,
  onlineOnly = false,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
  onlineOnly?: boolean;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [days, setDays] = useState<DayDensity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const start = new Date();
    start.setDate(start.getDate() + weekOffset * 7);
    const startStr = toISODate(start);
    getAppointmentDensity(startStr, 7, onlineOnly)
      .then(setDays)
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [weekOffset, onlineOnly]);

  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">📊 Mật độ lịch hẹn</p>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setWeekOffset((o) => o - 1)}>
            ‹ Tuần trước
          </Button>
          {weekOffset !== 0 && (
            <Button size="sm" variant="outline" onClick={() => setWeekOffset(0)}>
              Hôm nay
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setWeekOffset((o) => o + 1)}>
            Tuần sau ›
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="py-4 text-center text-sm text-stone-400">Đang tải...</p>
      ) : (
        <div className="grid grid-cols-7 gap-1.5 overflow-x-auto">
          {days.map((d) => {
            const dt = new Date(d.date + "T00:00:00");
            const isToday = d.date === toISODate(new Date());
            const isSelected = d.date === selectedDate;
            const { bg, label } = densityColor(d.count, d.isSunday);
            const dayName = isToday ? "Hôm nay" : WEEKDAYS[dt.getDay()];

            return (
              <button
                key={d.date}
                onClick={() => !d.isSunday && onSelect(d.date)}
                disabled={d.isSunday}
                className={`rounded-lg border-2 p-2 text-center transition ${
                  isSelected
                    ? "border-emerald-600 ring-2 ring-emerald-200"
                    : "border-transparent"
                } ${bg} ${d.isSunday ? "cursor-not-allowed opacity-60" : "hover:shadow"}`}
              >
                <p className="text-xs font-medium text-stone-600">{dayName}</p>
                <p className="text-xs text-stone-500">
                  {dt.getDate()}/{dt.getMonth() + 1}
                </p>
                <p className={`mt-1 text-xs font-bold ${
                  d.isSunday ? "text-stone-400"
                  : d.count > 15 ? "text-red-700"
                  : d.count >= 8 ? "text-amber-700"
                  : "text-emerald-700"
                }`}>
                  {d.isSunday ? "😴 Nghỉ" : label}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex gap-3 text-xs text-stone-500">
        <span>🟢 Dưới 8 ca: còn trống</span>
        <span>🟡 8-15 ca: sắp đầy</span>
        <span>🔴 Trên 15 ca: kín</span>
      </div>
    </div>
  );
}
