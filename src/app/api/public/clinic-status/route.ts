import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lấy thời gian hiện tại theo giờ Việt Nam
function getVietnamTime(): { hour: number; minute: number; day: number; dateStr: string } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    hour: parseInt(parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    day: weekdays[parts.weekday] ?? 1,
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
  };
}


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

  const vn = getVietnamTime();
  const hour = vn.hour + vn.minute / 60;
  const day = vn.day;
  const todayStr = vn.dateStr;

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
     WHERE queue_date = $1 AND status IN ('scheduled', 'confirmed') AND queue_number IS NOT NULL`,
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
  // Nghỉ trưa vẫn cho bốc số (chỉ hiển thị trạng thái), chỉ khóa khi ngoài giờ hành chính hoặc hết quota
  const isAcceptingBookings = !isSunday && hour >= 8 && hour < 17 && totalIssued < QUOTA;

  // Số tiếp theo sẽ được gọi (số chờ nhỏ nhất)
  const { rows: next } = await db.query(
    `SELECT MIN(queue_number) AS next_num FROM appointments
     WHERE queue_date = $1 AND status IN ('scheduled', 'confirmed') AND queue_number IS NOT NULL`,
    [todayStr]
  );
  const nextNumber = next[0].next_num ? parseInt(next[0].next_num, 10) : null;

  // Ước tính chờ: mỗi lượt ~15 phút
  const estimatedWaitMinutes = waitingCount * 15;

  return NextResponse.json({
    isOpen,
    isLunchBreak,
    isSunday,
    isAcceptingBookings,
    currentNumber,
    nextNumber,
    waitingCount,
    totalIssued,
    quota: QUOTA,
    estimatedWaitMinutes,
    workingHours: "T2-T7: 08:00-11:30, 14:00-17:00 (Nghỉ trưa 11:30-14:00, Nghỉ Chủ nhật)",
  });
}
