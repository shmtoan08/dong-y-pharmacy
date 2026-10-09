export const dynamic = "force-dynamic";

import { getOnlineBookings } from "@/features/appointments/online";
import { OnlineBookingBoard } from "./OnlineBookingBoard";

export default async function OnlineBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const activeTab = (tab === "confirmed" || tab === "today" || tab === "all" ? tab : "pending") as
    "pending" | "confirmed" | "today" | "all";

  const bookings = await getOnlineBookings(activeTab, undefined, q);

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
      <OnlineBookingBoard initialBookings={bookings} activeTab={activeTab} initialSearch={q || ""} />
    </div>
  );
}
