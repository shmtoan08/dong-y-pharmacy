import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

  const { rows } = await db.query(
    `SELECT TO_CHAR(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') AS slot, COUNT(*) AS cnt
     FROM appointments
     WHERE DATE(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1
       AND status IN ('scheduled', 'confirmed', 'checked_in')
       AND ($2::uuid IS NULL OR practitioner_id = $2::uuid OR practitioner_id IS NULL)
     GROUP BY slot`,
    [date, doctorId]
  );

  const booked: Record<string, number> = {};
  for (const r of rows) booked[r.slot] = parseInt(r.cnt, 10);

  const slots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "14:00", "14:30", "15:00", "15:30", "16:00",
  ].map((s) => ({
    time: s,
    available: (booked[s] || 0) < 1,
    bookedCount: booked[s] || 0,
  }));

  return NextResponse.json({ slots });
}
