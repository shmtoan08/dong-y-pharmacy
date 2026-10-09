"use client";

import type { OnlineBooking } from "@/features/appointments/online";

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "14:00", "14:30", "15:00", "15:30", "16:00",
];

const STATUS_STYLE: Record<string, string> = {
  confirmed: "bg-emerald-50 border-emerald-200",
  scheduled: "bg-amber-50 border-amber-200",
  checked_in: "bg-blue-50 border-blue-200",
  completed: "bg-stone-100 border-stone-200",
  cancelled: "bg-red-50 border-red-200",
  rejected: "bg-red-50 border-red-200",
  no_show: "bg-stone-100 border-stone-300",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Đã xác nhận",
  scheduled: "Chờ xác nhận",
  checked_in: "Đã tiếp đón",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  rejected: "Từ chối",
  no_show: "Không đến",
};

function slotOf(iso: string): string {
  const d = new Date(iso);
  // Chuyen ve gio VN
  const vn = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  return `${String(vn.getHours()).padStart(2, "0")}:${String(vn.getMinutes()).padStart(2, "0")}`;
}

export function BookingTimeline({ bookings }: { bookings: OnlineBooking[] }) {
  // Chi lich dat truoc (khong phai boc so)
  const advance = bookings.filter((b) => b.booking_type !== "queue");

  const bySlot = new Map<string, OnlineBooking[]>();
  for (const b of advance) {
    const s = slotOf(b.scheduled_at);
    if (!bySlot.has(s)) bySlot.set(s, []);
    bySlot.get(s)!.push(b);
  }

  // Slot co lich nhung khong nam trong TIME_SLOTS (dat le) -> them vao cuoi
  const extraSlots = [...bySlot.keys()].filter((s) => !TIME_SLOTS.includes(s)).sort();
  const allSlots = [...TIME_SLOTS, ...extraSlots];

  if (advance.length === 0) {
    return <p className="py-8 text-center text-sm text-stone-400">Không có lịch đặt trước</p>;
  }

  return (
    <div className="space-y-1">
      {allSlots.map((slot) => {
        const list = bySlot.get(slot) || [];
        const isEmpty = list.length === 0;
        return (
          <div key={slot} className="flex gap-3">
            {/* Cot gio */}
            <div className="w-14 shrink-0 pt-2 text-right">
              <span className={`text-sm font-bold ${isEmpty ? "text-stone-300" : "text-stone-700"}`}>
                {slot}
              </span>
            </div>
            {/* Duong ke doc */}
            <div className="flex flex-col items-center">
              <div className={`h-3 w-3 rounded-full border-2 ${
                isEmpty ? "border-stone-200 bg-white" : "border-emerald-500 bg-emerald-500"
              }`} />
              <div className="w-0.5 flex-1 bg-stone-200" />
            </div>
            {/* Lich trong slot */}
            <div className="flex-1 pb-3">
              {isEmpty ? (
                <p className="rounded-lg border border-dashed border-stone-200 px-3 py-2 text-xs text-stone-300">
                  Trống
                </p>
              ) : (
                <div className="space-y-1.5">
                  {list.map((b) => (
                    <div key={b.id} className={`rounded-lg border px-3 py-2 ${STATUS_STYLE[b.status] || "bg-white"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {b.patient_name}
                          <span className="ml-2 text-xs font-normal text-stone-500">{b.appointment_code}</span>
                        </p>
                        <span className="shrink-0 text-xs text-stone-500">
                          {STATUS_LABEL[b.status] || b.status}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        {b.phone}
                        {b.doctor_name && ` • BS: ${b.doctor_name}`}
                        {b.birth_year && ` • NS: ${b.birth_year}`}
                      </p>
                      {b.symptom && (
                        <p className="truncate text-xs text-stone-400" title={b.symptom}>💬 {b.symptom}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
