import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWorkingHours } from "@/features/schedules/service";

export const dynamic = "force-dynamic";

function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

// 1 slot = 1 bệnh nhân (theo bác sĩ đã chọn)

// GET /api/public/slots?date=2026-10-10&doctorId=... — kiểm tra slot nào còn chỗ
export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || "";
  const doctorId = searchParams.get("doctorId") || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
  }

  // Bac si bat buoc phai chon cu the (khong con "bat ky")
  if (!doctorId) {
    return NextResponse.json({ error: "Vui lòng chọn bác sĩ", slots: [], working: false }, { status: 400 });
  }

  // Kiem tra lich lam viec
  const wh = await getWorkingHours(doctorId, date);
  if (!wh.working) {
    return NextResponse.json({ slots: [], working: false, reason: wh.reason });
  }

  const { rows } = await db.query(
    `SELECT TO_CHAR(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') AS slot, COUNT(*) AS cnt
     FROM appointments
     WHERE DATE(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1
       AND status IN ('scheduled', 'confirmed', 'checked_in')
       AND practitioner_id = $2::uuid
     GROUP BY slot`,
    [date, doctorId]
  );

  const booked: Record<string, number> = {};
  for (const r of rows) booked[r.slot] = parseInt(r.cnt, 10);

  const slots = wh.slots.map((s) => ({
    time: s,
    available: (booked[s] || 0) < 1,
    bookedCount: booked[s] || 0,
  }));

  return NextResponse.json({ slots, working: true });
}
