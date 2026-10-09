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

  // Lay danh sach BS can xet
  let doctorIds: string[] = [];
  if (doctorId) {
    doctorIds = [doctorId];
  } else {
    // "Bac si bat ky": tat ca BS dang active
    const { rows: docs } = await db.query(
      `SELECT id FROM users WHERE role = 'practitioner' AND is_active = true`
    );
    doctorIds = docs.map((r) => r.id);
  }

  if (doctorIds.length === 0) {
    return NextResponse.json({ slots: [], working: false, reason: "Chưa có bác sĩ" });
  }

  // Kiem tra lich lam viec tung BS, gom slots
  const allSlots = new Set<string>();
  const workingDoctors: string[] = [];
  for (const did of doctorIds) {
    const wh = await getWorkingHours(did, date);
    if (wh.working) {
      workingDoctors.push(did);
      wh.slots.forEach((s) => allSlots.add(s));
    }
  }

  if (workingDoctors.length === 0) {
    return NextResponse.json({ slots: [], working: false, reason: "Bác sĩ không làm việc ngày này" });
  }

  // Dem slot da dat (theo tung BS neu chon cu the, hoac tong hop neu bat ky)
  const { rows } = await db.query(
    `SELECT TO_CHAR(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') AS slot,
            practitioner_id, COUNT(*) AS cnt
     FROM appointments
     WHERE DATE(scheduled_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1
       AND status IN ('scheduled', 'confirmed', 'checked_in')
       AND practitioner_id = ANY($2::uuid[])
     GROUP BY slot, practitioner_id`,
    [date, workingDoctors]
  );

  // Voi "bat ky": slot available neu con it nhat 1 BS trong
  // Voi cu the: slot available neu BS do trong
  const slots = [...allSlots].sort().map((s) => {
    let available = false;
    let bookedCount = 0;
    for (const did of workingDoctors) {
      const r = rows.find((x) => x.slot === s && x.practitioner_id === did);
      const cnt = r ? parseInt(r.cnt, 10) : 0;
      bookedCount += cnt;
      if (cnt < 1) available = true; // con BS trong
      if (doctorId && did === doctorId) {
        available = cnt < 1;
        bookedCount = cnt;
        break;
      }
    }
    return { time: s, available, bookedCount };
  });

  return NextResponse.json({ slots, working: true });
}
