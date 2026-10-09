import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function checkApiKey(req: Request): boolean {
  const key = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = process.env.BOOKING_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

// GET /api/public/appointments/lookup?phone=... — tra cứu lịch hẹn
export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get("phone") || "").replace(/\D/g, "");
  if (!/^0\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "SĐT không hợp lệ" }, { status: 400 });
  }

  const { rows } = await db.query(
    `SELECT a.appointment_code, a.scheduled_at, a.status, a.reject_reason,
            COALESCE(u.full_name, 'Bác sĩ bất kỳ') AS doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users u ON u.id = a.practitioner_id
     WHERE REPLACE(REPLACE(p.phone, ' ', ''), '.', '') = $1
       AND a.scheduled_at >= NOW() - INTERVAL '1 day'
       AND a.status IN ('scheduled', 'confirmed', 'checked_in', 'rejected')
     ORDER BY a.scheduled_at
     LIMIT 10`,
    [phone]
  );

  return NextResponse.json({
    appointments: rows.map((r: any) => ({
      code: r.appointment_code,
      scheduledAt: r.scheduled_at,
      status: r.status,
      rejectReason: r.reject_reason,
      doctorName: r.doctor_name,
    })),
  });
}
