import { NextResponse } from "next/server";
import { getVietnamTime } from "@/features/appointments/service";
import { getPublicClinicStatus } from "@/features/appointments/queries";

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

  const vn = getVietnamTime();
  const hour = vn.hour + vn.minute / 60;
  const day = vn.day;
  const todayStr = vn.dateStr;

  // Giờ làm việc: T2-T7, 8h-11h30 sáng, 14h-17h chiều (nghỉ trưa 11:30-14:00, nghỉ CN)
  const isSunday = day === 0;
  const isLunchBreak = hour >= 11.5 && hour < 14;
  const isOpen = !isSunday && ((hour >= 8 && hour < 11.5) || (hour >= 14 && hour < 17));

  const { currentNumber, waitingCount, totalIssued, nextNumber } = await getPublicClinicStatus(todayStr);

  // Quota: tối đa 40 số/ngày (cấu hình đơn giản)
  const QUOTA = 40;
  // Nghỉ trưa vẫn cho bốc số (chỉ hiển thị trạng thái), chỉ khóa khi ngoài giờ hành chính hoặc hết quota
  const isAcceptingBookings = !isSunday && hour >= 8 && hour < 17 && totalIssued < QUOTA;

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
