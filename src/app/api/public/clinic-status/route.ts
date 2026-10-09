import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

// GET /api/public/clinic-status — trạng thái phòng khám hôm nay
export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const hour = now.getHours() + now.getMinutes() / 60;
  const day = now.getDay();
  const todayStr = now.toISOString().slice(0, 10);

  // Giờ làm việc: T2-T7, 8h-11h30 sáng, 14h-17h chiều (nghỉ trưa 11:30-14:00, nghỉ CN)
  const isSunday = day === 0;
  const isLunchBreak = hour >= 11.5 && hour < 14;
  const isOpen = !isSunday && ((hour >= 8 && hour < 11.5) || (hour >= 14 && hour < 17));

  // Số đang khám (trạng thái checked_in hôm nay, số nhỏ nhất)
  const { rows: current } = await db.query(
    `SELECT queue_number FROM appointments
     WHERE queue_date = $1 AND status = 'checked_in' AND queue_number IS NOT NULL
     ORDER BY queue_number LIMIT 1`,
    [todayStr]
  );
  const currentNumber = current.length > 0 ? current[0].queue_number : null;

  // Số người đang chờ (scheduled + có queue_number, chưa hủy)
  const { rows: waiting } = await db.query(
    `SELECT COUNT(*) AS cnt FROM appointments
     WHERE queue_date = $1 AND status = 'scheduled' AND queue_number IS NOT NULL`,
    [todayStr]
  );
  const waitingCount = parseInt(waiting[0].cnt, 10);

  // Tổng số đã cấp hôm nay
  const { rows: total } = await db.query(
    `SELECT COALESCE(MAX(queue_number), 0) AS max_num FROM appointments WHERE queue_date = $1`,
    [todayStr]
  );
  const totalIssued = parseInt(total[0].max_num, 10);

  // Quota: tối đa 40 số/ngày (cấu hình đơn giản)
  const QUOTA = 40;
  const isAcceptingBookings = isOpen && !isLunchBreak && totalIssued < QUOTA;

  // Ước tính chờ: mỗi lượt ~15 phút
  const estimatedWaitMinutes = waitingCount * 15;

  return NextResponse.json({
    isOpen,
    isLunchBreak,
    isSunday,
    isAcceptingBookings,
    currentNumber,
    waitingCount,
    totalIssued,
    quota: QUOTA,
    estimatedWaitMinutes,
    workingHours: "T2-T7: 08:00-11:30, 14:00-17:00 (Nghỉ trưa 11:30-14:00, Nghỉ Chủ nhật)",
  });
}
