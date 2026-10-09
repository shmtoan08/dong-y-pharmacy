export const dynamic = "force-dynamic";

import { getOnlineBookings } from "@/features/appointments/online";
import { OnlineBookingBoard } from "./OnlineBookingBoard";
import { OnlineWeekRibbon } from "@/components/shared/WeekRibbonWrapper";

export default async function OnlineBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; date?: string }>;
}) {
  const { tab, q, date } = await searchParams;
  const activeTab = (tab === "confirmed" || tab === "today" || tab === "all" ? tab : "pending") as
    "pending" | "confirmed" | "today" | "all";

  const bookings = await getOnlineBookings(activeTab, date, q);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Đặt lịch online</h1>
          <p className="text-sm text-stone-500">Xử lý lịch đặt từ website</p>
        </div>
        <a href="/appointments/queue"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm">
          → Mở hàng đợi hôm nay
        </a>
      </div>
      <OnlineWeekRibbon selectedDate={date || todayStr} />
      {date && (
        <p className="text-sm text-stone-500">
          Đang xem ngày {date} <a href="/appointments/online?tab=all" className="text-emerald-700 underline">✕ Xóa lọc ngày</a>
        </p>
      )}
      <OnlineBookingBoard initialBookings={bookings} activeTab={activeTab} initialSearch={q || ""} selectedDate={date || todayStr} />
    </div>
  );
}
